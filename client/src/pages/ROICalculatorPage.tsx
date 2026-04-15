import { useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import {
  ChefHat,
  Calculator,
  DollarSign,
  Clock,
  TrendingUp,
  Zap,
} from "lucide-react";

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
              href="/comparison"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Compare
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
   Types & constants
   ────────────────────────────────────────────── */
const CLIENT_OPTIONS = [
  { label: "1–5 clients", value: 3 },
  { label: "6–15 clients", value: 10 },
  { label: "16–30 clients", value: 23 },
  { label: "30+ clients", value: 35 },
];

const HOURLY_RATES = [
  { label: "$50/hr", value: 50 },
  { label: "$75/hr", value: 75 },
  { label: "$100/hr", value: 100 },
  { label: "$125/hr", value: 125 },
  { label: "$150/hr", value: 150 },
  { label: "$200/hr", value: 200 },
];

const PLAN_OPTIONS = [
  { label: "Starter — $199", value: 199 },
  { label: "Professional — $299", value: 299 },
  { label: "Enterprise — $399", value: 399 },
];

interface Results {
  weeklyTimeCost: number;
  annualTimeCost: number;
  planCost: number;
  breakEvenWeeks: number;
  oneYearSavings: number;
  fiveYearSavings: number;
}

function formatCurrency(n: number): string {
  if (n < 0) return `-$${Math.abs(n).toLocaleString()}`;
  return `$${Math.round(n).toLocaleString()}`;
}

/* ──────────────────────────────────────────────
   Result card
   ────────────────────────────────────────────── */
function ResultCard({
  icon: Icon,
  label,
  value,
  highlight = false,
  suffix = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  suffix?: string;
}) {
  return (
    <div
      className={`rounded-xl p-5 border transition-all duration-300 ${
        highlight
          ? "bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10"
          : "bg-gray-900/80 backdrop-blur border-purple-500/20"
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            highlight ? "bg-orange-500/20" : "bg-purple-500/10"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${highlight ? "text-orange-400" : "text-purple-400"}`}
          />
        </div>
        <span className="text-sm text-gray-400 font-medium">{label}</span>
      </div>
      <div
        className={`text-2xl font-bold ${highlight ? "text-orange-400" : "text-white"}`}
        style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
      >
        {value}
        {suffix && (
          <span className="text-sm font-normal text-gray-400 ml-1">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function ROICalculatorPage() {
  const [clientIndex, setClientIndex] = useState(1);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [hourlyRateIndex, setHourlyRateIndex] = useState(1);
  const [planIndex, setPlanIndex] = useState(0);
  const [results, setResults] = useState<Results | null>(null);
  const [calculated, setCalculated] = useState(false);

  const hourlyRate = HOURLY_RATES[hourlyRateIndex].value;
  const planCost = PLAN_OPTIONS[planIndex].value;

  function calculate() {
    const weeklyTimeCost = hoursPerWeek * hourlyRate;
    const annualTimeCost = weeklyTimeCost * 52;
    const breakEvenWeeks = planCost / weeklyTimeCost;
    const oneYearSavings = annualTimeCost - planCost;
    const fiveYearSavings = annualTimeCost * 5 - planCost;

    setResults({
      weeklyTimeCost,
      annualTimeCost,
      planCost,
      breakEvenWeeks,
      oneYearSavings,
      fiveYearSavings,
    });
    setCalculated(true);
  }

  return (
    <>
      <link rel="stylesheet" href={FONT_LINK} />
      <div
        className="min-h-screen bg-[#0A0A0F] text-white"
        style={{ fontFamily: "Satoshi, Inter, sans-serif" }}
      >
        <Navbar />

        {/* ── HERO ── */}
        <section className="relative pt-32 pb-16 px-4 bg-gradient-to-br from-purple-950 via-gray-950 to-gray-950 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-semibold mb-6"
            >
              <Calculator className="w-4 h-4" />
              ROI Calculator
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold leading-tight mb-4"
              style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
            >
              How Much Will You{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-500">
                Save?
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-400 text-lg"
            >
              Calculate your exact return on investment based on your current
              pricing and workflow.
            </motion.p>
          </div>
        </section>

        {/* ── CALCULATOR ── */}
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto">
            <Reveal>
              <div className="bg-gray-900/80 backdrop-blur border border-purple-500/20 rounded-2xl p-8">
                <h2
                  className="text-xl font-bold text-white mb-8"
                  style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
                >
                  Your Business Profile
                </h2>

                <div className="space-y-7">
                  {/* Clients served */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Clients you serve
                    </label>
                    <select
                      value={clientIndex}
                      onChange={(e) => setClientIndex(Number(e.target.value))}
                      className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {CLIENT_OPTIONS.map((opt, i) => (
                        <option key={opt.label} value={i}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Hours per week */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-300">
                        Hours/week spent on meal plans
                      </label>
                      <span
                        className="text-orange-400 font-bold text-lg"
                        style={{
                          fontFamily: "'Clash Display', Outfit, sans-serif",
                        }}
                      >
                        {hoursPerWeek}h
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #f97316 ${((hoursPerWeek - 1) / 19) * 100}%, #374151 ${((hoursPerWeek - 1) / 19) * 100}%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1h</span>
                      <span>20h</span>
                    </div>
                  </div>

                  {/* Hourly rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Your hourly rate
                    </label>
                    <select
                      value={hourlyRateIndex}
                      onChange={(e) =>
                        setHourlyRateIndex(Number(e.target.value))
                      }
                      className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {HOURLY_RATES.map((opt, i) => (
                        <option key={opt.label} value={i}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Plan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      EvoFitMeals plan
                    </label>
                    <select
                      value={planIndex}
                      onChange={(e) => setPlanIndex(Number(e.target.value))}
                      className="w-full bg-[#111118] border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {PLAN_OPTIONS.map((opt, i) => (
                        <option key={opt.label} value={i}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Calculate button */}
                  <button
                    onClick={calculate}
                    className="w-full bg-orange-500 hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] text-white font-bold text-lg py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                    style={{
                      fontFamily: "'Clash Display', Outfit, sans-serif",
                    }}
                  >
                    <Calculator className="w-5 h-5" />
                    Calculate My ROI
                  </button>
                </div>
              </div>
            </Reveal>

            {/* ── RESULTS PANEL ── */}
            {calculated && results && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="mt-8"
              >
                <h2
                  className="text-2xl font-bold text-white mb-6 text-center"
                  style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
                >
                  Your ROI Breakdown
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <ResultCard
                    icon={Clock}
                    label="Weekly time cost (before EvoFit)"
                    value={formatCurrency(results.weeklyTimeCost)}
                    suffix="/ week"
                  />
                  <ResultCard
                    icon={DollarSign}
                    label="Annual time cost (before EvoFit)"
                    value={formatCurrency(results.annualTimeCost)}
                    suffix="/ year"
                  />
                  <ResultCard
                    icon={Zap}
                    label="EvoFitMeals plan cost"
                    value={formatCurrency(results.planCost)}
                    suffix="one-time"
                  />
                  <ResultCard
                    icon={TrendingUp}
                    label="Break-even point"
                    value={`${Math.ceil(results.breakEvenWeeks)}`}
                    suffix="weeks"
                  />
                </div>

                {/* Big savings numbers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ResultCard
                    icon={DollarSign}
                    label="1-year savings"
                    value={formatCurrency(results.oneYearSavings)}
                    highlight={true}
                  />
                  <ResultCard
                    icon={TrendingUp}
                    label="5-year savings"
                    value={formatCurrency(results.fiveYearSavings)}
                    highlight={true}
                  />
                </div>

                {/* CTA */}
                <div className="mt-8 text-center">
                  <p className="text-gray-400 mb-4 text-sm">
                    Ready to reclaim those hours and savings?
                  </p>
                  <a href="/get-started">
                    <button
                      className="bg-orange-500 hover:bg-orange-600 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] text-white font-bold text-lg px-8 py-4 rounded-xl transition-all duration-200"
                      style={{
                        fontFamily: "'Clash Display', Outfit, sans-serif",
                      }}
                    >
                      Start Free Trial
                    </button>
                  </a>
                  <p className="mt-3 text-xs text-gray-500">
                    🛡️ 14-day money-back guarantee · No credit card required
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-16 px-4 bg-gradient-to-br from-purple-950/10 via-gray-950 to-gray-950">
          <div className="max-w-4xl mx-auto">
            <Reveal>
              <h2
                className="text-2xl md:text-3xl font-bold text-center mb-10 text-gray-300"
                style={{ fontFamily: "'Clash Display', Outfit, sans-serif" }}
              >
                How the ROI is Calculated
              </h2>
            </Reveal>

            <Reveal>
              <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-6 text-sm text-gray-400 space-y-3">
                <p>
                  <span className="text-purple-300 font-semibold">
                    Weekly time cost
                  </span>{" "}
                  = Hours per week × Your hourly rate
                </p>
                <p>
                  <span className="text-purple-300 font-semibold">
                    Annual time cost
                  </span>{" "}
                  = Weekly time cost × 52 weeks
                </p>
                <p>
                  <span className="text-purple-300 font-semibold">
                    Break-even point
                  </span>{" "}
                  = Plan cost ÷ Weekly time cost saved
                </p>
                <p>
                  <span className="text-orange-400 font-semibold">
                    1-year savings
                  </span>{" "}
                  = Annual time cost − Plan cost
                </p>
                <p>
                  <span className="text-orange-400 font-semibold">
                    5-year savings
                  </span>{" "}
                  = (Annual time cost × 5) − Plan cost
                </p>
                <p className="text-gray-500 text-xs pt-2">
                  Note: This calculator estimates the value of time reclaimed
                  using AI-assisted meal plan generation versus manual creation.
                  Actual time savings vary by workflow.
                </p>
              </div>
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
                href="/comparison"
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Compare
              </a>
              <a
                href="/pricing"
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                Pricing
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
