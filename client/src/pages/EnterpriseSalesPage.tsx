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
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isBonus ? "bg-orange-500/20" : "bg-purple-600/30"}`}>
          <Icon className={`w-4 h-4 ${isBonus ? "text-orange-400" : "text-purple-400"}`} />
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
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "url(/marketing/hero-gym-owner.png)", backgroundSize: "cover", backgroundPosition: "center" }} />
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
            ENTERPRISE — FOR GYMS, TEAMS & AGENCIES
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
              Unlimited Trainers. White-Label Everything.
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
                "My 5 Trainers Were Each Paying{" "}
                <span className="text-red-400">Their Own Subscriptions</span>
                ..."
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="prose prose-invert prose-lg max-w-none space-y-6 text-white/70 leading-relaxed">
              <p>
                I own a gym with 5 personal trainers. Every one of them was
                paying for their own meal planning software. Different tools,
                different brands, different quality.
              </p>
              <p>
                When I finally added it all up, the gym was collectively spending{" "}
                <span className="text-red-400 font-bold">
                  $475 per month
                </span>{" "}
                on nutrition tools. That's{" "}
                <span className="text-red-400 font-bold">$5,700 per year</span>{" "}
                — and none of it was branded to our gym.
              </p>
              <p>
                Clients were getting meal plans from "Trainerize" and
                "MyFitnessPal" — not from{" "}
                <span className="text-white italic">our brand</span>.
              </p>
              <p className="text-white/50 italic border-l-2 border-purple-500/50 pl-6">
                "What if I could give every trainer access to one professional
                tool, branded to our gym, for less than what one trainer pays per
                month?"
              </p>
              <p>
                I consolidated everyone onto EvoFitMeals Enterprise.{" "}
                <span className="text-white font-semibold">$399. Once.</span>{" "}
                All 5 trainers. Unlimited clients. Our gym logo on every single
                meal plan.
              </p>
              <p>
                In the first month alone, we saved $76. By end of year one, we
                saved{" "}
                <span className="text-green-400 font-bold">$5,301</span>. And
                now every client sees our brand, not some third-party app.
              </p>
              <p className="text-xl text-white font-semibold">
                Enterprise isn't an expense. It's the last tool investment
                you'll ever make.
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
                <div className="text-3xl font-black text-white">5</div>
                <div className="text-white/50 text-sm mt-1">Trainers</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-3">
                  <UserCog className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">10</div>
                <div className="text-white/50 text-sm mt-1">Clients Each</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white">$50</div>
                <div className="text-white/50 text-sm mt-1">Per Plan</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-600/30 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-3xl font-black text-green-400">$2,500</div>
                <div className="text-green-300/50 text-sm mt-1">Monthly Revenue</div>
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
                  <div className="text-white/50 text-sm mb-1">Monthly Revenue</div>
                  <div className="text-3xl font-black text-green-400">$2,500</div>
                  <div className="text-green-300/40 text-sm">from nutrition services</div>
                </div>
                <div>
                  <div className="text-white/50 text-sm mb-1">ROI</div>
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                    6,266%
                  </div>
                  <div className="text-green-300/40 text-sm">first year return</div>
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
            <ValueStackItem icon={Crown} label="Everything in Professional Plan" value="$13,500/yr" delay={0} />
            <ValueStackItem icon={InfinityIcon} label="Unlimited Clients" value="$5,000/yr" delay={0.04} />
            <ValueStackItem icon={Layers} label="Unlimited Meal Plans" value="$3,000/yr" delay={0.08} />
            <ValueStackItem icon={Globe} label="White-Label + Custom Domain" value="$3,000/yr" delay={0.12} />
            <ValueStackItem icon={Users} label="Team Accounts" value="$1,500/yr" delay={0.16} />
            <ValueStackItem icon={Code2} label="API Access" value="$2,000/yr" delay={0.2} />
            <ValueStackItem icon={PackageOpen} label="Bulk Operations" value="$1,000/yr" delay={0.24} />
            <ValueStackItem icon={Salad} label="Specialized Protocols" value="$1,000/yr" delay={0.28} />
            <ValueStackItem icon={Headphones} label="Dedicated Support" value="$2,000/yr" delay={0.32} />

            {/* Bonuses */}
            <div className="mt-6 pt-6 border-t border-purple-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  FREE BONUSES
                </span>
              </div>
              <ValueStackItem icon={Timer} label="Custom Fasting Plans" value="$500/yr" delay={0.36} isBonus />
              <ValueStackItem icon={Sparkles} label="White-Glove Onboarding" value="$500/yr" delay={0.4} isBonus />
              <ValueStackItem icon={ImageIcon} label="Priority Image Generation" value="$500/yr" delay={0.44} isBonus />
            </div>

            {/* Total */}
            <AnimatedSection delay={0.5}>
              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <div className="text-white/50 text-lg mb-2">
                  Total Annual Value
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white/30 line-through mb-4">
                  $33,500/yr
                </div>
                <div className="text-sm text-white/50 mb-2">YOUR PRICE</div>
                <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                  $399
                </div>
                <div className="text-white/50 mt-2 text-lg">
                  One time. Not per year. <span className="font-bold text-white">Forever.</span>
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
                title: "White-Label Everything",
                desc: "Your domain, your logo, your colors. Clients see your brand — never ours. Full customization of PDFs, links, and the client portal.",
              },
              {
                icon: Users,
                title: "Team Accounts",
                desc: "Add unlimited trainers under one account. Each trainer gets their own login, client roster, and workspace — all managed by you.",
              },
              {
                icon: Code2,
                title: "API Access",
                desc: "Integrate meal planning into your existing systems. Our REST API lets you programmatically generate plans, manage clients, and pull data.",
              },
              {
                icon: PackageOpen,
                title: "Bulk Operations",
                desc: "Generate meal plans for 50 clients at once. Import/export client data in bulk. CSV uploads for rapid onboarding.",
              },
              {
                icon: Salad,
                title: "Specialized Protocols",
                desc: "Medical-grade dietary protocols including renal, cardiac, diabetic, pre/post-surgery, and pregnancy nutrition plans.",
              },
              {
                icon: Headphones,
                title: "Dedicated Support",
                desc: "Priority support with a dedicated account manager. Get help within hours, not days. Includes custom onboarding for your team.",
              },
              {
                icon: InfinityIcon,
                title: "Unlimited Clients",
                desc: "No caps. No per-client fees. Whether you have 50 clients or 5,000, your price is the same: $399.",
              },
              {
                icon: Layers,
                title: "Unlimited Meal Plans",
                desc: "Generate as many meal plans as you need. No monthly limits, no throttling, no per-plan charges.",
              },
              {
                icon: Timer,
                title: "Custom Fasting Plans",
                desc: "Intermittent fasting, OMAD, 5:2, and custom fasting windows. Fully integrated with meal timing and macro calculations.",
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
                  White-Glove Onboarding Included
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
              question="How many trainers can I add to one account?"
              answer="Unlimited. Enterprise includes unlimited team accounts. Each trainer gets their own login, client list, and workspace. You control everything from a central admin dashboard — add trainers, remove them, or reassign clients at any time."
            />
            <FAQItem
              question="What does 'white-label' actually mean?"
              answer="It means your clients never see 'EvoFitMeals' anywhere. Your gym name, your logo, your colors appear on every meal plan PDF, every client link, and every piece of communication. You can even use your own domain. It looks like you built the software yourself."
            />
            <FAQItem
              question="We have 200+ members. Can the system handle that?"
              answer="Absolutely. Enterprise has no client limits, no plan generation limits, and no throttling. Whether you're generating 10 plans or 10,000 plans per month, your cost is the same: $399, once. Our infrastructure scales to handle any volume."
            />
            <FAQItem
              question="How does the API work?"
              answer="Our REST API gives you programmatic access to everything — client management, meal plan generation, recipe data, and exports. Documentation and examples are included. Common use cases: integrating with your gym management software, building custom client portals, or automating plan delivery."
            />
            <FAQItem
              question="What's included in white-glove onboarding?"
              answer="A dedicated onboarding specialist will help your team get set up. This includes: importing your existing client data, configuring your brand settings, training your trainers on the platform, setting up team accounts, and a 30-day check-in to ensure everything is running smoothly."
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
              Unlimited trainers. Unlimited clients. Your brand everywhere.
            </p>
            <p className="text-lg text-white/40 mb-10">
              Replace $5,700+/year in team subscriptions with a single $399 investment.
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
                <Sparkles className="w-4 h-4" />
                White-glove onboarding
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
