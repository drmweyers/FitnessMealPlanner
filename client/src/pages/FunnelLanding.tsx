import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView, useAnimation } from "framer-motion";
import {
  Sparkles,
  Palette,
  ShoppingCart,
  TrendingUp,
  Link as LinkIcon,
  BookOpen,
  FileText,
  Leaf,
  Check,
  X,
  Star,
  ChevronRight,
  ArrowRight,
  Shield,
  Clock,
  DollarSign,
  MessageSquare,
  Users,
  Zap,
  Monitor,
  Globe,
  BarChart3,
  Layers,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

/* ──────────────────────────────────────────────
   Font injection — Clash Display + Satoshi
   ────────────────────────────────────────────── */
const FONT_LINK =
  "https://api.fontshare.com/v2/css?f[]=clash-display@200,300,400,500,600,700&f[]=satoshi@300,400,500,700&display=swap";

/* ──────────────────────────────────────────────
   Animation variants
   ────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

/* ──────────────────────────────────────────────
   Animated counter hook
   ────────────────────────────────────────────── */
function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!startOnView || !inView) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration, startOnView]);

  return { count, ref };
}

/* ──────────────────────────────────────────────
   ScrollReveal wrapper
   ────────────────────────────────────────────── */
function Reveal({
  children,
  variants = fadeUp,
  className = "",
}: {
  children: React.ReactNode;
  variants?: typeof fadeUp;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) controls.start("visible");
  }, [inView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function FunnelLanding() {
  return (
    <>
      {/* Font injection */}
      <link rel="stylesheet" href={FONT_LINK} />
      <style>{`
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-satoshi { font-family: 'Satoshi', sans-serif; }
      `}</style>

      <div className="font-satoshi min-h-screen bg-white text-gray-900 overflow-x-hidden">
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeatureGrid />
        <TierComparison />
        <SocialProof />
        <CompetitorTable />
        <FAQSection />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────
   1. HERO SECTION
   ────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-950 to-gray-950" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[160px]" />
      {/* Hero background image */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "url(/marketing/hero-trainer.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-200 font-medium">
              Trusted by fitness professionals worldwide
            </span>
          </div>

          <h1 className="font-clash font-bold text-5xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.05] text-white mb-6 tracking-tight">
            Pay Once.
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              Plan Forever.
            </span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            AI-powered meal plans, shareable client links, grocery lists, and progress
            tracking — all for a single payment.{" "}
            <span className="text-white font-semibold">No monthly fees. Ever.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-clash font-semibold text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 group">
                Get Lifetime Access
                <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 font-clash font-medium text-lg px-8 py-6 h-auto rounded-xl backdrop-blur-sm"
              >
                See How It Works
              </Button>
            </a>
          </div>
        </motion.div>

        {/* Floating stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto"
        >
          {[
            { value: "500+", label: "Trainers" },
            { value: "50K+", label: "Meal Plans Created" },
            { value: "99%", label: "Satisfaction" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-clash font-bold text-2xl sm:text-3xl text-white">
                {stat.value}
              </div>
              <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   2. PROBLEM SECTION
   ────────────────────────────────────────────── */
function ProblemSection() {
  const trainerize = useCounter(24000);
  const eatThisMuch = useCounter(2160);
  const evofit = useCounter(299);

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-red-500 uppercase tracking-widest mb-3">
              The Problem
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-tight">
              Subscription Fatigue Is
              <br />
              <span className="text-red-500">Killing Your Margins</span>
            </h2>
          </div>
        </Reveal>

        {/* Pain points */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-20"
        >
          {[
            {
              icon: <Clock className="w-7 h-7" />,
              title: "Spreadsheet Hell",
              desc: "Hours every week building plans manually in Google Sheets. Copy-pasting macros. Praying the formulas don't break.",
              color: "text-red-500",
              bg: "bg-red-50",
            },
            {
              icon: <DollarSign className="w-7 h-7" />,
              title: "Subscription Drain",
              desc: "$95–$200/month bleeding from your business for software you barely use. That's up to $2,400 a year — gone.",
              color: "text-red-500",
              bg: "bg-red-50",
            },
            {
              icon: <Users className="w-7 h-7" />,
              title: "No Brand Identity",
              desc: "Generic templates. Someone else's logo on your plans. Your clients see the software brand — not yours.",
              color: "text-red-500",
              bg: "bg-red-50",
            },
          ].map((pain) => (
            <motion.div key={pain.title} variants={fadeUp}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow h-full bg-white">
                <CardContent className="p-8">
                  <div
                    className={`w-14 h-14 ${pain.bg} rounded-2xl flex items-center justify-center mb-5 ${pain.color}`}
                  >
                    {pain.icon}
                  </div>
                  <h3 className="font-clash font-semibold text-xl mb-3 text-gray-900">
                    {pain.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{pain.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* 10-year cost comparison */}
        <Reveal>
          <div className="max-w-3xl mx-auto">
            <h3 className="font-clash font-semibold text-2xl text-center mb-10 text-gray-900">
              10-Year Cost of Ownership
            </h3>
            <div className="space-y-6">
              {/* Trainerize */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Trainerize</span>
                  <span ref={trainerize.ref} className="font-clash font-bold text-gray-900">
                    ${trainerize.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-red-400 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Eat This Much */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Eat This Much Pro</span>
                  <span ref={eatThisMuch.ref} className="font-clash font-bold text-gray-900">
                    ${eatThisMuch.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-400 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: "9%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>

              {/* EvoFitMeals */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-purple-700">EvoFitMeals</span>
                  <span
                    ref={evofit.ref}
                    className="font-clash font-bold text-purple-700 text-lg"
                  >
                    ${evofit.count} <span className="text-sm font-normal text-purple-500">(one-time)</span>
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: "1.25%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                  />
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Based on Trainerize Studio at $200/mo and Eat This Much Pro at $18/mo over 10 years.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   3. SOLUTION / HOW IT WORKS
   ────────────────────────────────────────────── */
function SolutionSection() {
  const steps = [
    {
      num: "01",
      title: "Describe what your client needs",
      desc: "Type in plain English: \"High-protein, gluten-free plan for a 180lb male, 2200 calories.\" Our AI understands context like a nutritionist would.",
      icon: <MessageSquare className="w-6 h-6" />,
    },
    {
      num: "02",
      title: "AI generates a complete meal plan in seconds",
      desc: "Full 7-day plans with macros, grocery lists, prep instructions, and substitutions — all generated in under 30 seconds.",
      icon: <Zap className="w-6 h-6" />,
    },
    {
      num: "03",
      title: "Share with your client — no login required",
      desc: "Send a branded link. Your client sees your logo, your colors, their personalized plan. No app downloads. No sign-ups.",
      icon: <LinkIcon className="w-6 h-6" />,
    },
    {
      num: "04",
      title: "Track progress and iterate",
      desc: "Monitor adherence, adjust macros, swap meals, and evolve the plan as your client progresses. All from one dashboard.",
      icon: <BarChart3 className="w-6 h-6" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">
              How It Works
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-tight">
              What If You Could Pay Once
              <br />
              and <span className="text-purple-600">Own It Forever?</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <Reveal key={step.num}>
              <div className="flex gap-5 group">
                {/* Number circle */}
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center text-white font-clash font-bold text-lg shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
                    {step.num}
                  </div>
                </div>
                <div>
                  <h3 className="font-clash font-semibold text-xl text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                  {/* App screenshot */}
                  <div className="mt-4 h-40 rounded-xl border border-gray-200 overflow-hidden">
                    <img
                      src={["/marketing/hero-dashboard.png", "/marketing/hero-dashboard.png", "/marketing/hero-trainer.png", "/marketing/hero-dashboard.png"][i]}
                      alt={`App preview — Step ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   4. FEATURE GRID
   ────────────────────────────────────────────── */
function FeatureGrid() {
  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Meal Plans",
      desc: "Generate complete, macro-balanced plans in seconds with natural language input.",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      icon: <Palette className="w-6 h-6" />,
      title: "Custom Branding",
      desc: "Your logo, your colors, your domain. Clients see your brand — not ours.",
      color: "text-pink-600",
      bg: "bg-pink-50",
    },
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "Grocery Lists",
      desc: "Auto-generated, organized by aisle. Your clients walk in, grab, and go.",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Progress Tracking",
      desc: "Monitor client adherence, measurements, and plan compliance over time.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: <LinkIcon className="w-6 h-6" />,
      title: "Shareable Links",
      desc: "One link. No login required. Clients view their plan on any device instantly.",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Recipe Library",
      desc: "Thousands of chef-tested, macro-optimized recipes across every cuisine.",
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "PDF Exports",
      desc: "Beautiful, branded PDFs your clients can print and pin to the fridge.",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      icon: <Leaf className="w-6 h-6" />,
      title: "8+ Dietary Protocols",
      desc: "Keto, vegan, paleo, halal, gluten-free, and more — all fully supported.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">
              Everything You Need
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900">
              Built for Trainers Who Mean Business
            </h2>
          </div>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={scaleIn}>
              <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 h-full bg-white group hover:-translate-y-1">
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4 ${f.color} group-hover:scale-110 transition-transform`}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-clash font-semibold text-lg text-gray-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   5. TIER COMPARISON (THE STACK SLIDE)
   ────────────────────────────────────────────── */
function TierComparison() {
  const tiers = [
    {
      name: "Starter",
      tagline: "Launch",
      price: 199,
      popular: false,
      features: [
        "Up to 9 clients",
        "50 meal plans/month",
        "Essential recipe library",
        "AI meal plan generation",
        "PDF exports",
        "Grocery lists",
        "Shareable links",
        "Progress tracking",
        "8+ dietary protocols",
        "Email support",
      ],
      cta: "Get Starter",
      accent: "border-gray-200",
      btnClass:
        "bg-gray-900 hover:bg-gray-800 text-white",
    },
    {
      name: "Professional",
      tagline: "Scale",
      price: 299,
      popular: true,
      extras: "Everything in Starter, PLUS:",
      features: [
        "Up to 20 clients",
        "200 meal plans/month",
        "Complete + seasonal recipes",
        "Custom branding (logo + colors)",
        "Natural language AI input",
        "Recipe collections & templates",
        "CSV + PDF analytics",
        "Priority support",
      ],
      cta: "Get Professional",
      accent: "border-purple-500 ring-2 ring-purple-500/20",
      btnClass:
        "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25",
    },
    {
      name: "Enterprise",
      tagline: "Dominate",
      price: 399,
      popular: false,
      extras: "Everything in Professional, PLUS:",
      features: [
        "Unlimited clients",
        "Unlimited meal plans",
        "White-label + custom domain",
        "Team accounts",
        "API access",
        "Bulk operations",
        "Specialized protocols",
        "Dedicated support",
      ],
      cta: "Get Enterprise",
      accent: "border-gray-200",
      btnClass:
        "bg-gray-900 hover:bg-gray-800 text-white",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">
              Pricing
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900 mb-4">
              Choose Your Plan.{" "}
              <span className="text-purple-600">Pay Once.</span> Own It Forever.
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              No subscriptions. No hidden fees. One payment and the platform is yours for life.
            </p>
          </div>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start"
        >
          {tiers.map((tier) => (
            <motion.div key={tier.name} variants={fadeUp}>
              <Card
                className={`relative border-2 ${tier.accent} shadow-sm hover:shadow-xl transition-all duration-300 bg-white overflow-hidden ${
                  tier.popular ? "md:-mt-4 md:mb-[-16px]" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-center text-xs font-bold uppercase tracking-widest py-2">
                    Most Popular
                  </div>
                )}
                <CardContent className={`p-8 ${tier.popular ? "pt-12" : ""}`}>
                  {/* Tagline */}
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-600">
                    {tier.tagline}
                  </span>

                  {/* Name */}
                  <h3 className="font-clash font-bold text-2xl text-gray-900 mt-2">
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-4 mb-6">
                    <span className="font-clash font-bold text-5xl text-gray-900">
                      ${tier.price}
                    </span>
                    <span className="text-gray-500 ml-2">one-time</span>
                  </div>

                  {/* Extras label */}
                  {tier.extras && (
                    <p className="text-sm font-semibold text-purple-700 mb-3">
                      {tier.extras}
                    </p>
                  )}

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href="/pricing">
                    <Button
                      className={`w-full font-clash font-semibold text-base py-5 h-auto rounded-xl ${tier.btnClass} transition-all duration-300`}
                    >
                      {tier.cta}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <Reveal>
          <p className="text-center text-sm text-gray-500 mt-10">
            All plans include a 14-day money-back guarantee. Upgrade anytime — just pay the difference.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   6. SOCIAL PROOF
   ────────────────────────────────────────────── */
function SocialProof() {
  const testimonials = [
    {
      quote:
        "Paid for itself in the first week. I used to spend 3 hours per client on meal plans. Now it takes me 5 minutes. The ROI is insane.",
      name: "Sarah M.",
      title: "Personal Trainer, Austin TX",
      stars: 5,
    },
    {
      quote:
        "My clients love the branded meal plans. They think I hired a designer. The shareable links alone save me hours of back-and-forth emails every week.",
      name: "James K.",
      title: "Online Fitness Coach",
      stars: 5,
    },
    {
      quote:
        "Switched my whole gym over from Trainerize. We're saving $2,000+ a year and the trainers actually prefer this interface. Best decision I've made.",
      name: "Mike R.",
      title: "Gym Owner, Miami FL",
      stars: 5,
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">
              Testimonials
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900">
              What Trainers Are Saying
            </h2>
          </div>
        </Reveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {testimonials.map((t) => (
            <motion.div key={t.name} variants={fadeUp}>
              <Card className="border-0 shadow-md hover:shadow-lg transition-shadow h-full bg-white">
                <CardContent className="p-8">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-orange-400 text-orange-400"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <blockquote className="text-gray-700 leading-relaxed mb-6 italic">
                    "{t.quote}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {t.name}
                      </div>
                      <div className="text-gray-500 text-xs">{t.title}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   7. COMPETITOR COMPARISON TABLE
   ────────────────────────────────────────────── */
function CompetitorTable() {
  const rows = [
    { feature: "One-Time Payment", evo: true, train: false, eat: false, plate: false },
    { feature: "AI Meal Plan Generation", evo: true, train: false, eat: true, plate: true },
    { feature: "Custom Branding", evo: true, train: true, eat: false, plate: false },
    { feature: "Shareable Client Links", evo: true, train: false, eat: false, plate: false },
    { feature: "No Client Login Required", evo: true, train: false, eat: false, plate: false },
    { feature: "Grocery List Generation", evo: true, train: false, eat: true, plate: true },
    { feature: "Progress Tracking", evo: true, train: true, eat: false, plate: false },
    { feature: "PDF Exports", evo: true, train: true, eat: false, plate: false },
    { feature: "8+ Dietary Protocols", evo: true, train: false, eat: true, plate: true },
    { feature: "Recipe Library (6,000+)", evo: true, train: false, eat: true, plate: true },
    { feature: "White-Label Option", evo: true, train: true, eat: false, plate: false },
    { feature: "Starting Price", evo: "$199", train: "$200/mo", eat: "$18/mo", plate: "$13/mo" },
  ];

  const CellIcon = ({ val }: { val: boolean | string }) => {
    if (typeof val === "string") return <span className="text-sm font-medium">{val}</span>;
    return val ? (
      <Check className="w-5 h-5 text-green-500 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-red-400 mx-auto" />
    );
  };

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">
              Comparison
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900">
              See How We Stack Up
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-6 py-4 font-clash font-semibold text-gray-700">
                    Feature
                  </th>
                  <th className="text-center px-4 py-4 font-clash font-semibold text-purple-700 bg-purple-50">
                    EvoFitMeals
                  </th>
                  <th className="text-center px-4 py-4 font-clash font-semibold text-gray-500">
                    Trainerize
                  </th>
                  <th className="text-center px-4 py-4 font-clash font-semibold text-gray-500">
                    Eat This Much
                  </th>
                  <th className="text-center px-4 py-4 font-clash font-semibold text-gray-500">
                    PlateJoy
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-gray-100 ${
                      i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="px-6 py-3.5 font-medium text-gray-800">
                      {row.feature}
                    </td>
                    <td className="px-4 py-3.5 text-center bg-purple-50/50">
                      <CellIcon val={row.evo} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <CellIcon val={row.train} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <CellIcon val={row.eat} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <CellIcon val={row.plate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   8. FAQ / OBJECTION HANDLING
   ────────────────────────────────────────────── */
function FAQSection() {
  const faqs = [
    {
      q: "Is this really one-time? No hidden fees?",
      a: "Yes. You pay once and own lifetime access to your tier. No monthly charges, no annual renewals, no usage fees. The price you see is the price you pay — forever. We fund ongoing development through new customer sales and optional tier upgrades.",
    },
    {
      q: "What if I need more clients?",
      a: "Simply upgrade to the next tier and pay only the difference. Going from Starter (9 clients) to Professional (20 clients) is just $100. Enterprise gives you unlimited clients for $399 total. All upgrades are one-time payments too.",
    },
    {
      q: "Can my clients access plans without signing up?",
      a: "Absolutely. That's one of our biggest differentiators. You share a branded link, and your client views their full meal plan — recipes, macros, grocery list — without creating an account or downloading an app. Zero friction.",
    },
    {
      q: "What dietary restrictions do you support?",
      a: "We support 8+ dietary protocols out of the box: keto, vegan, vegetarian, paleo, halal, kosher, gluten-free, dairy-free, and more. Our AI also handles custom restrictions — just describe what your client needs in plain English and the system adapts.",
    },
    {
      q: "Is there a free trial?",
      a: "We don't offer a free trial because this is a one-time purchase, not a subscription. However, we do offer a 14-day money-back guarantee. Try it, use it with real clients, and if you're not satisfied, we'll refund you — no questions asked.",
    },
    {
      q: "What if I don't like it?",
      a: "You're covered by our 14-day money-back guarantee. If EvoFitMeals doesn't save you time and impress your clients, email us and we'll refund your full purchase price. No hoops, no awkward calls, no retention tricks.",
    },
    {
      q: "How is this different from just using ChatGPT?",
      a: "ChatGPT gives you raw text. EvoFitMeals gives you a complete system: branded meal plans, auto-calculated macros, grocery lists organized by aisle, shareable client links, progress tracking, PDF exports, and a recipe library with 6,000+ meals. It's the difference between a blank document and a professional platform.",
    },
    {
      q: "Can I customize the branding?",
      a: "On Professional and Enterprise plans, yes. Upload your logo, choose your brand colors, and optionally set up a custom domain (Enterprise). Every meal plan, PDF, and shareable link your clients see will carry your brand identity — not ours.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-purple-600 uppercase tracking-widest mb-3">
              FAQ
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900">
              Got Questions? We've Got Answers.
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-white rounded-xl border border-gray-200 px-6 shadow-sm data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-clash font-semibold text-base sm:text-lg text-gray-900 hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   9. FINAL CTA
   ────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Ready to Stop
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              Paying Monthly?
            </span>
          </h2>

          <p className="text-lg sm:text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
            14-Day Money-Back Guarantee. No questions asked.
          </p>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-10">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">
              Join <span className="text-white font-semibold">500+ trainers</span> who
              already own their tools
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing">
              <Button className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-clash font-semibold text-base px-8 py-5 h-auto rounded-xl transition-all duration-300">
                Starter — $199
              </Button>
            </Link>
            <Link href="/pricing">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-clash font-bold text-lg px-10 py-6 h-auto rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 group">
                Professional — $299
                <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-clash font-semibold text-base px-8 py-5 h-auto rounded-xl transition-all duration-300">
                Enterprise — $399
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   10. FOOTER
   ────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <span className="font-clash font-bold text-white text-lg">EvoFitMeals</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="/contact" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} EvoFitMeals. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
