import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { useToast } from '../hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { Utensils } from 'lucide-react';

// Login form schema with comprehensive validation
const loginSchema = z.object({
  email: z.string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, { message: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormData) => {
    try {
      const user = await login(values);

      toast({
        title: 'Login successful',
        description: `Welcome back${user.email ? `, ${user.email}` : ''}!`,
      });

      // Clear form
      form.reset();

      // Mobile-specific navigation handling
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 1023;

      if (isMobile) {
        // Force mobile navigation to appear after login
        setTimeout(() => {
          document.body.classList.add('mobile-nav-active');

          // Apply mobile navigation styles immediately
          const existingStyle = document.getElementById('post-login-mobile-styles');
          if (existingStyle) {
            existingStyle.remove();
          }

          const style = document.createElement('style');
          style.id = 'post-login-mobile-styles';
          style.innerHTML = `
            @media (max-width: 1023px) {
              .mobile-nav, [class*="mobile-nav"] {
                display: flex !important;
                visibility: visible !important;
                opacity: 1 !important;
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 50 !important;
                background: white !important;
              }
              main {
                padding-bottom: 80px !important;
                margin-bottom: 72px !important;
              }
            }
          `;
          document.head.appendChild(style);
        }, 100);
      }

      // Navigate based on role with timeout for mobile
      const navigateToRole = () => {
        switch (user.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'trainer':
            navigate('/trainer');
            break;
          case 'customer':
            navigate('/customer');
            break;
          default:
            navigate('/');
        }
      };

      // For mobile, add a slight delay to ensure proper navigation setup
      if (isMobile) {
        setTimeout(navigateToRole, 200);
      } else {
        navigateToRole();
      }

    } catch (error: any) {
      console.error('Login error:', error);

      // Clear password field on error
      form.setValue('password', '');

      toast({
        title: 'Login failed',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Utensils className="w-8 h-8 text-purple-600 mr-2" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
              EvoFitMeals
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">
            Your personalized nutrition companion
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-center text-gray-900">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base text-gray-600">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 sm:px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium text-gray-700">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="your@email.com"
                          type="email"
                          autoComplete="email"
                          className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          style={{
                            fontSize: '16px',
                            minHeight: '44px',
                            padding: '12px 16px'
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium text-gray-700">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          style={{
                            fontSize: '16px',
                            minHeight: '44px',
                            padding: '12px 16px'
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 rounded-lg transition-all duration-200"
                  style={{
                    minHeight: '48px',
                    fontSize: '16px',
                    touchAction: 'manipulation'
                  }}
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Logging in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </Form>

          </CardContent>

          <CardFooter className="flex flex-col items-center space-y-3 sm:space-y-4 px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  style={{
                    minHeight: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 4px',
                    touchAction: 'manipulation'
                  }}
                >
                  Create one here
                </Link>
              </p>
            </div>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
                style={{
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '8px 4px',
                  touchAction: 'manipulation'
                }}
              >
                Forgot your password?
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{' '}
            <a
              href="/terms"
              className="text-blue-600 hover:underline"
              style={{
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 4px',
                touchAction: 'manipulation'
              }}
            >
              Terms
            </a> and{' '}
            <a
              href="/privacy"
              className="text-blue-600 hover:underline"
              style={{
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 4px',
                touchAction: 'manipulation'
              }}
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;