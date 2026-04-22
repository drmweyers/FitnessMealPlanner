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
  Building2,
  Globe,
  Code2,
  Layers,
  Timer,
  Infinity as InfinityIcon,
  UserCog,
  Cpu,
  PackageOpen,
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

export default function EnterpriseSalesPage() {
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
            backgroundImage: "url(/marketing/hero-gym-owner.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-purple-600/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          {/* Enterprise Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-400/40 text-purple-200 text-sm font-bold mb-8"
          >
            <Building2 className="w-4 h-4 text-purple-300" />
            ENTERPRISE — FOR GYMS & HIGH-VOLUME TRAINERS
            <Building2 className="w-4 h-4 text-purple-300" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight"
            style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
          >
            One Payment.{" "}
            <span className="bg-gradient-to-r from-purple-400 via-purple-500 to-orange-400 bg-clip-text text-transparent">
              Unlimited Clients. White-Label Everything.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            The complete nutrition platform for your entire organization — for a
            one-time investment of{" "}
            <span className="text-white font-bold">$399</span>
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
              Get Enterprise for $399
              <ArrowRight className="w-5 h-5" />
            </a>
            <p className="mt-4 text-white/40 text-sm">
              One-time payment. Unlimited everything. Forever.
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
                A Gym Owner's Story
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4 leading-tight"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                "My Clients Were Getting Plans From a{" "}
                <span className="text-red-400">Competitor's Brand</span>
                ..."
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="prose prose-invert prose-lg max-w-none space-y-6 text-white/70 leading-relaxed">
              <p>
                I had 80 clients and a growing online coaching business. Every
                meal plan I sent had one problem: it said "EvoFitMeals" at the
                top, not my brand.
              </p>
              <p>
                My clients were associating the nutrition experience with
                someone else's software — not with{" "}
                <span className="text-white italic">my coaching brand</span>.
              </p>
              <p>
                I was also bumping up against limits constantly. The 200 meal
                plan cap on Professional was slowing me down every month.
              </p>
              <p className="text-white/50 italic border-l-2 border-purple-500/50 pl-6">
                "I need unlimited generation, my logo on everything, and my own
                domain — without paying another subscription forever."
              </p>
              <p>
                I upgraded to Enterprise.{" "}
                <span className="text-white font-semibold">
                  $100 more. Once.
                </span>{" "}
                Unlimited clients. Unlimited meal plans. White-label on. Custom
                domain set up in 10 minutes.
              </p>
              <p>
                Now every client sees my brand on every plan. Not a third-party
                app's name. Mine.
              </p>
              <p className="text-xl text-white font-semibold">
                Enterprise is a $100 upgrade that looks like you spent $10,000
                on custom software.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3: TEAM ROI CALCULATOR
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                Team ROI Calculator
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                The Numbers Speak{" "}
                <span className="text-green-400">For Themselves</span>
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            {/* Revenue Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">50</div>
                <div className="text-white/50 text-sm mt-1">Clients</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-3">
                  <UserCog className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">$50</div>
                <div className="text-white/50 text-sm mt-1">Per Plan/Month</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">$399</div>
                <div className="text-white/50 text-sm mt-1">One-Time Cost</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-600/30 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-3xl font-black text-green-400">$2,500</div>
                <div className="text-green-300/50 text-sm mt-1">
                  Monthly Revenue
                </div>
              </div>
            </div>

            {/* ROI Calculation */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-8 sm:p-10 text-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div>
                  <div className="text-white/50 text-sm mb-1">Investment</div>
                  <div className="text-3xl font-black text-white">$399</div>
                  <div className="text-white/40 text-sm">one time</div>
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1">
                    Monthly Revenue
                  </div>
                  <div className="text-3xl font-black text-green-400">
                    $2,500
                  </div>
                  <div className="text-green-300/40 text-sm">
                    from nutrition services
                  </div>
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1">ROI</div>
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    6,266%
                  </div>
                  <div className="text-green-300/40 text-sm">
                    first year return
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-green-500/20">
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <BadgeCheck className="w-6 h-6 text-green-400" />
                  <span className="text-green-400 font-bold text-lg">
                    Paid off before your first client's plan is delivered.
                  </span>
                </div>
              </div>
            </div>
          </AnimatedSection>
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
                Everything In Enterprise
              </h2>
            </div>
          </AnimatedSection>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            {/* Professional includes */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-purple-400" />
                <span className="text-purple-300 font-semibold text-sm tracking-widest uppercase">
                  Everything in Professional
                </span>
              </div>
            </div>
            <ValueStackItem
              icon={Crown}
              label="Everything in Professional Plan"
              value="$13,500/yr"
              delay={0}
            />
            <ValueStackItem
              icon={InfinityIcon}
              label="Unlimited Clients"
              value="$5,000/yr"
              delay={0.04}
            />
            <ValueStackItem
              icon={Layers}
              label="Unlimited Meal Plans"
              value="$3,000/yr"
              delay={0.08}
            />
            <ValueStackItem
              icon={Globe}
              label="White-Label + Custom Domain"
              value="$3,000/yr"
              delay={0.12}
            />
            <ValueStackItem
              icon={Code2}
              label="API Access"
              value="$2,000/yr"
              delay={0.16}
            />
            <ValueStackItem
              icon={PackageOpen}
              label="Bulk Operations"
              value="$1,000/yr"
              delay={0.2}
            />
            <ValueStackItem
              icon={Salad}
              label="17 Meal Type Categories"
              value="$800/yr"
              delay={0.24}
            />
            <ValueStackItem
              icon={Download}
              label="All Export Formats (PDF, CSV, Excel)"
              value="$600/yr"
              delay={0.28}
            />
            <ValueStackItem
              icon={Headphones}
              label="Dedicated Support"
              value="$2,000/yr"
              delay={0.32}
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
                delay={0.36}
                isBonus
              />
              <ValueStackItem
                icon={BadgeCheck}
                label="Trainer Toolkit — 8 Professional Calculators"
                value="$297"
                delay={0.4}
                isBonus
              />
              <ValueStackItem
                icon={BookOpen}
                label="Marketing Vault — Email Scripts + Social Templates"
                value="$497"
                delay={0.44}
                isBonus
              />
              <ValueStackItem
                icon={CalendarDays}
                label="ALL Specialized Meal Plan Drops (12+/year)"
                value="$997"
                delay={0.48}
                isBonus
              />
              <ValueStackItem
                icon={Layout}
                label="Advanced Marketing Playbooks"
                value="$497"
                delay={0.52}
                isBonus
              />
              <ValueStackItem
                icon={Sparkles}
                label="Custom Protocol Request (1/year — we build it for you)"
                value="$1,997"
                delay={0.56}
                isBonus
              />
              <ValueStackItem
                icon={Building2}
                label="Team & Gym Marketing SOPs"
                value="$997"
                delay={0.6}
                isBonus
              />
              <ValueStackItem
                icon={Globe}
                label="White-Labeled Trainer Toolkit (embeddable on your domain)"
                value="$597"
                delay={0.64}
                isBonus
              />
            </div>

            {/* Business Vault Bonus — Enterprise Editions */}
            <div className="mt-6 pt-6 border-t border-purple-500/30">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  EvoFit Business Vault — 11 PDFs (Enterprise Editions)
                </span>
              </div>
              <ValueStackItem
                icon={TrendingUp}
                label="Revenue Playbooks — Accelerator + Client Acquisition + Pricing Guide"
                value="$1,297"
                delay={0.68}
                isBonus
              />
              <ValueStackItem
                icon={PenTool}
                label="Scripts & Protocols — Sales + Consultation + 90-Day Adherence"
                value="$897"
                delay={0.72}
                isBonus
              />
              <ValueStackItem
                icon={Users}
                label="Client Kits — Onboarding + Retention & Re-engagement"
                value="$697"
                delay={0.76}
                isBonus
              />
              <ValueStackItem
                icon={Salad}
                label="Meal Plan Launch Templates — Challenges + Seasonal + Group"
                value="$697"
                delay={0.8}
                isBonus
              />
              <ValueStackItem
                icon={Building2}
                label="Nutrition Business SOPs — 20 Standard Operating Procedures"
                value="$1,497"
                delay={0.84}
                isBonus
              />
              <ValueStackItem
                icon={DollarSign}
                label="Financial Pack — P&L Templates, Revenue Projections, Pricing Calculators"
                value="$997"
                delay={0.88}
                isBonus
              />
            </div>

            {/* Total */}
            <AnimatedSection delay={0.92}>
              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <div className="text-white/50 text-lg mb-2">
                  Total Package Value
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white/30 line-through mb-4">
                  $14,055
                </div>
                <div className="text-sm text-white/50 mb-2">YOUR PRICE</div>
                <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                  $399
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
          SECTION 5: ENTERPRISE FEATURES
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                Enterprise Power
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                Built for Teams That{" "}
                <span className="text-purple-400">Scale</span>
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Globe,
                title: "White-Label + Custom Domain",
                desc: "Your domain, your logo, your colors. Clients see your brand on every meal plan PDF and shareable link — never ours.",
              },
              {
                icon: Code2,
                title: "API Access (Coming Soon)",
                desc: "Programmatic access to your EvoFitMeals data — coming soon for Enterprise.",
              },
              {
                icon: PackageOpen,
                title: "Bulk Operations",
                desc: "Bulk assign meal plans across your entire client roster. Import up to 100 meal plan templates at once.",
              },
              {
                icon: Salad,
                title: "All 17 Meal Type Categories",
                desc: "Every meal type category unlocked — from standard meals to specialized nutritional profiles. Starter gets 5; Enterprise gets all 17.",
              },
              {
                icon: Headphones,
                title: "Direct Support",
                desc: "Get help when you're running a high-volume operation. Enterprise accounts have access to our support team.",
              },
              {
                icon: InfinityIcon,
                title: "Unlimited Clients",
                desc: "No caps. No per-client fees. Whether you have 50 clients or 500, your price is the same: $399. One time.",
              },
              {
                icon: Layers,
                title: "Unlimited Meal Plans",
                desc: "Generate as many meal plans as you need. No monthly generation limits, no throttling, no per-plan charges.",
              },
              {
                icon: Download,
                title: "All Export Formats",
                desc: "PDF, CSV, and Excel exports all unlocked. Starter gets PDF only. Professional adds CSV. Enterprise adds Excel for advanced data workflows.",
              },
              {
                icon: BarChart3,
                title: "Full Analytics Dashboard",
                desc: "Enhanced analytics across your entire client base. Track engagement, meal plan adoption rates, and client progress at scale.",
              },
            ].map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.05}>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300 h-full group">
                  <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center mb-4 group-hover:bg-purple-600/30 transition-colors">
                    <feature.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 leading-relaxed text-sm">
                    {feature.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6: GUARANTEE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
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
                Try EvoFitMeals Enterprise for 14 days with your full team. If
                it doesn't transform how your gym delivers nutrition — we'll
                refund every penny, no questions asked.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 font-semibold text-sm">
                  <Shield className="w-4 h-4" />
                  100% Risk-Free
                </div>
                <div className="inline-flex items-center gap-2 px-5 py-3 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  Priority Support Included
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7: FAQ
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
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
                Questions from Gym Owners
              </h2>
            </div>
          </AnimatedSection>

          <div className="space-y-4">
            <FAQItem
              question="What does 'white-label' actually mean?"
              answer="It means your clients never see 'EvoFitMeals' anywhere. Your logo, your colors, and your custom domain appear on every meal plan PDF and shareable link. It looks like you built the software yourself — because to your clients, you did."
            />
            <FAQItem
              question="I have 200+ clients. Can the system handle that?"
              answer="Absolutely. Enterprise has no client limits and no meal plan generation limits. Whether you're managing 50 clients or 500, your cost is the same: $399, once."
            />
            <FAQItem
              question="How does API access work?"
              answer="API access is on the Enterprise roadmap. Enterprise subscribers will get early access when it launches. Your subscription locks in that access at no extra cost."
            />
            <FAQItem
              question="What's the difference between Professional and Enterprise branding?"
              answer="Professional gives you logo upload and custom colors on your meal plan PDFs. Enterprise adds white-label mode (removes EvoFitMeals branding entirely) and lets you connect your own custom domain so client-facing links use your URL."
            />
            <FAQItem
              question="Can I upgrade from Professional to Enterprise later?"
              answer="Yes. You pay only the $100 difference between Professional ($299) and Enterprise ($399). All your clients, meal plans, and branding settings carry over seamlessly."
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 8: FINAL CTA
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#1a0a2e] to-[#0A0A0F]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-orange-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            {/* Enterprise badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-400/30 text-purple-300 text-sm font-bold mb-8">
              <Building2 className="w-4 h-4" />
              ENTERPRISE
            </div>

            <h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
            >
              Equip Your Entire Team.{" "}
              <span className="text-purple-400">One Payment.</span>
            </h2>
            <p className="text-xl text-white/60 mb-4 max-w-xl mx-auto">
              Unlimited clients. White-label branding. Your brand everywhere.
            </p>
            <p className="text-lg text-white/40 mb-10">
              Replace recurring subscription costs with a single $399 one-time
              investment.
            </p>

            <a
              href="/api/login"
              className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xl rounded-xl shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] transition-all duration-300 transform hover:scale-105"
            >
              Get Enterprise for $399
              <ArrowRight className="w-6 h-6" />
            </a>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                14-day money-back guarantee
              </div>
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                Direct support access
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
