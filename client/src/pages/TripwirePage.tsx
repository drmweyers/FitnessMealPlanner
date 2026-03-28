import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Leaf,
  Flame,
  Wheat,
  Apple,
  Fish,
  Beef,
  Salad,
  MilkOff,
  UtensilsCrossed,
  ShoppingCart,
  FileText,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

const includedItems = [
  "50 complete 7-day meal plan templates",
  "All 8 dietary protocols covered (vegan, keto, gluten-free, paleo, Mediterranean, high-protein, low-carb, dairy-free)",
  "Macros calculated and validated by AI",
  "Grocery lists included for every plan",
  "Print-ready PDF format",
];

const templateCovers = [
  { name: "Vegan", icon: Leaf, color: "from-green-600 to-green-800" },
  { name: "Keto", icon: Flame, color: "from-red-600 to-red-800" },
  { name: "Gluten-Free", icon: Wheat, color: "from-amber-600 to-amber-800" },
  { name: "Paleo", icon: Apple, color: "from-orange-600 to-orange-800" },
  { name: "Mediterranean", icon: Fish, color: "from-blue-600 to-blue-800" },
  { name: "High-Protein", icon: Beef, color: "from-purple-600 to-purple-800" },
];

function useCountdown(initialMinutes: number) {
  const [totalSeconds, setTotalSeconds] = useState(initialMinutes * 60);

  useEffect(() => {
    if (totalSeconds <= 0) return;
    const interval = setInterval(() => {
      setTotalSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    expired: totalSeconds <= 0,
  };
}

export default function TripwirePage() {
  const countdown = useCountdown(15);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Urgency Bar */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 shadow-lg shadow-red-900/30">
        <div className="max-w-5xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-200 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wide text-white uppercase">
              One-Time Offer — This page will not be shown again
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1">
            <Clock className="w-4 h-4 text-yellow-200" />
            <span className="font-mono text-lg sm:text-xl font-extrabold tabular-nums text-white">
              {countdown.minutes}:{countdown.seconds}
            </span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/60 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/10 via-transparent to-transparent" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-8 sm:pb-12 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 text-sm font-medium tracking-wide">
              <Zap className="w-4 h-4" />
              WAIT! Special One-Time Offer
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="mt-6 sm:mt-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            Get 50 Done-For-You Meal Plan Templates —{" "}
            <span className="bg-gradient-to-r from-orange-400 to-orange-300 bg-clip-text text-transparent">
              Ready to Assign to Clients Today
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            You just got the blueprint. Now get the templates to{" "}
            <span className="text-white font-semibold">
              put it into action immediately.
            </span>
          </motion.p>
        </div>
      </section>

      {/* What's Included */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.h2
            className="text-xl sm:text-2xl font-bold mb-8 text-center text-white"
            custom={0}
            variants={fadeUp}
          >
            Everything That's Included
          </motion.h2>

          <div className="max-w-xl mx-auto space-y-4">
            {includedItems.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/50 border border-gray-800/60"
                custom={i + 1}
                variants={fadeUp}
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  {item}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Value Anchoring */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <motion.div
            className="text-center p-6 sm:p-10 rounded-2xl bg-gray-900/70 border border-gray-800 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-400 text-sm sm:text-base mb-2">
              If you built these yourself, it would take{" "}
              <span className="text-white font-bold">50+ hours</span>
            </p>
            <p className="text-gray-400 text-sm sm:text-base mb-6">
              At $50/hour, that's{" "}
              <span className="text-white font-bold">$2,500 of your time</span>
            </p>

            <div className="flex flex-col items-center gap-2">
              <p className="text-gray-500 text-sm line-through">
                Regular price: $97
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wide">
                  Your price today:
                </span>
                <span className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-green-400">
                  $17
                </span>
              </div>
              <p className="text-green-400/80 text-sm font-medium mt-1">
                That's just $0.34 per template
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sample Preview Grid */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.h2
            className="text-xl sm:text-2xl font-bold mb-8 text-center text-white"
            custom={0}
            variants={fadeUp}
          >
            Preview: 6 of 50 Templates
          </motion.h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {templateCovers.map((template, i) => {
              const Icon = template.icon;
              return (
                <motion.div
                  key={template.name}
                  className="group relative"
                  custom={i + 1}
                  variants={fadeUp}
                >
                  <div
                    className={`aspect-[3/4] rounded-xl bg-gradient-to-br ${template.color} p-4 sm:p-5 flex flex-col items-center justify-between text-center shadow-lg group-hover:shadow-xl group-hover:scale-[1.03] transition-all duration-300 border border-white/10`}
                  >
                    {/* Top accent */}
                    <div className="w-8 h-0.5 rounded-full bg-white/30" />

                    {/* Icon + name */}
                    <div className="flex flex-col items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/60 mb-1">
                          7-Day Plan
                        </p>
                        <p className="text-sm sm:text-base font-bold text-white">
                          {template.name}
                        </p>
                      </div>
                    </div>

                    {/* Bottom */}
                    <div className="flex items-center gap-1 text-white/40">
                      <UtensilsCrossed className="w-3 h-3" />
                      <span className="text-[9px] sm:text-[10px] font-medium tracking-wide">
                        EvoFitMeals
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Button
            className="w-full sm:w-auto px-10 sm:px-14 py-5 sm:py-6 h-auto text-base sm:text-lg font-extrabold bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 hover:scale-[1.02] rounded-xl"
            onClick={() => {}}
          >
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Yes! Add the 50 Templates for Just $17
          </Button>

          <div className="mt-4">
            <Link
              href="/get-started"
              className="text-sm text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-4"
            >
              No thanks, I'll build my own templates from scratch
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Guarantee */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <motion.div
          className="p-6 sm:p-8 rounded-2xl bg-gray-900/60 border border-gray-800 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-green-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
            100% Satisfaction Guarantee
          </h3>
          <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
            If these templates don't save you hours of work, email us for a full
            refund. No questions asked.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
