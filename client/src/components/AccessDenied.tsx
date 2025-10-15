import React from 'react';
import { useLocation } from 'wouter';
import { Shield, Home } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
}

/**
 * AccessDenied Component
 *
 * Displays when a user attempts to access a route they don't have permission for.
 * Provides clear feedback about the permission denial and navigation options.
 */
const AccessDenied: React.FC<AccessDeniedProps> = ({
  message = "You don't have permission to access this page."
}) => {
  const [, navigate] = useLocation();

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <Shield className="h-12 w-12 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-1">
            {message}
          </p>

          <p className="text-sm text-gray-500 mb-6">
            If you believe this is an error, please contact your administrator.
          </p>

          {/* 403 Error Code (for test detection) */}
          <div className="text-xs text-gray-400 mb-6">
            Error Code: 403 Forbidden
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoHome}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </button>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>

          {/* Additional Help */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-xs text-gray-600">
              <strong>Need access?</strong> Contact your system administrator to request the appropriate permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
