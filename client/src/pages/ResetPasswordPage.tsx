import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { useToast } from '../hooks/use-toast';
import { Link, useRoute, Redirect } from 'wouter';

const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const ResetPasswordPage = () => {
  const { toast } = useToast();
  const [match, params] = useRoute("/reset-password/:token");
  const token = params?.token;
  const [redirect, setRedirect] = React.useState(false);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
    if (!token) {
      toast({ title: 'Error', description: 'No reset token found.', variant: 'destructive' });
      return;
    }
    try {
      const response = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      toast({
        title: 'Password Reset Successful',
        description: 'You can now log in with your new password.',
      });
      setRedirect(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (redirect) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand Section */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Evofit Meal
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Your personalized nutrition companion
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-center text-gray-900">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base text-gray-600">
              Enter your new password to complete the reset
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium text-gray-700">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          autoComplete="new-password"
                          className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm sm:text-base font-medium text-gray-700">
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          autoComplete="new-password"
                          className="h-11 sm:h-12 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors"
                >
                  Reset Password
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-center px-4 sm:px-6 pb-4 sm:pb-6">
            <Link 
              href="/login" 
              className="text-sm sm:text-base text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
            >
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage; 