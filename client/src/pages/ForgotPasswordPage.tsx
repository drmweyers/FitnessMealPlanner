import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, Lock, Shield, Mail, ArrowLeft } from "lucide-react";

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

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_LINK}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_LINK;
      document.head.appendChild(link);
    }
  }, []);

  const onSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset link");
      }

      toast({
        title: "Check your email",
        description: data.message,
      });
      setSubmitted(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background:
          "linear-gradient(135deg, #1a0533 0%, #0A0A0F 40%, #0A0A0F 60%, #0f0a1a 100%)",
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #9333EA 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #F97316 0%, transparent 70%)",
          }}
        />
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-md"
        >
          {/* Brand mark */}
          <motion.div variants={fadeUp} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium tracking-wide uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              EvoFit Meals
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white leading-tight"
              style={{ fontFamily: "'Clash Display', sans-serif" }}
            >
              Forgot Your{" "}
              <span className="bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                Password?
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-3 max-w-sm mx-auto">
              No worries — enter your email and we'll send you a reset link.
            </p>
          </motion.div>

          {/* Form card */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-purple-500/20 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-purple-500/5 p-6 sm:p-8"
          >
            {submitted ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3
                    className="text-xl font-bold text-white mb-2"
                    style={{ fontFamily: "'Clash Display', sans-serif" }}
                  >
                    Check Your Inbox
                  </h3>
                  <p className="text-gray-400 text-sm">
                    If an account exists for that email, you'll receive a reset
                    link shortly.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2
                    className="text-xl sm:text-2xl font-bold text-white"
                    style={{ fontFamily: "'Clash Display', sans-serif" }}
                  >
                    Reset Password
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter the email for your account
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
                              className="h-11 sm:h-12 text-sm sm:text-base bg-gray-800/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
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
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
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
                          Sending link...
                        </div>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Trust + back link */}
                <div className="mt-5 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-4 text-gray-500 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Secure reset
                    </span>
                    <span className="w-px h-3 bg-gray-700" />
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Link expires in 1 hour
                    </span>
                  </div>

                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
