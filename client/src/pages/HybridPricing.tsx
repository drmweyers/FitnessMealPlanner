import { useState } from 'react';
import { Check, Zap, Shield, TrendingUp, Info } from 'lucide-react';

type PricingMode = 'subscription' | 'onetime';
type Tier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

interface TierFeature {
  name: string;
  included: boolean;
  info?: string;
}

interface PricingTier {
  name: string;
  id: Tier;
  tagline: string;
  popular?: boolean;
  subscription: {
    price: number;
    period: string;
    savings?: string;
  };
  onetime: {
    price: number;
    savings: string;
    limit: string;
  };
  features: TierFeature[];
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    id: 'STARTER',
    tagline: 'Perfect for new trainers',
    subscription: {
      price: 14.99,
      period: 'month',
    },
    onetime: {
      price: 399,
      savings: 'vs $2,158 over 10 years',
      limit: '20 plans/month',
    },
    features: [
      { name: 'Up to 9 clients', included: true },
      { name: 'Essential recipe library', included: true },
      { name: 'AI meal plan generation', included: true },
      { name: 'PDF exports', included: true },
      { name: 'Email support', included: true },
      { name: 'Custom branding', included: false },
      { name: 'Priority support', included: false },
      { name: 'API access', included: false },
    ],
    cta: 'Get Started',
  },
  {
    name: 'Professional',
    id: 'PROFESSIONAL',
    tagline: 'For growing practices',
    popular: true,
    subscription: {
      price: 29.99,
      period: 'month',
      savings: '70% cheaper than Trainerize',
    },
    onetime: {
      price: 599,
      savings: 'vs $4,318 over 10 years',
      limit: '50 plans/month',
    },
    features: [
      { name: 'Up to 20 clients', included: true },
      { name: 'Complete recipe library', included: true },
      { name: 'Advanced AI plans', included: true },
      { name: 'Progress tracking', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom branding', included: true },
      { name: 'Team accounts', included: false },
      { name: 'API access', included: false },
    ],
    cta: 'Start Growing',
  },
  {
    name: 'Enterprise',
    id: 'ENTERPRISE',
    tagline: 'For teams and gyms',
    subscription: {
      price: 59.99,
      period: 'month',
    },
    onetime: {
      price: 999,
      savings: 'vs $8,638 over 10 years',
      limit: '150 plans/month',
    },
    features: [
      { name: 'Up to 50 clients', included: true },
      { name: 'Unlimited recipes', included: true },
      { name: 'Team accounts', included: true },
      { name: 'API access', included: true },
      { name: 'White label options', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
  },
];

export default function HybridPricing() {
  const [mode, setMode] = useState<PricingMode>('subscription');

  const handleCheckout = async (tier: Tier) => {
    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          paymentType: mode,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout process. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto text-center mb-12">
        <div className="inline-block mb-4 px-4 py-2 bg-green-100 rounded-full">
          <span className="text-green-700 font-semibold text-sm">
            💰 Choose Your Payment Model
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Flexible Pricing That Works For You
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Only platform offering both one-time payment and subscription options.
          Pick what fits your business best.
        </p>

        {/* Pricing Mode Toggle */}
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => setMode('subscription')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'subscription'
                ? 'bg-white text-purple-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>Monthly Subscription</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Unlimited usage</div>
          </button>
          <button
            onClick={() => setMode('onetime')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mode === 'onetime'
                ? 'bg-white text-purple-600 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>One-Time Payment</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Lifetime access</div>
          </button>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-purple-600 mb-2">
              <TrendingUp className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">
              {mode === 'subscription' ? 'Unlimited Usage' : 'No Monthly Fees'}
            </h3>
            <p className="text-sm text-gray-600">
              {mode === 'subscription'
                ? 'Generate unlimited meal plans and recipes'
                : 'Pay once, use forever - no recurring charges'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-purple-600 mb-2">
              <Shield className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">14-Day Guarantee</h3>
            <p className="text-sm text-gray-600">
              {mode === 'subscription'
                ? 'Cancel anytime, full refund within 14 days'
                : 'Money-back guarantee, no questions asked'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-purple-600 mb-2">
              <Zap className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold mb-2">Switch Anytime</h3>
            <p className="text-sm text-gray-600">
              Change between subscription and one-time payment models
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
                tier.popular ? 'ring-2 ring-purple-600 transform md:scale-105' : ''
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
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 mb-6">{tier.tagline}</p>

                {/* Pricing */}
                {mode === 'subscription' ? (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${tier.subscription.price}
                      </span>
                      <span className="text-gray-600">/{tier.subscription.period}</span>
                    </div>
                    {tier.subscription.savings && (
                      <p className="text-sm text-green-600 mt-2">{tier.subscription.savings}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">Unlimited meal plans</p>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${tier.onetime.price}
                      </span>
                      <span className="text-gray-600">one-time</span>
                    </div>
                    <p className="text-sm text-green-600 mt-2">Save {tier.onetime.savings}</p>
                    <p className="text-sm text-gray-500 mt-2">{tier.onetime.limit}</p>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={() => handleCheckout(tier.id)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    tier.popular
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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
                          feature.included ? 'bg-green-100' : 'bg-gray-100'
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
                            feature.included ? 'text-gray-900' : 'text-gray-400 line-through'
                          }
                        >
                          {feature.name}
                        </span>
                        {feature.info && (
                          <div className="flex items-center gap-1 mt-1">
                            <Info className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{feature.info}</span>
                          </div>
                        )}
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
              Can I switch between subscription and one-time payment?
            </h3>
            <p className="text-gray-600">
              Yes! You can switch at any time. If you're on a subscription and want to switch to
              one-time, we'll credit your unused subscription time toward the one-time purchase.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              What happens if I exceed my monthly limit on one-time plan?
            </h3>
            <p className="text-gray-600">
              You'll receive a notification when approaching your limit. You can either wait for the
              next month, upgrade to a higher tier, or switch to unlimited subscription.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              Why is EvoFitMeals better than competitors?
            </h3>
            <p className="text-gray-600">
              We're the ONLY platform offering both payment models. Plus, we use GPT-4 and DALL-E 3
              for superior AI meal planning. Our subscription is 70% cheaper than Trainerize
              ($29.99 vs $100/mo).
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold text-lg mb-2">
              Do I get a refund if I cancel my subscription?
            </h3>
            <p className="text-gray-600">
              Yes, we offer a 14-day money-back guarantee. After that, you can cancel anytime and
              keep access until the end of your billing period.
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
          Join 10,000+ fitness professionals already using EvoFitMeals
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/signup"
            className="bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
          >
            Start Free Trial
          </a>
          <a
            href="/landing/roi-calculator.html"
            className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-purple-600 transition"
          >
            Calculate Your Savings
          </a>
        </div>
        <p className="mt-6 text-sm opacity-75">
          {mode === 'subscription'
            ? '14-day free trial • Cancel anytime • No credit card required'
            : '14-day money-back guarantee • Lifetime access • No monthly fees'}
        </p>
      </div>
    </div>
  );
}
