import { useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import { Check, X, ChefHat, TrendingDown, Users, Zap } from "lucide-react";

/* ──────────────────────────────────────────────
   Font injection
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

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ──────────────────────────────────────────────
   ScrollReveal wrapper
   ────────────────────────────────────────────── */
function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
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
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   NAVBAR
   ────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0A0A0F]/95 backdrop-blur-md shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/get-started" className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            <span
              className="font-bold text-xl text-white"
              style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
            >
              EvoFit Meals
            </span>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="/get-started"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="/pricing"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <a
              href="/roi-calculator"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              ROI Calculator
            </a>
          </div>

          {/* CTA */}
          <a href="/get-started">
            <button
              className="bg-orange-500 hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] text-white font-semibold text-sm px-5 py-2 rounded-lg transition-all duration-200"
              style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
            >
              Get Started
            </button>
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ──────────────────────────────────────────────
   Data
   ────────────────────────────────────────────── */
const competitors = [
  {
    name: "EvoFitMeals",
    price: "From $199",
    priceDetail: "One-time payment • Lifetime access",
    isWinner: true,
    badge: "BEST VALUE",
    savings: "Save $2,161 vs Foodzilla over 10 years",
    features: [
      "Unlimited clients",
      "AI meal generation",
      "Branded PDFs",
      "Progress tracking",
      "No monthly fees",
    ],
  },
  {
    name: "Foodzilla",
    price: "$18/mo",
    priceDetail: "$216/yr • $2,160 over 10 years",
    isWinner: false,
    badge: null,
    savings: null,
    features: [
      "5 clients Starter",
      "Template-based",
      "Branded PDFs",
      "Basic tracking",
      "Monthly fees forever",
    ],
  },
  {
    name: "Eat This Much",
    price: "$9/mo",
    priceDetail: "$108/yr • $1,080 over 10 years",
    isWinner: false,
    badge: null,
    savings: null,
    features: [
      "Individual focus",
      "AI meal planning",
      "Generic PDFs",
      "No client management",
      "Not built for trainers",
    ],
  },
  {
    name: "Strongr Fastr",
    price: "$13/mo",
    priceDetail: "$156/yr • $1,560 over 10 years",
    isWinner: false,
    badge: null,
    savings: null,
    features: [
      "Individual focus",
      "AI meal planning",
      "No PDF export",
      "No client management",
      "Bodybuilding-focused",
    ],
  },
];

type CellValue = string | boolean;

const tableFeatures: { label: string; values: CellValue[] }[] = [
  {
    label: "Pricing Model",
    values: [
      "One-time ($199-$399)",
      "Monthly ($18)",
      "Monthly ($9)",
      "Monthly ($13)",
    ],
  },
  {
    label: "10-Year Cost",
    values: ["$199-$399", "$2,160", "$1,080", "$1,560"],
  },
  {
    label: "AI Meal Generation",
    values: ["Advanced", false, "Basic", "Basic"],
  },
  {
    label: "Client Management",
    values: ["Unlimited", "5-Unlimited", false, false],
  },
  {
    label: "Progress Tracking",
    values: ["Photos + Measurements", "Basic", false, false],
  },
  { label: "PDF Export", values: ["Branded", "Branded", "Generic", false] },
  {
    label: "Grocery Lists",
    values: ["Auto-generated", true, true, true],
  },
  {
    label: "Target User",
    values: ["Fitness Trainers", "Nutritionists", "Individuals", "Individuals"],
  },
  {
    label: "Learning Curve",
    values: ["15 minutes", "30+ minutes", "10 minutes", "10 minutes"],
  },
  {
    label: "Free Trial",
    values: ["14 days", "1 client", false, false],
  },
];

const savingsStats = [
  { label: "vs Foodzilla", amount: "$2,161" },
  { label: "vs Strongr Fastr", amount: "$1,361" },
  { label: "vs Eat This Much", amount: "$881" },
  { label: "Break Even", amount: "11 months" },
];

