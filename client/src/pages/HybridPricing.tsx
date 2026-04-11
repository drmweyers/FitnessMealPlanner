import { Check, Shield, TrendingUp, Zap } from "lucide-react";

type Tier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

interface TierFeature {
  name: string;
  included: boolean;
}

interface PricingTier {
  name: string;
  id: Tier;
  tagline: string;
  popular?: boolean;
  price: number;
  clientLimit: string;
  features: TierFeature[];
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    id: "STARTER",
    tagline: "Perfect for new trainers",
    price: 199,
    clientLimit: "Up to 9 clients",
    features: [
      { name: "Up to 9 clients", included: true },
      { name: "Essential recipe library", included: true },
      { name: "AI meal plan generation", included: true },
      { name: "PDF exports", included: true },
      { name: "Email support", included: true },
      { name: "Custom branding", included: false },
      { name: "Priority support", included: false },
      { name: "API access", included: false },
    ],
    cta: "Get Started",
  },
  {
    name: "Professional",
    id: "PROFESSIONAL",
    tagline: "For growing practices",
    popular: true,
    price: 299,
    clientLimit: "Up to 20 clients",
    features: [
      { name: "Up to 20 clients", included: true },
      { name: "Complete recipe library", included: true },
      { name: "Advanced AI plans", included: true },
      { name: "Progress tracking", included: true },
      { name: "Priority support", included: true },
      { name: "Custom branding", included: true },
      { name: "Team accounts", included: false },
      { name: "API access", included: false },
    ],
    cta: "Start Growing",
  },
  {
    name: "Enterprise",
    id: "ENTERPRISE",
    tagline: "For teams and gyms",
    price: 399,
    clientLimit: "Unlimited clients",
    features: [
      { name: "Unlimited clients", included: true },
      { name: "Unlimited recipes", included: true },
      { name: "Team accounts", included: true },
      { name: "API access", included: true },
      { name: "White label options", included: true },
      { name: "Dedicated support", included: true },
      { name: "Custom integrations", included: true },
      { name: "SLA guarantee", included: true },
    ],
    cta: "Get Enterprise",
  },
];

export default function HybridPricing() {
  const handleCheckout = async (tier: Tier) => {
    try {
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          paymentType: "onetime",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Failed to start checkout process. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="inline-block mb-4 px-4 py-2 bg-green-100 rounded-full">
          <span className="text-green-700 font-semibold text-sm">
            One-Time Payment — Lifetime Access
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Simple, One-Time Pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Pay once and own your plan forever. No monthly fees. No subscriptions.
          No recurring charges. Ever.
        </p>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-purple-600 mb-2">
              <TrendingUp className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">No Monthly Fees</h3>
            <p className="text-sm text-gray-600">
              Pay once, use forever — no recurring charges
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-purple-600 mb-2">
              <Shield className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">14-Day Guarantee</h3>
            <p className="text-sm text-gray-600">
              Money-back guarantee, no questions asked
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-purple-600 mb-2">
              <Zap className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">Lifetime Access</h3>
            <p className="text-sm text-gray-600">
              One payment unlocks the platform for life
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`bg-white rounded-2xl shadow-xl overflow-hidden relative ${
                tier.popular
                  ? "ring-2 ring-purple-600 transform md:scale-105"
                  : ""
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 mb-6">{tier.tagline}</p>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${tier.price}
                    </span>
                    <span className="text-gray-600">one-time</span>
                  </div>
                  <p className="text-sm text-green-600 mt-2">
                    {tier.clientLimit}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Lifetime access. No monthly fees.
                  </p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout(tier.id)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    tier.popular
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {tier.cta}
                </button>

                {/* Features */}
                <div className="mt-8 space-y-4">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                          feature.included ? "bg-green-100" : "bg-gray-100"
                        }`}
                      >
                        {feature.included ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span
                          className={
                            feature.included
                              ? "text-gray-900"
                              : "text-gray-400 line-through"
                          }
                        >
                          {feature.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              Is this really a one-time payment?
            </h3>
            <p className="text-gray-600">
              Yes — completely. You pay once and own lifetime access to your
              chosen tier. No monthly charges, no annual renewals, no usage
              fees. The price you see is the only price you'll ever pay.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              What if I need more clients later?
            </h3>
            <p className="text-gray-600">
              You can upgrade to a higher tier at any time and only pay the
              difference. Going from Starter ($199) to Professional ($299) costs
              just $100 more — also a one-time payment. All your data transfers
              seamlessly.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              Why is EvoFitMeals better than subscription-based competitors?
            </h3>
            <p className="text-gray-600">
              Our competitors charge $29–$200/month. That's $348–$2,400 per
              year, forever. EvoFitMeals is a one-time purchase. In year two,
              you pay nothing while competitors keep billing you. Over 10 years,
              you save thousands.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              What is your refund policy?
            </h3>
            <p className="text-gray-600">
              We offer a 14-day money-back guarantee. Try EvoFitMeals with real
              clients, and if you're not satisfied, email us within 14 days for
              a full refund — no questions asked.
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="max-w-4xl mx-auto mt-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Transform Your Nutrition Business?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join fitness professionals already using EvoFitMeals — one payment,
          lifetime access.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/get-started"
            className="bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Started
          </a>
        </div>
        <p className="mt-6 text-sm opacity-75">
          14-day money-back guarantee · Lifetime access · No monthly fees
        </p>
      </div>
    </div>
  );
}
