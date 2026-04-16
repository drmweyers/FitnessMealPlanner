import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView, useAnimation } from "framer-motion";
import {
  Check,
  ChevronRight,
  ArrowRight,
  Shield,
  ChefHat,
  Zap,
  TrendingUp,
  Star,
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

type Tier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

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
        scrolled ? "bg-white shadow-sm" : "bg-white/95 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <ChefHat className="w-6 h-6 text-orange-500" />
              <span className="font-clash font-bold text-xl text-gray-900">
                EvoFit Meals
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/get-started"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </Link>
            <a
              href="#faq"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              FAQ
            </a>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <Link href="/get-started">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-clash font-semibold text-sm px-5 py-2 h-auto rounded-lg transition-all duration-200">
              See the Platform
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ──────────────────────────────────────────────
   HERO
   ────────────────────────────────────────────── */
function PricingHero() {
  return (
    <section
      className="relative min-h-[55vh] flex items-center justify-center overflow-hidden pt-16"
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-slate-900/80" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <Shield className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-200 font-medium">
              14-day money-back guarantee · No monthly fees · Ever.
            </span>
          </div>

          <h1 className="font-clash font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] text-white mb-5 tracking-tight">
            Pay Once. <span className="text-orange-500">Own It Forever.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            No subscriptions. No renewal fees. Choose your tier and the platform
            is yours for life.
          </p>

          <div className="flex flex-wrap justify-center gap-8 text-center">
            {[
              { value: "3 Tiers", label: "One-Time Pricing" },
              { value: "6,000+", label: "Recipes (Enterprise)" },
              { value: "$0/mo", label: "After Purchase" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-clash font-bold text-2xl sm:text-3xl text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   PRICING CARDS
   ────────────────────────────────────────────── */
function PricingCards({
  onCheckout,
}: {
  onCheckout: (tier: Tier) => Promise<void>;
}) {
  const tiers = [
    {
      id: "STARTER" as Tier,
      name: "Starter",
      tagline: "Launch",
      price: 199,
      totalValue: "$2,488",
      popular: false,
      features: [
        "Up to 9 clients",
        "50 meal plans/month",
        "AI meal plan generation",
        "1,500+ recipes",
        "PDF exports",
        "Grocery lists",
        "Shareable client links",
        "Progress tracking",
        "8+ dietary protocols",
        "Lifetime platform updates",
        "Trainer Toolkit (8 calculators)",
        "Marketing Vault (email scripts + templates)",
        "2 specialized plan packs/year",
      ],
      cta: "Get Starter",
      accent: "border-gray-200",
      btnClass: "bg-gray-900 hover:bg-gray-800 text-white",
    },
    {
      id: "PROFESSIONAL" as Tier,
      name: "Professional",
      tagline: "Scale",
      price: 299,
      totalValue: "$4,982",
      popular: true,
      extras: "Everything in Starter, PLUS:",
      features: [
        "Up to 20 clients",
        "200 meal plans/month",
        "3,000+ recipes",
        "Custom branding (logo + colors)",
        "Natural language AI input",
        "Recipe collections",
        "Advanced analytics",
        "All specialized meal plan drops (12+/year)",
        "Advanced marketing playbooks",
        "Trainer Toolkit (8 calculators)",
        "Lifetime platform updates",
      ],
      cta: "Get Professional",
      accent: "border-orange-500 ring-2 ring-orange-500/20",
      btnClass:
        "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25",
    },
    {
      id: "ENTERPRISE" as Tier,
      name: "Enterprise",
      tagline: "Dominate",
      price: 399,
      totalValue: "$7,976",
      popular: false,
      extras: "Everything in Professional, PLUS:",
      features: [
        "Unlimited clients",
        "Unlimited meal plans",
        "6,000+ recipe library",
        "White-label + custom domain",
        "Bulk operations",
        "All export formats (PDF + CSV)",
        "Full analytics dashboard",
        "Security audit trail",
        "Custom protocol request (1/year)",
        "Team & gym marketing SOPs",
        "White-labeled Trainer Toolkit",
        "Lifetime platform updates",
      ],
      cta: "Get Enterprise",
      accent: "border-gray-200",
      btnClass: "bg-gray-900 hover:bg-gray-800 text-white",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-orange-600 uppercase tracking-widest mb-3">
              Pricing
            </span>
            <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl text-gray-900 mb-4">
              Choose Your Plan.{" "}
              <span className="text-orange-600">Pay Once.</span> Own It Forever.
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              No subscriptions. No hidden fees. One payment and the platform is
              yours for life.
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
            <motion.div key={tier.id} variants={fadeUp}>
              <Card
                className={`relative border-2 ${tier.accent} shadow-sm hover:shadow-xl transition-all duration-300 bg-white overflow-hidden ${
                  tier.popular ? "md:-mt-4 md:mb-[-16px]" : ""
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center text-xs font-bold uppercase tracking-widest py-2">
                    Most Popular
                  </div>
                )}
                <CardContent className={`p-8 ${tier.popular ? "pt-12" : ""}`}>
                  <span className="text-xs font-bold uppercase tracking-widest text-orange-600">
                    {tier.tagline}
                  </span>

                  <h3 className="font-clash font-bold text-2xl text-gray-900 mt-2">
                    {tier.name}
                  </h3>

                  <div className="mt-4 mb-6">
                    <span className="font-clash font-bold text-5xl text-gray-900">
                      ${tier.price}
                    </span>
                    <span className="text-gray-500 ml-2">one-time</span>
                  </div>

                  {tier.extras && (
                    <p className="text-sm font-semibold text-orange-700 mb-3">
                      {tier.extras}
                    </p>
                  )}

                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Value stack summary */}
                  <div className="mb-5 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
                      Total package value
                    </div>
                    <div className="text-lg font-black text-orange-600 line-through opacity-60">
                      {tier.totalValue}
                    </div>
                    <div className="text-sm font-bold text-gray-800">
                      Yours today:{" "}
                      <span className="text-orange-600">${tier.price}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => onCheckout(tier.id)}
                    className={`w-full font-clash font-semibold text-base py-5 h-auto rounded-xl ${tier.btnClass} transition-all duration-300`}
                  >
                    {tier.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <Reveal>
          <p className="text-center text-sm text-gray-500 mt-10">
            All plans include a 14-day money-back guarantee. Upgrade anytime —
            just pay the difference.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   VALUE PROPS STRIP
   ────────────────────────────────────────────── */
function ValueStrip() {
  const items = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lifetime Access",
      desc: "Pay once — use forever. No renewal. No version lock.",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "14-Day Guarantee",
      desc: "Try it with real clients. Full refund if you're not satisfied.",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Upgrade Anytime",
      desc: "Move to a higher tier later — just pay the difference.",
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "Free Updates Forever",
      desc: "Every feature we ship goes to all existing customers. Always.",
    },
  ];

  return (
    <section className="py-16 bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {items.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUp}
              className="text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 text-orange-400">
                {item.icon}
              </div>
              <h3 className="font-clash font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   FAQ
   ────────────────────────────────────────────── */
function FAQSection() {
  const faqs = [
    {
      q: "Is this really one-time? No hidden fees?",
      a: "Yes. You pay once and own lifetime access to your tier. No monthly charges, no annual renewals, no usage fees. The price you see is the price you pay — forever.",
    },
    {
      q: "What if I need more clients?",
      a: "Simply upgrade to the next tier and pay only the difference. Going from Starter (9 clients) to Professional (20 clients) is just $100. Enterprise gives you unlimited clients and admin tools for $399 total.",
    },
    {
      q: "Can my clients access plans without signing up?",
      a: "Absolutely. You share a branded link. Your client views their full meal plan — recipes, macros, grocery list — without creating an account or downloading an app. Zero friction.",
    },
    {
      q: "What dietary protocols are supported?",
      a: "9 protocols out of the box: vegetarian, vegan, keto, paleo, gluten-free, low-carb, high-protein, mediterranean, and pescatarian. The AI also handles custom restrictions — just describe your client's needs in plain English.",
    },
    {
      q: "Is there a free trial?",
      a: "We don't offer a free trial because this is a one-time purchase, not a subscription. But we offer a 14-day money-back guarantee — try it with real clients, and if you're not satisfied, we'll refund you in full.",
    },
    {
      q: "Can I upgrade my tier later?",
      a: "Yes — anytime. Going from Starter ($199) to Professional ($299) costs just $100 more, also a one-time payment. All your clients, plans, and history carry over seamlessly.",
    },
    {
      q: "Can I customize the branding?",
      a: "On Professional and Enterprise plans, yes. Upload your logo, choose your brand colors, and set up a custom domain (Enterprise). Every plan, PDF, and shareable link your clients see will carry your brand — not ours.",
    },
    {
      q: "What's the difference between Professional and Enterprise?",
      a: "Professional is ideal for solo trainers with up to 20 clients. Enterprise adds unlimited clients, white-label mode with custom domain, bulk operations, full analytics, security audit trail, and custom protocol requests — built for gyms and high-volume coaches.",
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-sm font-semibold text-orange-600 uppercase tracking-widest mb-3">
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
   FINAL CTA
   ────────────────────────────────────────────── */
function FinalCTA({
  onCheckout,
}: {
  onCheckout: (tier: Tier) => Promise<void>;
}) {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[140px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="font-clash font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Ready to Scale Your
            <br />
            <span className="text-orange-500">Nutrition Business?</span>
          </h2>

          <p className="text-lg sm:text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
            One payment. Lifetime access. No monthly fees — ever.
          </p>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-10">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">
              14-day money-back guarantee.{" "}
              <span className="text-white font-semibold">
                No questions asked.
              </span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => onCheckout("STARTER")}
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-clash font-semibold text-base px-8 py-5 h-auto rounded-xl transition-all duration-300"
            >
              Starter — $199
            </Button>
            <Button
              onClick={() => onCheckout("PROFESSIONAL")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-clash font-bold text-lg px-10 py-6 h-auto rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 group"
            >
              Professional — $299
              <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              onClick={() => onCheckout("ENTERPRISE")}
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-clash font-semibold text-base px-8 py-5 h-auto rounded-xl transition-all duration-300"
            >
              Enterprise — $399
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   FOOTER
   ────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            <span className="font-clash font-bold text-white text-lg">
              EvoFitMeals
            </span>
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

/* ══════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════ */
export default function HybridPricing() {
  const handleCheckout = async (tier: Tier) => {
    try {
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, paymentType: "onetime" }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Failed to start checkout. Please try again.");
    }
  };

  return (
    <>
      <link rel="stylesheet" href={FONT_LINK} />
      <style>{`
        .font-clash { font-family: 'Clash Display', sans-serif; }
        .font-satoshi { font-family: 'Satoshi', sans-serif; }
      `}</style>

      <div className="font-satoshi min-h-screen bg-white text-gray-900 overflow-x-hidden">
        <Navbar />
        <PricingHero />
        <PricingCards onCheckout={handleCheckout} />
        <ValueStrip />
        <FAQSection />
        <FinalCTA onCheckout={handleCheckout} />
        <Footer />
      </div>
    </>
  );
}
