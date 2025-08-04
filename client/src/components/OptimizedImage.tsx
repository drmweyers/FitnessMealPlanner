import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  skeleton?: boolean;
  skeletonClassName?: string;
  lazy?: boolean;
  quality?: number;
  sizes?: string;
}

function OptimizedImage({
  src,
  alt,
  fallbackSrc = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
  skeleton = true,
  skeletonClassName,
  lazy = true,
  className,
  onLoad,
  onError,
  quality = 80,
  sizes,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [lazy, isInView]);

  // Generate optimized src URLs
  const generateOptimizedSrc = useCallback((originalSrc: string, width?: number) => {
    // For Unsplash URLs, add optimization parameters
    if (originalSrc.includes('unsplash.com')) {
      const url = new URL(originalSrc);
      if (width) url.searchParams.set('w', width.toString());
      url.searchParams.set('q', quality.toString());
      url.searchParams.set('fm', 'webp');
      url.searchParams.set('fit', 'crop');
      return url.toString();
    }
    
    // For local images, return as-is (could add server-side optimization here)
    return originalSrc;
  }, [quality]);

  // Handle image load
  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(e);
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    
    // Try fallback if we haven't already
    if (currentSrc !== fallbackSrc && !hasError) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    setHasError(true);
    onError?.(e);
  }, [currentSrc, fallbackSrc, hasError, onError]);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback(() => {
    if (!sizes || currentSrc.includes('/api/placeholder/')) return undefined;
    
    const widths = [400, 800, 1200, 1600];
    return widths
      .map(width => `${generateOptimizedSrc(currentSrc, width)} ${width}w`)
      .join(', ');
  }, [currentSrc, generateOptimizedSrc, sizes]);

  // Show skeleton while loading or before lazy load
  if ((isLoading && skeleton) || !isInView) {
    return (
      <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
        <Skeleton className={cn('w-full h-full', skeletonClassName)} />
        {!isInView && lazy && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={isInView ? generateOptimizedSrc(currentSrc) : undefined}
      srcSet={isInView ? generateSrcSet() : undefined}
      sizes={sizes}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        isLoading && 'opacity-0',
        !isLoading && 'opacity-100',
        className
      )}
      onLoad={handleLoad}
      onError={handleError}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      {...props}
    />
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(OptimizedImage, (prevProps, nextProps) => {
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.className === nextProps.className &&
    prevProps.lazy === nextProps.lazy &&
    prevProps.skeleton === nextProps.skeleton
  );
});

// Hook for preloading images
export function useImagePreloader() {
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(async (srcs: string[]): Promise<void> => {
    try {
      await Promise.all(srcs.map(preloadImage));
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  }, [preloadImage]);

  return { preloadImage, preloadImages };
}