const whyChooseCards = [
  {
    icon: TrendingDown,
    title: "No Subscription Fatigue",
    desc: "Pay once. Use forever. No recurring charges, no surprise price hikes, no cancellation anxiety.",
  },
  {
    icon: Users,
    title: "Built for Trainers",
    desc: "Unlike individual-focused apps, every feature is designed around a trainer's workflow and client relationships.",
  },
  {
    icon: Zap,
    title: "Better AI Technology",
    desc: "Powered by OpenAI's latest models for smarter meal generation that adapts to each client's unique needs.",
  },
];

/* ──────────────────────────────────────────────
   Cell renderer for the comparison table
   ────────────────────────────────────────────── */
function TableCell({ value, isFirst }: { value: CellValue; isFirst: boolean }) {
  if (value === false) {
    return (
      <td
        className={`px-4 py-3 text-center text-sm ${isFirst ? "bg-purple-950/30" : ""}`}
      >
        <X className="w-4 h-4 text-red-400 mx-auto" />
      </td>
    );
  }
  if (value === true) {
    return (
      <td
        className={`px-4 py-3 text-center text-sm ${isFirst ? "bg-purple-950/30" : ""}`}
      >
        <Check className="w-4 h-4 text-green-400 mx-auto" />
      </td>
    );
  }
  return (
    <td
      className={`px-4 py-3 text-center text-sm ${
        isFirst
          ? "bg-purple-950/30 text-purple-300 font-medium"
          : "text-gray-400"
      }`}
    >
      {isFirst ? (
        <span className="flex items-center justify-center gap-1">
          <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
          {value}
        </span>
      ) : (
        value
      )}
    </td>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function ComparisonPage() {
  return (
    <>
      <link rel="stylesheet" href={FONT_LINK} />
      <div
        className="min-h-screen bg-[#0A0A0F] text-white"
        style={{ fontFamily: "Satoshi, Inter, sans-serif" }}
      >
        <Navbar />

        {/* ── HERO ── */}
        <section className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-purple-950 via-gray-950 to-gray-950 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-semibold mb-6"
            >
              💰 Save $2,000+ Over 10 Years
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold leading-tight mb-6"
              style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
            >
              EvoFitMeals{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-orange-400">
                vs Competitors
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto"
            >
              See why thousands of fitness trainers choose EvoFitMeals over
              monthly subscription software. Same features. Better price.
              Forever.
            </motion.p>
          </div>
        </section>

        {/* ── AT A GLANCE ── */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <h2
                className="text-3xl md:text-4xl font-bold text-center mb-12"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                At a Glance
              </h2>
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {competitors.map((c) => (
                <motion.div
                  key={c.name}
                  variants={fadeUp}
                  className={`relative rounded-xl p-6 border transition-all duration-300 ${
                    c.isWinner
                      ? "bg-gray-900/80 backdrop-blur border-purple-500/40 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/20"
                      : "bg-[#111118] border-gray-800/60"
                  }`}
                >
                  {c.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        {c.badge}
                      </span>
                    </div>
                  )}

                  <h3
                    className={`text-lg font-bold mb-1 ${c.isWinner ? "text-white" : "text-gray-300"}`}
                    style={{
                      fontFamily: "'Clash Display', Outfit, sans-serif",
                    }}
                  >
                    {c.name}
                  </h3>

                  <div
                    className={`text-2xl font-bold mb-1 ${c.isWinner ? "text-orange-400" : "text-gray-400"}`}
                    style={{
                      fontFamily: "'Clash Display', Outfit, sans-serif",
                    }}
                  >
                    {c.price}
                  </div>

                  <p className="text-xs text-gray-500 mb-3">{c.priceDetail}</p>

                  {c.savings && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-orange-300 font-semibold mb-4">
                      {c.savings}
                    </div>
                  )}

                  <ul className="space-y-2">
                    {c.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        {c.isWinner ? (
                          <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        ) : (
                          <span className="text-gray-500 mt-0.5">•</span>
                        )}
                        <span
                          className={
                            c.isWinner ? "text-gray-200" : "text-gray-400"
                          }
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── FEATURE TABLE ── */}
        <section className="py-20 px-4 bg-gradient-to-b from-transparent to-purple-950/10">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <h2
                className="text-3xl md:text-4xl font-bold text-center mb-12"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                Full Feature Comparison
              </h2>
            </Reveal>

            <Reveal>
              <div className="overflow-x-auto rounded-xl border border-purple-500/20">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-[#111118]">
                      <th className="px-4 py-4 text-left text-sm font-semibold text-gray-400">
                        Feature
                      </th>
                      {competitors.map((c) => (
                        <th
                          key={c.name}
                          className={`px-4 py-4 text-center text-sm font-semibold ${
                            c.isWinner
                              ? "text-purple-300 bg-purple-950/30"
                              : "text-gray-400"
                          }`}
                          style={{
                            fontFamily: "'Clash Display', Outfit, sans-serif",
                          }}
                        >
                          {c.name}
                          {c.isWinner && (
                            <span className="ml-2 text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                              Best
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {tableFeatures.map((row, i) => (
                      <tr
                        key={row.label}
                        className={
                          i % 2 === 0 ? "bg-[#0A0A0F]" : "bg-[#111118]/60"
                        }
                      >
                        <td className="px-4 py-3 text-sm text-gray-300 font-medium whitespace-nowrap">
                          {row.label}
                        </td>
                        {row.values.map((val, vi) => (
                          <TableCell key={vi} value={val} isFirst={vi === 0} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── SAVINGS ── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <h2
                className="text-3xl md:text-4xl font-bold text-center mb-4"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                Your Long-Term Savings
              </h2>
              <p className="text-center text-gray-400 mb-12">
                Based on 10-year cost comparison starting with the Starter plan
                ($199)
              </p>
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {savingsStats.map((s) => (
                <motion.div
                  key={s.label}
                  variants={fadeUp}
                  className="bg-gray-900/80 backdrop-blur border border-purple-500/20 rounded-xl p-6 text-center"
                >
                  <div
                    className="text-3xl md:text-4xl font-bold text-orange-400 mb-2"
                    style={{
                      fontFamily: "'Clash Display', Outfit, sans-serif",
                    }}
                  >
                    {s.amount}
                  </div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── WHY TRAINERS CHOOSE ── */}
        <section className="py-20 px-4 bg-gradient-to-br from-purple-950/20 via-gray-950 to-gray-950">
          <div className="max-w-5xl mx-auto">
            <Reveal>
              <h2
                className="text-3xl md:text-4xl font-bold text-center mb-12"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                Why Trainers Choose EvoFitMeals
              </h2>
            </Reveal>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {whyChooseCards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    variants={fadeUp}
                    className="bg-gray-900/80 backdrop-blur border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all duration-300"
                  >
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3
                      className="text-lg font-bold text-white mb-2"
                      style={{
                        fontFamily: "'Clash Display', Outfit, sans-serif",
                      }}
                    >
                      {card.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {card.desc}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-24 px-4 bg-gradient-to-br from-purple-950 via-gray-950 to-gray-950">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <h2
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                Ready to Save{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
                  $2,000+?
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-10">
                Join thousands of trainers who switched from monthly
                subscriptions and never looked back.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/get-started">
                  <button
                    className="bg-orange-500 hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-200"
                    style={{
                      fontFamily: "'Clash Display', Outfit, sans-serif",
                    }}
                  >
                    Get Started — From $199
                  </button>
                </a>
                <a
                  href="/roi-calculator"
                  className="text-purple-400 hover:text-purple-300 font-semibold text-lg transition-colors"
                >
                  Calculate Your ROI →
                </a>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                🛡️ 14-day money-back guarantee · No contracts · Lifetime access
              </p>
            </Reveal>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-gray-800/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-orange-500" />
              <span
                className="font-bold text-white"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                EvoFit Meals
              </span>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} EvoFit Meals. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="/get-started"
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Features
              </a>
              <a
                href="/pricing"
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Pricing
              </a>
              <a
                href="/roi-calculator"
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ROI Calculator
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
