import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useToast } from '../hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Sparkles, Palette, Link as LinkIcon, Shield, Lock, Check, Quote } from 'lucide-react';

/* ──────────────────────────────────────────────
   Font injection — Clash Display + Satoshi
   ────────────────────────────────────────────── */
const FONT_LINK =
  "https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&f[]=satoshi@300,400,500,700&display=swap";

/* ──────────────────────────────────────────────
   Animation variants
   ────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
  confirmPassword: z.string(),
  role: z.enum(['customer', 'trainer']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface InvitationData {
  customerEmail: string;
  trainerEmail: string;
  expiresAt: string;
}

const RegisterPage = () => {
  const { register } = useAuth();
  const { toast } = useToast();
  const [, redirect] = useLocation();
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [isVerifyingInvitation, setIsVerifyingInvitation] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
    },
  });

  // Inject fonts
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_LINK}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
  }, []);

  // Check for invitation token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invitation');

    if (token) {
      setInvitationToken(token);
      verifyInvitation(token);
    }
  }, []);

  const verifyInvitation = async (token: string) => {
    setIsVerifyingInvitation(true);
    try {
      const response = await fetch(`/api/invitations/verify/${token}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Invalid invitation');
      }

      const data = await response.json();
      setInvitationData(data.data.invitation);

      // Pre-fill email and set role to customer
      form.setValue('email', data.data.invitation.customerEmail);
      form.setValue('role', 'customer');

      toast({
        title: "Invitation Verified",
        description: `You've been invited by ${data.data.invitation.trainerEmail}`,
      });

    } catch (error: any) {
      toast({
        title: "Invalid Invitation",
        description: error.message,
        variant: "destructive",
      });
      setInvitationToken(null);
    } finally {
      setIsVerifyingInvitation(false);
    }
  };

  const onSubmit = async (values: RegisterFormData) => {
    try {
      if (invitationToken) {
        // Register via invitation
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: invitationToken,
            password: values.password,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to accept invitation');
        }

        const data = await response.json();

        toast({
          title: 'Account Created Successfully',
          description: 'You can now log in with your new account.',
        });

        // Redirect to login page
        redirect('/login');
      } else {
        // Regular registration
        const { confirmPassword, ...registerData } = values;
        const user = await register(registerData);

        if (!user || !user.role) {
          throw new Error('Invalid user data received');
        }

        toast({
          title: 'Registration successful',
          description: 'Welcome to EvoFitMeals!',
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
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      // Handle specific error cases with user-friendly messages
      let errorMessage = 'An error occurred during registration';

      if (error.message?.includes('User already exists')) {
        errorMessage = 'An account with this email already exists. Please login or use a different email.';
      } else if (error.message?.includes('Password must')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const benefits = [
    {
      icon: Sparkles,
      title: "AI-Powered Meal Plans",
      description: "Generate personalized plans in seconds with our intelligent engine",
    },
    {
      icon: Palette,
      title: "Custom Branding",
      description: "Your logo, your colors on every plan you deliver to clients",
    },
    {
      icon: LinkIcon,
      title: "Shareable Client Links",
      description: "No login required for clients \u2014 just share and done",
    },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: "linear-gradient(135deg, #1a0533 0%, #0A0A0F 40%, #0A0A0F 60%, #0f0a1a 100%)",
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Purple glow top-left */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #9333EA 0%, transparent 70%)",
          }}
        />
        {/* Orange glow bottom-right */}
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #F97316 0%, transparent 70%)",
          }}
        />
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* ─── Left side: Value Propositions ─── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col space-y-8"
          >
            {/* Headline */}
            <motion.div variants={fadeUp} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                For Fitness Professionals
              </div>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                Pay Once.{" "}
                <span className="bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                  Plan Forever.
                </span>
              </h1>
              <p className="text-gray-400 text-base sm:text-lg max-w-md leading-relaxed">
                The all-in-one meal planning platform that lets trainers deliver
                branded, professional plans to every client.
              </p>
            </motion.div>

            {/* Benefits */}
            <motion.div variants={fadeUp} className="space-y-5">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/25 transition-colors">
                    <benefit.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm sm:text-base">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Testimonial */}
            <motion.div
              variants={fadeUp}
              className="hidden lg:block rounded-xl bg-white/[0.03] border border-white/[0.06] p-5"
            >
              <Quote className="w-5 h-5 text-purple-500/50 mb-3" />
              <p className="text-gray-300 text-sm italic leading-relaxed">
                "EvoFitMeals cut my meal-planning time by 80%. My clients love the
                branded PDFs, and the shareable links mean zero onboarding friction."
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  JM
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Jake M.</p>
                  <p className="text-gray-500 text-xs">Online Fitness Coach</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ─── Right side: Registration Form ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full"
          >
            {/* Mobile headline (visible below lg) */}
            <div className="lg:hidden text-center mb-8">
              <h1
                className="text-2xl sm:text-3xl font-bold text-white mb-2"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                Pay Once.{" "}
                <span className="bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                  Plan Forever.
                </span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                The meal planning platform for fitness pros
              </p>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-purple-500/20 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-purple-500/5 p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6">
                <h2
                  className="text-xl sm:text-2xl font-bold text-white"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Create Your Account
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Start your fitness business upgrade today
                </p>
              </div>

              {/* Invitation Info */}
              {invitationData && (
                <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-emerald-300 text-sm font-semibold">Trainer Invitation</p>
                      <p className="text-emerald-300/70 text-sm mt-0.5">
                        You've been invited by <strong className="text-emerald-200">{invitationData.trainerEmail}</strong> to join EvoFitMeals.
                        Complete your registration below to get started.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State for Invitation Verification */}
              {isVerifyingInvitation && (
                <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />
                    <p className="text-blue-300 text-sm">Verifying invitation...</p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm font-medium">
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your@email.com"
                            type="email"
                            autoComplete="email"
                            disabled={!!invitationData}
                            {...field}
                            className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg disabled:bg-gray-800/30 disabled:text-gray-500"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm font-medium">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder="Strong password required"
                            {...field}
                            className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
                          />
                        </FormControl>
                        <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                          <p>Must contain: 8+ chars, uppercase, lowercase, number, special char</p>
                        </div>
                        <FormMessage className="text-xs sm:text-sm text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm font-medium">
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="new-password"
                            placeholder="Re-enter your password"
                            {...field}
                            className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm font-medium">
                          Account Type
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!!invitationData}
                          >
                            <SelectTrigger className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white focus:border-purple-500 focus:ring-purple-500/20 rounded-lg disabled:bg-gray-800/30 disabled:text-gray-500">
                              <SelectValue placeholder="Select your account type" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                              <SelectItem value="customer" className="focus:bg-gray-700 focus:text-white">
                                Customer — Looking for meal plans
                              </SelectItem>
                              {!invitationData && (
                                <SelectItem value="trainer" className="focus:bg-gray-700 focus:text-white">
                                  Trainer — Creating meal plans
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 mt-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Creating Account...
                      </div>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Trust elements */}
              <div className="mt-5 flex flex-col items-center gap-3">
                <div className="flex items-center gap-4 text-gray-500 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Secure signup
                  </span>
                  <span className="w-px h-3 bg-gray-700" />
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    14-day money-back guarantee
                  </span>
                </div>

                <p className="text-gray-500 text-sm">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
