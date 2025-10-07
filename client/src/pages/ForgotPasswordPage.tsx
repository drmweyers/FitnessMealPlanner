import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { useToast } from '../hooks/use-toast';
import { Link } from 'wouter';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      const response = await fetch('/api/password/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }

      toast({
        title: 'Check your email',
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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
              Forgot Password
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base text-gray-600">
              Enter your email to receive a password reset link
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
                  Send Reset Link
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

export default ForgotPasswordPage; 