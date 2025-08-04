import React, { Suspense, lazy } from 'react';
import { Button } from './ui/button';
import { Download, Loader2 } from 'lucide-react';

// Lazy load PDF export components to reduce initial bundle size
const PDFExportButton = lazy(() => import('./PDFExportButton'));
const EvoFitPDFExport = lazy(() => import('./EvoFitPDFExport'));

interface LazyPDFExportProps {
  variant?: 'button' | 'evofit';
  [key: string]: any; // Allow passing through other props
}

// Loading component for PDF export
const PDFExportLoading = () => (
  <Button disabled className="gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    Loading PDF Export...
  </Button>
);

// Error boundary for PDF export
class PDFExportErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PDF Export Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <Button variant="outline" disabled className="gap-2">
          <Download className="h-4 w-4" />
          Export Unavailable
        </Button>
      );
    }

    return this.props.children;
  }
}

export default function LazyPDFExport({ variant = 'button', ...props }: LazyPDFExportProps) {
  const Component = variant === 'evofit' ? EvoFitPDFExport : PDFExportButton;

  return (
    <PDFExportErrorBoundary>
      <Suspense fallback={<PDFExportLoading />}>
        <Component {...props} />
      </Suspense>
    </PDFExportErrorBoundary>
  );
}