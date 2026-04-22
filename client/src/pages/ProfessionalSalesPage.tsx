import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import {
  Check,
  Star,
  Shield,
  Users,
  Zap,
  ChefHat,
  FileText,
  ShoppingCart,
  TrendingUp,
  LinkIcon,
  Salad,
  PenTool,
  BookOpen,
  ImageIcon,
  ArrowRight,
  ChevronDown,
  DollarSign,
  Clock,
  Sparkles,
  BadgeCheck,
  Palette,
  BarChart3,
  Heart,
  Headphones,
  CalendarDays,
  Layout,
  Download,
  Crown,
  X,
  Minus,
} from "lucide-react";

// ─── Scroll-triggered animation wrapper ───
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Value Stack Item ───
function ValueStackItem({
  label,
  value,
  icon: Icon,
  delay = 0,
  isBonus = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  delay?: number;
  isBonus?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.4, delay }}
      className="flex items-center justify-between py-3 border-b border-white/10 group"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isBonus ? "bg-orange-500/20" : "bg-purple-600/30"}`}
        >
          <Icon
            className={`w-4 h-4 ${isBonus ? "text-orange-400" : "text-purple-400"}`}
          />
        </div>
        <span className="text-white/90 text-sm sm:text-base">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-white/40 hidden sm:inline">{"·".repeat(20)}</span>
        <span className="text-white/60 text-sm font-mono">{value}</span>
      </div>
    </motion.div>
  );
}

// ─── FAQ Item ───
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      className="border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors"
    >
      <h4 className="text-white font-semibold text-lg mb-2">{question}</h4>
      <p className="text-white/60 leading-relaxed">{answer}</p>
    </motion.div>
  );
}

// ─── Subscription Cost Row ───
function CostRow({
  label,
  amount,
  delay = 0,
}: {
  label: string;
  amount: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center justify-between py-2"
    >
      <span className="text-red-300/80 text-sm sm:text-base">{label}</span>
      <span className="text-red-400 font-mono font-semibold">{amount}</span>
    </motion.div>
  );
}

export default function ProfessionalSalesPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden"
      style={{ fontFamily: "'Satoshi', 'Inter', sans-serif" }}
    >
      {/* ════════════════════════════════════════════════════════════════
          SECTION 1: HERO
          ════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#1a0a2e] to-[#0A0A0F]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "url(/marketing/hero-online-coach.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          {/* Most Popular Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/40 text-orange-300 text-sm font-bold mb-8"
          >
            <Crown className="w-4 h-4 text-orange-400" />
            MOST POPULAR — PROFESSIONAL PLAN
            <Crown className="w-4 h-4 text-orange-400" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight"
            style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
          >
            Stop Paying Monthly.{" "}
            <span className="bg-gradient-to-r from-purple-400 via-purple-500 to-orange-400 bg-clip-text text-transparent">
              Start Owning Your Tools.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            The complete nutrition platform for established trainers — for a
            one-time investment of{" "}
            <span className="text-white font-bold">$299</span>
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <a
              href="/api/login"
              className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-xl shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] transition-all duration-300 transform hover:scale-105"
            >
              Get Professional for $299
              <ArrowRight className="w-5 h-5" />
            </a>
            <p className="mt-4 text-white/40 text-sm">
              One-time payment. No monthly fees. Ever.
            </p>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-16"
          >
            <ChevronDown className="w-6 h-6 text-white/30 mx-auto animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2: EPIPHANY BRIDGE STORY
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-12">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                The Breaking Point
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4 leading-tight"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                "I Added Up My{" "}
                <span className="text-red-400">Subscriptions</span> and Almost
                Threw Up..."
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="prose prose-invert prose-lg max-w-none space-y-6 text-white/70 leading-relaxed">
              <p>
                I had 12 clients. Business was growing. I thought I was doing
                well.
              </p>
              <p>
                Then one Sunday, I sat down to do my quarterly books. I pulled
                up every subscription I was paying for as a trainer:
              </p>
              <ul className="text-red-300/80 space-y-2">
                <li>
                  Meal planning software:{" "}
                  <span className="font-semibold">$47/month</span>
                </li>
                <li>
                  Client management CRM:{" "}
                  <span className="font-semibold">$29/month</span>
                </li>
                <li>
                  Email/messaging tool:{" "}
                  <span className="font-semibold">$19/month</span>
                </li>
                <li>
                  Scheduling app:{" "}
                  <span className="font-semibold">$50/month</span>
                </li>
              </ul>
              <p>
                I was spending{" "}
                <span className="text-red-400 font-bold text-xl">
                  $147 per month
                </span>{" "}
                on tools. That's{" "}
                <span className="text-red-400 font-bold">$1,764 per year</span>.
                And every single one of those subscriptions was going up in
                price.
              </p>
              <p className="text-white/50 italic border-l-2 border-purple-500/50 pl-6">
                "What if I could replace most of these with one tool I own
                forever?"
              </p>
              <p>
                I switched to EvoFitMeals Professional. One payment of $299.
                Done. In year one alone, I saved{" "}
                <span className="text-green-400 font-bold">$1,465</span>. By
                year two, it was{" "}
                <span className="text-green-400 font-bold">$3,229</span>.
              </p>
              <p className="text-xl text-white font-semibold">
                The subscription model is designed to drain you. Ownership is
                designed to free you.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3: SUBSCRIPTION COST CALCULATOR
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                The Subscription Trap
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                How Much Are You <span className="text-red-400">Really</span>{" "}
                Paying?
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What you're paying */}
            <AnimatedSection delay={0.1}>
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-red-400 font-bold text-lg">
                    What You're Paying Now
                  </h3>
                </div>

                <CostRow
                  label="Meal planning software"
                  amount="$47/mo"
                  delay={0}
                />
                <CostRow
                  label="Client management CRM"
                  amount="$29/mo"
                  delay={0.05}
                />
                <CostRow
                  label="Email/messaging tool"
                  amount="$19/mo"
                  delay={0.1}
                />
                <CostRow label="Scheduling app" amount="$50/mo" delay={0.15} />

                <div className="mt-6 pt-4 border-t border-red-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-red-300 font-semibold">
                      Monthly Total
                    </span>
                    <span className="text-red-400 font-black text-2xl">
                      $145/mo
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-red-300/60">Annual Cost</span>
                    <span className="text-red-400/80 font-bold text-xl">
                      $1,740/yr
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-red-300/60">5-Year Cost</span>
                    <span className="text-red-400/80 font-bold text-xl">
                      $8,700
                    </span>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* What you could pay */}
            <AnimatedSection delay={0.3}>
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-green-400 font-bold text-lg">
                    What You Could Pay
                  </h3>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    $299
                  </div>
                  <div className="text-green-300/60 text-lg mt-2">
                    Once. Forever.
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-green-500/20 space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="text-green-300/80">
                      Year 1 savings:{" "}
                      <span className="font-bold text-green-400">$1,441</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="text-green-300/80">
                      5-Year savings:{" "}
                      <span className="font-bold text-green-400">$8,401</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="text-green-300/80">
                      10-Year savings:{" "}
                      <span className="font-bold text-green-400">$17,101</span>
                    </span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4: VALUE STACK SLIDE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                The Value Stack
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                Everything In Professional
              </h2>
              <p className="text-white/50 text-lg mt-4 max-w-xl mx-auto">
                Serious trainers pick Professional. $100 more than Starter
                unlocks $2,494 in protocols and marketing you'll use every week.
              </p>
            </div>
          </AnimatedSection>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            {/* Starter includes */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 font-semibold text-sm tracking-widest uppercase">
                  Everything in Starter
                </span>
              </div>
            </div>
            <ValueStackItem
              icon={Zap}
              label="Everything in Starter Plan"
              value="$5,200/yr"
              delay={0}
            />
            <ValueStackItem
              icon={Users}
              label="20 Client Slots"
              value="$1,000/yr"
              delay={0.05}
            />
            <ValueStackItem
              icon={ChefHat}
              label="Complete Recipe Library + Seasonal"
              value="$1,500/yr"
              delay={0.1}
            />
            <ValueStackItem
              icon={Sparkles}
              label="Advanced Macro & Nutrition Filters"
              value="$600/yr"
              delay={0.12}
            />
            <ValueStackItem
              icon={Palette}
              label="Custom Branding"
              value="$2,000/yr"
              delay={0.15}
            />
            <ValueStackItem
              icon={Sparkles}
              label="Advanced Natural Language AI"
              value="$800/yr"
              delay={0.2}
            />
            <ValueStackItem
              icon={BookOpen}
              label="Recipe Collections"
              value="$300/yr"
              delay={0.25}
            />
            <ValueStackItem
              icon={Layout}
              label="Meal Plan Templates"
              value="$300/yr"
              delay={0.3}
            />
            <ValueStackItem
              icon={BarChart3}
              label="CSV + PDF Analytics"
              value="$400/yr"
              delay={0.35}
            />
            <ValueStackItem
              icon={Download}
              label="CSV + Excel Data Exports"
              value="$400/yr"
              delay={0.4}
            />
            <ValueStackItem
              icon={Headphones}
              label="Priority Support"
              value="$600/yr"
              delay={0.45}
            />

            {/* Bonuses */}
            <div className="mt-6 pt-6 border-t border-purple-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  FREE BONUSES
                </span>
              </div>
              <ValueStackItem
                icon={Zap}
                label="Lifetime Platform Updates"
                value="$997"
                delay={0.5}
                isBonus
              />
              <ValueStackItem
                icon={BadgeCheck}
                label="Trainer Toolkit — 8 Professional Calculators"
                value="$297"
                delay={0.55}
                isBonus
              />
              <ValueStackItem
                icon={BookOpen}
                label="Marketing Vault — Email Scripts + Social Templates"
                value="$497"
                delay={0.6}
                isBonus
              />
              <ValueStackItem
                icon={CalendarDays}
                label="ALL Specialized Meal Plan Drops (12+/year)"
                value="$997"
                delay={0.65}
                isBonus
              />
              <ValueStackItem
                icon={Layout}
                label="Advanced Marketing Playbooks"
                value="$497"
                delay={0.7}
                isBonus
              />
            </div>

            {/* Business Vault Bonus — Professional Editions */}
            <div className="mt-6 pt-6 border-t border-purple-500/30">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  EvoFit Business Vault — 9 PDFs (Professional Editions)
                </span>
              </div>
              <ValueStackItem
                icon={TrendingUp}
                label="Revenue Playbooks — Accelerator + Client Acquisition + Pricing Guide"
                value="$897"
                delay={0.75}
                isBonus
              />
              <ValueStackItem
                icon={PenTool}
                label="Scripts & Protocols — Sales + Consultation + 90-Day Adherence"
                value="$697"
                delay={0.8}
                isBonus
              />
              <ValueStackItem
                icon={Users}
                label="Client Kits — Onboarding + Retention & Re-engagement"
                value="$497"
                delay={0.85}
                isBonus
              />
              <ValueStackItem
                icon={Salad}
                label="Meal Plan Launch Templates — Challenges + Seasonal + Group Programs"
                value="$497"
                delay={0.9}
                isBonus
              />
            </div>

            {/* Total */}
            <AnimatedSection delay={0.95}>
              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <div className="text-white/50 text-lg mb-2">
                  Total Package Value
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white/30 line-through mb-4">
                  $7,479
                </div>
                <div className="text-sm text-white/50 mb-2">YOUR PRICE</div>
                <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                  $299
                </div>
                <div className="text-white/50 mt-2 text-lg">
                  One time. Not per year.{" "}
                  <span className="font-bold text-white">Forever.</span>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5: COMPETITOR COMPARISON TABLE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                Compare & Save
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                See How We Stack Up
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left p-4 text-white/50 font-medium text-sm"></th>
                    <th className="p-4 text-center">
                      <div className="bg-gradient-to-br from-purple-600/30 to-orange-500/20 border border-purple-500/40 rounded-xl p-4">
                        <div className="text-purple-300 font-bold text-lg">
                          EvoFitMeals
                        </div>
                        <div className="text-white font-black text-2xl">
                          $299
                        </div>
                        <div className="text-green-400 text-xs font-semibold">
                          ONE TIME
                        </div>
                      </div>
                    </th>
                    <th className="p-4 text-center">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-white/60 font-bold text-lg">
                          Trainerize
                        </div>
                        <div className="text-white/80 font-black text-2xl">
                          $45/mo
                        </div>
                        <div className="text-red-400 text-xs font-semibold">
                          RECURRING
                        </div>
                      </div>
                    </th>
                    <th className="p-4 text-center">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-white/60 font-bold text-lg">
                          TrueCoach
                        </div>
                        <div className="text-white/80 font-black text-2xl">
                          $29/mo
                        </div>
                        <div className="text-red-400 text-xs font-semibold">
                          RECURRING
                        </div>
                      </div>
                    </th>
                    <th className="p-4 text-center hidden lg:table-cell">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <div className="text-white/60 font-bold text-lg">
                          My PT Hub
                        </div>
                        <div className="text-white/80 font-black text-2xl">
                          $55/mo
                        </div>
                        <div className="text-red-400 text-xs font-semibold">
                          RECURRING
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      feature: "2-Year Cost",
                      evo: "$299",
                      t1: "$1,080",
                      t2: "$696",
                      t3: "$1,320",
                    },
                    {
                      feature: "10-Year Cost",
                      evo: "$299",
                      t1: "$5,400",
                      t2: "$3,480",
                      t3: "$6,600",
                    },
                    {
                      feature: "AI Meal Generation",
                      evo: true,
                      t1: false,
                      t2: false,
                      t3: false,
                    },
                    {
                      feature: "Custom Branding",
                      evo: true,
                      t1: true,
                      t2: false,
                      t3: true,
                    },
                    {
                      feature: "Recipe Library",
                      evo: "3,000+",
                      t1: "Limited",
                      t2: "None",
                      t3: "Basic",
                    },
                    {
                      feature: "Grocery Lists",
                      evo: true,
                      t1: false,
                      t2: false,
                      t3: false,
                    },
                    {
                      feature: "One-Time Payment",
                      evo: true,
                      t1: false,
                      t2: false,
                      t3: false,
                    },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="p-4 text-white/70 font-medium text-sm">
                        {row.feature}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.evo === "boolean" ? (
                          row.evo ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <Minus className="w-5 h-5 text-white/20 mx-auto" />
                          )
                        ) : (
                          <span
                            className={`font-bold ${row.feature.includes("Cost") ? "text-green-400" : "text-white"}`}
                          >
                            {row.evo}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.t1 === "boolean" ? (
                          row.t1 ? (
                            <Check className="w-5 h-5 text-white/40 mx-auto" />
                          ) : (
                            <Minus className="w-5 h-5 text-white/20 mx-auto" />
                          )
                        ) : (
                          <span
                            className={`${row.feature.includes("Cost") ? "text-red-400" : "text-white/50"}`}
                          >
                            {row.t1}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof row.t2 === "boolean" ? (
                          row.t2 ? (
                            <Check className="w-5 h-5 text-white/40 mx-auto" />
                          ) : (
                            <Minus className="w-5 h-5 text-white/20 mx-auto" />
                          )
                        ) : (
                          <span
                            className={`${row.feature.includes("Cost") ? "text-red-400" : "text-white/50"}`}
                          >
                            {row.t2}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center hidden lg:table-cell">
                        {typeof row.t3 === "boolean" ? (
                          row.t3 ? (
                            <Check className="w-5 h-5 text-white/40 mx-auto" />
                          ) : (
                            <Minus className="w-5 h-5 text-white/20 mx-auto" />
                          )
                        ) : (
                          <span
                            className={`${row.feature.includes("Cost") ? "text-red-400" : "text-white/50"}`}
                          >
                            {row.t3}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6: CUSTOM BRANDING SHOWCASE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                Your Brand, Your Way
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                Branded PDFs That Look{" "}
                <span className="text-purple-400">100% Yours</span>
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Mockup */}
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 px-3 py-1 bg-purple-600/30 rounded-full text-purple-300 text-xs font-semibold">
                  PREVIEW
                </div>
                {/* PDF Mockup */}
                <div className="bg-white rounded-lg p-6 shadow-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500" />
                    <div>
                      <div className="h-3 w-32 bg-gray-800 rounded" />
                      <div className="h-2 w-20 bg-gray-400 rounded mt-1" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded mb-2" />
                  <div className="h-2 w-3/4 bg-gray-200 rounded mb-4" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold">
                        BREAKFAST
                      </span>
                    </div>
                    <div className="h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-xs font-bold">
                        LUNCH
                      </span>
                    </div>
                    <div className="h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-xs font-bold">
                        DINNER
                      </span>
                    </div>
                    <div className="h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-xs font-bold">
                        SNACKS
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="h-2 w-24 bg-gray-300 rounded mx-auto" />
                    <div className="h-1.5 w-16 bg-gray-200 rounded mx-auto mt-1" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-6">
                {[
                  {
                    icon: Palette,
                    title: "Your Logo & Colors",
                    desc: "Upload your logo and set your brand colors. Every PDF looks like it came from your own custom software.",
                  },
                  {
                    icon: FileText,
                    title: "Professional PDF Layout",
                    desc: "Clean, modern layouts with macro breakdowns, ingredient lists, and prep instructions.",
                  },
                  {
                    icon: LinkIcon,
                    title: "Shareable Client Links",
                    desc: "Send branded links to clients. They see your brand, not ours.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center shrink-0">
                      <item.icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {item.title}
                      </h3>
                      <p className="text-white/60 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7: GUARANTEE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-green-400" />
              </div>
              <h2
                className="text-3xl sm:text-4xl font-black mb-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                14-Day Money-Back Guarantee
              </h2>
              <p className="text-white/60 text-lg leading-relaxed max-w-xl mx-auto mb-6">
                Try EvoFitMeals Professional for 14 days. If it doesn't save you
                time and money compared to your current subscriptions, we'll
                refund you in full. No questions asked.
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 font-semibold">
                <Shield className="w-5 h-5" />
                100% Risk-Free Purchase
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 8: FAQ
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                FAQ
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                Got Questions?
              </h2>
            </div>
          </AnimatedSection>

          <div className="space-y-4">
            <FAQItem
              question="How does this replace my current tools?"
              answer="EvoFitMeals Professional handles meal planning, recipe management, client management (up to 20 clients), PDF exports, branding, analytics, and client communication links. Most trainers find it replaces 2-3 separate subscriptions."
            />
            <FAQItem
              question="What if I have more than 20 clients?"
              answer="You can upgrade to Enterprise (unlimited clients) at any time for just $100 more — and it's still a one-time payment. Your data, clients, and customizations all transfer seamlessly."
            />
            <FAQItem
              question="Can I put my own logo on everything?"
              answer="Yes. Professional includes custom branding — upload your logo and set your brand colors, and they appear on every meal plan PDF and client link. For full white-label mode (hiding EvoFitMeals branding entirely) and a custom domain, upgrade to Enterprise for $100 more."
            />
            <FAQItem
              question="What happens when you release new features?"
              answer="You get them. All updates, new recipes, seasonal content, and feature improvements are included forever. No additional cost. We're constantly improving the platform and you benefit from every update."
            />
            <FAQItem
              question="I'm already paying for Trainerize/TrueCoach. Can I migrate?"
              answer="While we don't do automated migrations, our onboarding process is fast. Most trainers are fully set up within an hour. And by switching, you'll save hundreds to thousands of dollars per year in subscription fees."
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 9: UPSELL TO ENTERPRISE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-8 sm:p-10">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  Running High Volume? Consider Enterprise
                </span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-black text-white mb-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                Need More Than 20 Clients or Full White-Label? It's $100 More.
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Enterprise removes all limits: unlimited clients, unlimited meal
                plans, white-label mode with custom domain, all export formats,
                and dedicated support. Pay $100 over Professional, one time.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
                {[
                  "Unlimited clients (no cap ever)",
                  "Unlimited meal plans",
                  "Full white-label + custom domain",
                  "API access — coming soon (Enterprise only)",
                  "Bulk operations across all clients",
                  "All 17 meal type categories",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-white/70"
                  >
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <a
                href="/enterprise"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600/50 text-indigo-200 font-semibold rounded-lg transition-all duration-200"
              >
                See Enterprise Plan — $399
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 10: FINAL CTA
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#1a0a2e] to-[#0A0A0F]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/15 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            {/* Most Popular reminder */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/30 text-orange-300 text-sm font-bold mb-8">
              <Crown className="w-4 h-4" />
              MOST POPULAR CHOICE
            </div>

            <h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
            >
              Stop Renting.{" "}
              <span className="text-purple-400">Start Owning.</span>
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
              One payment replaces $1,740+/year in subscriptions.
            </p>

            <a
              href="/api/login"
              className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xl rounded-xl shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] transition-all duration-300 transform hover:scale-105"
            >
              Get Professional for $299
              <ArrowRight className="w-6 h-6" />
            </a>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                14-day money-back guarantee
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Instant access
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                No monthly fees
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-16 bg-[#0A0A0F]" />
    </div>
  );
}
