import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadImageOptions {
  threshold?: number;
  rootMargin?: string;
  placeholder?: string;
}

export const useLazyLoadImage = (
  src: string,
  options: UseLazyLoadImageOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    placeholder = '/api/placeholder/400/250',
  } = options;

  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!imageRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the actual image
            const img = new Image();
            img.src = src;
            
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            
            img.onerror = () => {
              setIsError(true);
              setIsLoaded(true);
            };
            
            observer.unobserve(imageRef);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imageRef);

    return () => {
      if (imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, src, threshold, rootMargin]);

  return {
    ref: setImageRef,
    src: imageSrc,
    isLoaded,
    isError,
  };
};