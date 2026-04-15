import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { useToast } from "../hooks/use-toast";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles,
  Palette,
  Link as LinkIcon,
  Shield,
  Lock,
  Quote,
} from "lucide-react";

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

// Login form schema with comprehensive validation
const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Inject fonts (matches RegisterPage)
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_LINK}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
  }, []);

  const onSubmit = async (values: LoginFormData) => {
    try {
      const user = await login(values);

      toast({
        title: "Login successful",
        description: `Welcome back${user.email ? `, ${user.email}` : ""}!`,
      });

      // Clear form
      form.reset();

      // Mobile-specific navigation handling
      const isMobile =
        typeof window !== "undefined" && window.innerWidth <= 1023;

      if (isMobile) {
        // Force mobile navigation to appear after login
        setTimeout(() => {
          document.body.classList.add("mobile-nav-active");

          // Apply mobile navigation styles immediately
          const existingStyle = document.getElementById(
            "post-login-mobile-styles",
          );
          if (existingStyle) {
            existingStyle.remove();
          }

          const style = document.createElement("style");
          style.id = "post-login-mobile-styles";
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
          case "admin":
            navigate("/admin");
            break;
          case "trainer":
            navigate("/trainer");
            break;
          case "customer":
            navigate("/customer");
            break;
          default:
            navigate("/");
        }
      };

      // For mobile, add a slight delay to ensure proper navigation setup
      if (isMobile) {
        setTimeout(navigateToRole, 200);
      } else {
        navigateToRole();
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // Clear password field on error
      form.setValue("password", "");

      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const benefits = [
    {
      icon: Sparkles,
      title: "AI-Powered Meal Plans",
      description:
        "Generate personalized plans in seconds with our intelligent engine",
    },
    {
      icon: Palette,
      title: "Custom Branding",
      description:
        "Your logo, your colors on every plan you deliver to clients",
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
        background: "#0f172a",
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Orange glow top-left */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #F97316 0%, transparent 70%)",
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
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 text-xs font-medium tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                For Fitness Professionals
              </div>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight"
                style={{ fontFamily: "'Clash Display', sans-serif" }}
              >
                Welcome <span className="text-orange-400">Back.</span>
              </h1>
              <p className="text-gray-400 text-base sm:text-lg max-w-md leading-relaxed">
                Sign in to keep delivering branded, professional meal plans to
                every client.
              </p>
            </motion.div>

            {/* Benefits */}
            <motion.div variants={fadeUp} className="space-y-5">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/25 transition-colors">
                    <benefit.icon className="w-5 h-5 text-orange-400" />
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
              <Quote className="w-5 h-5 text-orange-500/50 mb-3" />
              <p className="text-gray-300 text-sm italic leading-relaxed">
                "EvoFitMeals cut my meal-planning time by 80%. My clients love
                the branded PDFs, and the shareable links mean zero onboarding
                friction."
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  JM
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Jake M.</p>
                  <p className="text-gray-500 text-xs">Online Fitness Coach</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ─── Right side: Login Form ─── */}
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
                Welcome <span className="text-orange-400">Back.</span>
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Your personalized nutrition companion
              </p>
            </div>

            {/* Form card */}
            <div className="rounded-2xl border border-orange-500/20 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-orange-500/5 p-6 sm:p-8">
              {/* Header */}
              <div className="mb-6">
                <h2
                  className="text-xl sm:text-2xl font-bold text-white"
                  style={{ fontFamily: "'Clash Display', sans-serif" }}
                >
                  Sign In
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Enter your credentials to access your account
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
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
                            {...field}
                            className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg"
                            style={{
                              fontSize: "16px",
                              minHeight: "44px",
                              padding: "12px 16px",
                            }}
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
                            autoComplete="current-password"
                            {...field}
                            className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg"
                            style={{
                              fontSize: "16px",
                              minHeight: "44px",
                              padding: "12px 16px",
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 mt-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
                    style={{
                      minHeight: "48px",
                      fontSize: "16px",
                      touchAction: "manipulation",
                    }}
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Signing In...
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Trust + footer links */}
              <div className="mt-5 flex flex-col items-center gap-3">
                <div className="flex items-center gap-4 text-gray-500 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Secure login
                  </span>
                  <span className="w-px h-3 bg-gray-700" />
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Encrypted at rest
                  </span>
                </div>

                <p className="text-gray-500 text-sm">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Create one here
                  </Link>
                </p>

                <Link
                  href="/forgot-password"
                  className="text-xs sm:text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Terms footer */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{" "}
                <a
                  href="/terms"
                  className="text-orange-400 hover:text-orange-300 hover:underline"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="text-orange-400 hover:text-orange-300 hover:underline"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
