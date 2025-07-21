import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import styles from '@/styles/icons.module.css';

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string(),
  role: z.enum(['customer', 'trainer']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const { register } = useAuth();
  const { toast } = useToast();
  const [, redirect] = useLocation();
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
    },
  });

  const onSubmit = async (values: RegisterFormData) => {
    try {
      // Only send the required fields to the register function
      const { confirmPassword, ...registerData } = values;
      const user = await register(registerData);

      if (!user || !user.role) {
        throw new Error('Invalid user data received');
      }
      
      toast({
        title: 'Registration successful',
        description: 'Welcome to FitMeal Pro!',
      });

      // Navigate based on role
      switch (user.role) {
        case 'customer':
          redirect('/my-meal-plans');
          break;
        case 'trainer':
          redirect('/');
          break;
        default:
          console.warn('Unknown user role:', user.role);
          redirect('/');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error.message || 'An error occurred during registration',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-center">
        {/* Left side - Welcome content */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:flex flex-col space-y-4 p-4 sm:p-6"
        >
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
            Welcome to FitMeal Pro
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Join our community of health enthusiasts and fitness professionals.
          </p>
          
          <div className="space-y-4 sm:space-y-6 mt-6 sm:mt-8">
            <div className="flex items-start space-x-3">
              <div className={styles.iconContainer}>
                <i className={`fas fa-utensils ${styles.iconPrimary}`}></i>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Personalized Meal Plans</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Get customized meal plans tailored to your goals
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className={styles.iconContainer}>
                <i className={`fas fa-dumbbell ${styles.iconPrimary}`}></i>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Expert Guidance</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Connect with professional trainers and nutritionists
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className={styles.iconContainer}>
                <i className={`fas fa-chart-line ${styles.iconPrimary}`}></i>
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Track Your Progress</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Monitor your fitness journey with detailed analytics
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right side - Registration form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Mobile header - only shown on small screens */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
              FitMeal Pro
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Join our fitness community
            </p>
          </div>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl text-center lg:text-left">
                Create Account
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-center lg:text-left">
                Start your fitness journey today
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-4 sm:px-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-medium">
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="your@email.com" 
                              type="email"
                              autoComplete="email"
                              {...field} 
                              className="h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            />
                            <i className={`fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted} text-sm`}></i>
                          </div>
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
                        <FormLabel className="text-sm sm:text-base font-medium">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="password" 
                              autoComplete="new-password"
                              placeholder="Minimum 8 characters"
                              {...field} 
                              className="h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            />
                            <i className={`fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted} text-sm`}></i>
                          </div>
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
                        <FormLabel className="text-sm sm:text-base font-medium">
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="password" 
                              autoComplete="new-password"
                              placeholder="Re-enter your password"
                              {...field} 
                              className="h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                            />
                            <i className={`fas fa-shield-alt absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted} text-sm`}></i>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm sm:text-base font-medium">
                          Account Type
                        </FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="h-11 sm:h-12 pl-10 pr-4 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg relative">
                              <i className={`fas fa-user absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted} text-sm`}></i>
                              <SelectValue placeholder="Select your account type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">
                                <div className="flex items-center space-x-2">
                                  <i className={`fas fa-user ${styles.icon} text-sm`}></i>
                                  <span>Customer - Looking for meal plans</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="trainer">
                                <div className="flex items-center space-x-2">
                                  <i className={`fas fa-dumbbell ${styles.icon} text-sm`}></i>
                                  <span>Trainer - Creating meal plans</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 rounded-lg transition-all duration-200 mt-6"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-user-plus mr-2 text-sm"></i>
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter className="flex flex-col items-center space-y-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link 
                    href="/login" 
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;