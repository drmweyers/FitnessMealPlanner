import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
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
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  delay?: number;
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
        <div className="w-8 h-8 rounded-lg bg-purple-600/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-purple-400" />
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

export default function StarterSalesPage() {
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
            backgroundImage: "url(/marketing/hero-trainer.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            STARTER PLAN — FOR NEW TRAINERS
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] mb-6 tracking-tight"
            style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
          >
            Launch Your Nutrition Business{" "}
            <span className="bg-gradient-to-r from-purple-400 via-purple-500 to-orange-400 bg-clip-text text-transparent">
              for Less Than a Week of Groceries
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg sm:text-xl md:text-2xl text-white/70 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Everything you need to start serving nutrition clients — for a
            one-time investment of{" "}
            <span className="text-white font-bold">$199</span>
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
              Get Starter for $199
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
                My Story
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4 leading-tight"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                "I Remember When I Got My{" "}
                <span className="text-purple-400">First Nutrition Client</span>
                ..."
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="prose prose-invert prose-lg max-w-none space-y-6 text-white/70 leading-relaxed">
              <p>
                I was a brand-new personal trainer. I had my first client who
                trusted me enough to ask, "Can you help me with my nutrition
                too?"
              </p>
              <p>
                I said yes — because that's what you do when you're building a
                business. You say yes.
              </p>
              <p>
                Then reality hit. I spent{" "}
                <span className="text-white font-semibold">
                  6 hours that weekend
                </span>{" "}
                researching recipes, calculating macros, building a meal plan in
                Google Sheets, and formatting it into a PDF that still looked
                amateur.
              </p>
              <p>
                My client paid me $100 for that plan. After the hours I put in,
                I was making less than minimum wage. And I had to do it again
                next week.
              </p>
              <p className="text-white/50 italic border-l-2 border-purple-500/50 pl-6">
                "There has to be a better way," I thought. "I can't spend 6
                hours per client per week on meal plans and still train people."
              </p>
              <p>
                That's when I discovered what AI could do for nutrition
                planning. Within a week, I built a system that could generate
                professionally designed, macro-calculated meal plans in{" "}
                <span className="text-purple-400 font-semibold">
                  under 2 minutes
                </span>
                .
              </p>
              <p>
                I went from 1 nutrition client to 9 in the first month.{" "}
                <span className="text-white font-semibold">
                  Same hours. Ten times the output.
                </span>
              </p>
              <p className="text-xl text-white font-semibold">
                That system became EvoFitMeals. And now it's yours.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3: VALUE STACK SLIDE
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
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
                Here's Everything You Get
              </h2>
            </div>
          </AnimatedSection>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
            <ValueStackItem
              icon={Zap}
              label="AI Meal Plan Generation"
              value="$2,000/yr"
              delay={0}
            />
            <ValueStackItem
              icon={Users}
              label="9 Client Slots"
              value="$500/yr"
              delay={0.05}
            />
            <ValueStackItem
              icon={FileText}
              label="PDF Exports"
              value="$300/yr"
              delay={0.1}
            />
            <ValueStackItem
              icon={ShoppingCart}
              label="Auto Grocery Lists"
              value="$200/yr"
              delay={0.15}
            />
            <ValueStackItem
              icon={TrendingUp}
              label="Progress Tracking"
              value="$400/yr"
              delay={0.2}
            />
            <ValueStackItem
              icon={LinkIcon}
              label="Shareable Links"
              value="$300/yr"
              delay={0.25}
            />
            <ValueStackItem
              icon={Salad}
              label="8+ Dietary Protocols"
              value="$500/yr"
              delay={0.3}
            />
            <ValueStackItem
              icon={PenTool}
              label="Manual Plan Creation"
              value="$200/yr"
              delay={0.35}
            />
            <ValueStackItem
              icon={BookOpen}
              label="Meal Prep Guides"
              value="$300/yr"
              delay={0.4}
            />

            {/* Bonus */}
            <div className="mt-6 pt-6 border-t border-purple-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  FREE BONUS
                </span>
              </div>
              <ValueStackItem
                icon={ImageIcon}
                label="Recipe Image Library"
                value="$500/yr"
                delay={0.45}
              />
            </div>

            {/* Total */}
            <AnimatedSection delay={0.5}>
              <div className="mt-8 pt-8 border-t border-white/20 text-center">
                <div className="text-white/50 text-lg mb-2">
                  Total Annual Value
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white/30 line-through mb-4">
                  $5,200/yr
                </div>
                <div className="text-sm text-white/50 mb-2">YOUR PRICE</div>
                <div className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                  $199
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
          SECTION 4: ROI CALCULATOR
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                The Math Doesn't Lie
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                Paid Off In <span className="text-green-400">Month One</span>
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white mb-2">2</div>
                <div className="text-white/60">Nutrition Clients</div>
              </div>

              {/* Step 2 */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-purple-600/30 flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-7 h-7 text-purple-400" />
                </div>
                <div className="text-3xl font-black text-white mb-2">
                  $100
                  <span className="text-lg font-normal text-white/50">
                    /mo each
                  </span>
                </div>
                <div className="text-white/60">Per Client Revenue</div>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-green-600/30 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-7 h-7 text-green-400" />
                </div>
                <div className="text-3xl font-black text-green-400 mb-2">
                  $200
                </div>
                <div className="text-white/60">Month 1 Revenue</div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 px-8 py-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <BadgeCheck className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-bold text-lg">
                  $199 investment paid off in Month 1. Everything after is pure
                  profit.
                </span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5: WHAT'S INCLUDED
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#120a20] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-purple-400 font-semibold text-sm tracking-widest uppercase">
                Features
              </span>
              <h2
                className="text-3xl sm:text-4xl md:text-5xl font-black mt-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                What's Inside Your Starter Plan
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "AI Meal Plan Generation",
                desc: "Generate complete, macro-calculated meal plans in under 2 minutes with our AI engine.",
              },
              {
                icon: Users,
                title: "9 Client Slots",
                desc: "Manage up to 9 nutrition clients with individual profiles, preferences, and goals.",
              },
              {
                icon: FileText,
                title: "PDF Exports",
                desc: "Export beautiful, branded PDF meal plans your clients will love showing off.",
              },
              {
                icon: ShoppingCart,
                title: "Auto Grocery Lists",
                desc: "Every meal plan automatically generates a consolidated grocery list. No manual work.",
              },
              {
                icon: TrendingUp,
                title: "Progress Tracking",
                desc: "Monitor client adherence and progress over time with built-in tracking tools.",
              },
              {
                icon: Salad,
                title: "8+ Dietary Protocols",
                desc: "Keto, vegan, paleo, Mediterranean, gluten-free, and more — all built in.",
              },
              {
                icon: PenTool,
                title: "Manual Plan Creation",
                desc: "Want full control? Build plans manually with our drag-and-drop meal builder.",
              },
              {
                icon: BookOpen,
                title: "Meal Prep Guides",
                desc: "Step-by-step prep instructions so your clients actually follow through.",
              },
              {
                icon: ImageIcon,
                title: "Recipe Image Library",
                desc: "Every recipe comes with a professional food photo. No stock photo hunting.",
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
                Try EvoFitMeals Starter for 14 days. If you don't love it — if
                it doesn't save you hours every week — email us and we'll refund
                every penny. No questions. No hassle. No risk.
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
                Got Questions?
              </h2>
            </div>
          </AnimatedSection>

          <div className="space-y-4">
            <FAQItem
              question="I'm brand new to nutrition coaching. Is this for me?"
              answer="Absolutely. EvoFitMeals was built for trainers who want to add nutrition services without spending hours on meal planning. Our AI handles the heavy lifting — you just customize and deliver. No nutrition degree required."
            />
            <FAQItem
              question="What does 'one-time payment' mean? Are there hidden fees?"
              answer="It means exactly what it says. You pay $199 once and you own access to the Starter plan forever. No monthly fees, no annual renewals, no hidden charges. The only optional cost is if you decide to upgrade to Professional or Enterprise later."
            />
            <FAQItem
              question="Can I really manage 9 clients with this?"
              answer="Yes. Each client gets their own profile with dietary preferences, allergies, goals, and history. You can generate a full week of meal plans for each client in minutes, not hours."
            />
            <FAQItem
              question="What if I outgrow 9 clients?"
              answer="That's a great problem to have! You can upgrade to Professional (20 clients) or Enterprise (unlimited) at any time. You'll only pay the difference, and your existing data transfers seamlessly."
            />
            <FAQItem
              question="How is this different from MyFitnessPal or other apps?"
              answer="Those are consumer apps. EvoFitMeals is a professional tool built for trainers who serve clients. You get branded PDFs, client management, AI meal generation, and grocery lists — all designed to make you look professional and save you time."
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 8: UPSELL TO PROFESSIONAL
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#0d0d1a] to-[#0A0A0F]" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-purple-600/10 border border-purple-500/30 rounded-2xl p-8 sm:p-10">
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-bold text-sm tracking-widest uppercase">
                  Growing Fast? Consider Professional
                </span>
              </div>
              <h3
                className="text-2xl sm:text-3xl font-black text-white mb-4"
                style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
              >
                When You Hit 9 Clients, the Next Step Is $100
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Professional unlocks 20 clients, custom branding on your PDFs,
                seasonal recipes, natural language AI input, and priority
                support. You pay the $100 difference — your data transfers
                instantly.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
                {[
                  "20 client slots (vs 9 on Starter)",
                  "Custom logo + brand colors on PDFs",
                  "Complete + seasonal recipe library",
                  "Natural language AI meal generation",
                  "CSV + PDF analytics reports",
                  "Priority support",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-white/70"
                  >
                    <Check className="w-4 h-4 text-purple-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <a
                href="/professional"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600/30 border border-purple-500/40 hover:bg-purple-600/50 text-purple-200 font-semibold rounded-lg transition-all duration-200"
              >
                See Professional Plan — $299
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 9: FINAL CTA
          ════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#1a0a2e] to-[#0A0A0F]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/15 rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
              style={{ fontFamily: "'Clash Display', 'Satoshi', sans-serif" }}
            >
              Ready to Launch Your{" "}
              <span className="text-purple-400">Nutrition Business</span>?
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto">
              One payment. No subscriptions. Start serving clients today.
            </p>

            <a
              href="/api/login"
              className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xl rounded-xl shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] transition-all duration-300 transform hover:scale-105"
            >
              Get Starter for $199
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
