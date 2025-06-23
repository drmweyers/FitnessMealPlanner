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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 items-center">
        {/* Left side - Welcome content */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex flex-col space-y-4 p-6"
        >
          <h1 className="text-4xl font-bold text-primary">Welcome to FitMeal Pro</h1>
          <p className="text-lg text-muted-foreground">Join our community of health enthusiasts and fitness professionals.</p>
          
          <div className="space-y-4 mt-8">
            <div className="flex items-start space-x-3">
              <div className={styles.iconContainer}>
                <i className={`fas fa-utensils ${styles.iconPrimary}`}></i>
              </div>
              <div>
                <h3 className="font-semibold">Personalized Meal Plans</h3>
                <p className="text-sm text-muted-foreground">Get customized meal plans tailored to your goals</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className={styles.iconContainer}>
                <i className={`fas fa-dumbbell ${styles.iconPrimary}`}></i>
              </div>
              <div>
                <h3 className="font-semibold">Expert Guidance</h3>
                <p className="text-sm text-muted-foreground">Connect with professional trainers and nutritionists</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className={styles.iconContainer}>
                <i className={`fas fa-chart-line ${styles.iconPrimary}`}></i>
              </div>
              <div>
                <h3 className="font-semibold">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground">Monitor your fitness journey with detailed analytics</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right side - Registration form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Create Account</CardTitle>
              <CardDescription>Start your fitness journey today</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="your@email.com" 
                              {...field} 
                              className="pl-10"
                            />
                            <i className={`fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted}`}></i>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="password" 
                              {...field} 
                              className="pl-10"
                            />
                            <i className={`fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted}`}></i>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="password" 
                              {...field} 
                              className="pl-10"
                            />
                            <i className={`fas fa-shield-alt absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted}`}></i>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="pl-10 relative">
                              <i className={`fas fa-user absolute left-3 top-1/2 -translate-y-1/2 ${styles.iconMuted}`}></i>
                              <SelectValue placeholder="Select your account type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">
                                <div className="flex items-center space-x-2">
                                  <i className={`fas fa-user ${styles.icon}`}></i>
                                  <span>Customer</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="trainer">
                                <div className="flex items-center space-x-2">
                                  <i className={`fas fa-dumbbell ${styles.icon}`}></i>
                                  <span>Trainer</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    <i className="fas fa-user-plus mr-2"></i>
                    Create Account
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col items-center">
              <p>Already have an account? <Link href="/login" className="text-primary hover:underline">Login</Link></p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;