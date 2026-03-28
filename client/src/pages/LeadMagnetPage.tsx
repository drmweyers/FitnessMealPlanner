import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Lock,
  Download,
  Star,
  ChefHat,
  Calculator,
  ClipboardList,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" },
  }),
};

const bulletPoints = [
  {
    icon: ChefHat,
    text: "The 8 dietary protocols every trainer needs to know",
  },
  {
    icon: Calculator,
    text: "How to calculate ROI on meal planning services",
  },
  {
    icon: ClipboardList,
    text: "A complete 7-day sample AI-generated meal plan with macros",
  },
  {
    icon: Target,
    text: "The cheat sheet for matching diets to fitness goals",
  },
];

export default function LeadMagnetPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-950 to-purple-900/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 md:pt-28 pb-12 sm:pb-16">
          <div className="text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 text-sm font-medium tracking-wide">
                <Download className="w-4 h-4" />
                FREE DOWNLOAD
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              The AI Meal Planning{" "}
              <span className="bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                Blueprint
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              How fitness pros are using AI to create{" "}
              <span className="text-white font-semibold">
                100+ personalized meal plans per week
              </span>{" "}
              — without a nutrition degree
            </motion.p>
          </div>
        </div>
      </section>

      {/* What You'll Learn + PDF Mockup + Form */}
      <section className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left: Bullet Points + Form */}
          <div className="order-2 lg:order-1">
            {/* What You'll Learn */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              <motion.h2
                className="text-xl sm:text-2xl font-bold mb-6 text-white"
                custom={0}
                variants={fadeUp}
              >
                What You'll Learn
              </motion.h2>

              <div className="space-y-4">
                {bulletPoints.map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-3"
                    custom={i + 1}
                    variants={fadeUp}
                  >
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-gray-300 text-base leading-relaxed">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Email Capture Form */}
            <motion.div
              className="mt-10 p-6 sm:p-8 rounded-2xl bg-gray-900/80 border border-gray-800 backdrop-blur-sm"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h3 className="text-lg font-semibold mb-4 text-white">
                Get your free copy now
              </h3>

              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Your first name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
                <Input
                  type="email"
                  placeholder="Your best email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500/20"
                />
                <Button
                  className="w-full h-12 text-base font-bold bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 transition-all duration-200 hover:shadow-orange-500/40 hover:scale-[1.01]"
                  onClick={() => {}}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Get Your Free Blueprint
                </Button>
              </div>

              <p className="mt-3 text-xs text-gray-500 text-center">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </motion.div>
          </div>

          {/* Right: PDF Mockup */}
          <motion.div
            className="order-1 lg:order-2 flex justify-center"
            initial={{ opacity: 0, x: 40, rotateY: -10 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative">
              {/* Glow behind the book */}
              <div className="absolute -inset-8 bg-purple-600/15 rounded-full blur-3xl" />

              {/* PDF Cover */}
              <div className="relative w-64 sm:w-72 md:w-80 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl shadow-purple-900/40 transform perspective-800 rotate-y-3 hover:rotate-y-0 transition-transform duration-500">
                {/* Cover background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-purple-800 to-purple-950" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.08)_0%,_transparent_50%)]" />

                {/* Cover content */}
                <div className="relative h-full flex flex-col items-center justify-between p-6 sm:p-8 text-center">
                  {/* Top accent line */}
                  <div className="w-16 h-1 rounded-full bg-orange-500/80" />

                  {/* Main content */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <UtensilsCrossed className="w-7 h-7 text-purple-200" />
                    </div>

                    <div>
                      <p className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-purple-300 font-medium mb-2">
                        The
                      </p>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white leading-tight tracking-tight">
                        AI MEAL
                        <br />
                        PLANNING
                        <br />
                        BLUEPRINT
                      </h3>
                    </div>

                    <div className="w-10 h-px bg-purple-400/50" />

                    <p className="text-xs sm:text-sm text-purple-300 font-medium">
                      For Fitness Professionals
                    </p>
                  </div>

                  {/* Bottom logo */}
                  <div className="flex items-center gap-1.5 text-purple-300/70">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span className="text-[10px] sm:text-xs font-semibold tracking-wide">
                      EvoFitMeals
                    </span>
                  </div>
                </div>

                {/* Spine shadow effect */}
                <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/30 to-transparent" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Elements */}
      <section className="relative border-t border-gray-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {/* Stat */}
            <motion.div
              className="flex flex-col items-center gap-2"
              custom={0}
              variants={fadeUp}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-white">
                Join 500+ fitness professionals
              </p>
              <p className="text-xs text-gray-500">
                who have downloaded the blueprint
              </p>
            </motion.div>

            {/* Security */}
            <motion.div
              className="flex flex-col items-center gap-2"
              custom={1}
              variants={fadeUp}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-white">
                Your information is secure
              </p>
              <p className="text-xs text-gray-500">
                256-bit SSL encrypted
              </p>
            </motion.div>

            {/* Testimonial */}
            <motion.div
              className="flex flex-col items-center gap-2"
              custom={2}
              variants={fadeUp}
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-sm font-medium text-gray-300 italic max-w-xs">
                "This blueprint completely changed how I approach meal planning for my clients."
              </p>
              <p className="text-xs text-gray-500">
                — Sarah M., Certified Personal Trainer
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
