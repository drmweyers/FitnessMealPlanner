import { Link } from "wouter";
import {
  CheckCircle2,
  Check,
  ArrowRight,
  Shield,
  ChefHat,
  Users,
  Zap,
  FileText,
  Globe,
  BarChart2,
  Tag,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

type Tier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE" | null;

function getTier(): Tier {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("tier");
  if (raw === "STARTER" || raw === "PROFESSIONAL" || raw === "ENTERPRISE") {
    return raw;
  }
  return null;
}

function tierLabel(tier: Tier): string {
  switch (tier) {
    case "STARTER":
      return "Starter";
    case "PROFESSIONAL":
      return "Professional";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return "Enterprise";
  }
}

// ─── Quick-start step card ───
function OnboardingStep({
  step,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  step: number;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center shrink-0">
          {step}
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      <Link href={ctaHref}>
        <Button variant="outline" size="sm" className="self-start mt-1 gap-2">
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Upsell: Starter → Professional ───
function StarterUpsell() {
  return (
    <div className="border-2 border-amber-500 rounded-2xl bg-amber-50 p-8">
      <div className="mb-2">
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-semibold">
          One-Time Offer
        </Badge>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Before you dive in — Professional unlocks this for $100 more.
      </h2>
      <p className="text-gray-600 mb-6">
        You just made the smart call with Starter. Here's what Professional
        adds:
      </p>

      <ul className="space-y-3 mb-6">
        {[
          "Up to 20 clients (vs. your current 9)",
          "3,000 recipes including seasonal varieties",
          "Custom branding — your logo & colors on every PDF",
          'Natural language AI input ("high-protein, no dairy, Mediterranean")',
          "Recipe collections — organize by goal, season, or dietary need",
          "CSV + PDF analytics reports for client progress",
        ].map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm text-gray-800"
          >
            <Check className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <p className="text-sm font-semibold text-amber-700 mb-5">
        The difference: $100. One-time. No subscription.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/professional">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 gap-2">
            Upgrade to Professional — $299
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/trainer">
          <Button
            variant="ghost"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            No thanks, I'll start with Starter
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Upsell: Professional → Enterprise ───
function ProfessionalUpsell() {
  return (
    <div className="border-2 border-orange-600 rounded-2xl bg-orange-50 p-8">
      <div className="mb-2">
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs font-semibold">
          One-Time Offer
        </Badge>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        One more step — Enterprise adds total control for $100 more.
      </h2>
      <p className="text-gray-600 mb-6">
        Professional is the right call for most trainers. But if you want the
        full platform:
      </p>

      <ul className="space-y-3 mb-6">
        {[
          "Unlimited clients — no roster cap, ever",
          "6,000 recipes across all 17 meal type categories",
          "White-label mode — your brand, your domain, your platform",
          "All export formats: PDF, CSV, and Excel",
          "Bulk assign meal plans to your entire roster at once",
          "Full analytics dashboard with platform-wide stats",
          "Dedicated support",
        ].map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm text-gray-800"
          >
            <Check className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <p className="text-sm font-semibold text-orange-700 mb-5">
        The difference: $100. One-time. Own the whole platform.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/enterprise">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 gap-2">
            Get Enterprise — $399
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <Link href="/trainer">
          <Button
            variant="ghost"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            I'm good with Professional
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Confirmation: Enterprise (no upsell) ───
function EnterpriseConfirmation() {
  return (
    <div className="border border-green-300 rounded-2xl bg-green-50 p-8">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">
          You chose the best. You have everything.
        </h2>
      </div>
      <ul className="space-y-3 mb-6">
        {[
          "Unlimited clients — no roster cap, ever",
          "6,000 recipes across all 17 meal type categories",
          "White-label mode with your custom domain",
          "Full analytics dashboard + dedicated support",
        ].map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm text-gray-800"
          >
            <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Link href="/trainer">
        <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 gap-2">
          Let's get started
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

// ─── Main page ───
export default function CheckoutSuccess() {
  const tier = getTier();
  const label = tierLabel(tier);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-12">
        {/* Section 1 — Celebration */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            You're in. Welcome to EvoFitMeals {label}.
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            Your {label} access is active. Here's your quick-start checklist —
            and one more thing worth seeing before you dive in.
          </p>
        </div>

        {/* Section 2 — Onboarding steps */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Quick-start checklist
          </h2>
          <div className="grid gap-4">
            <OnboardingStep
              step={1}
              title="Set up your profile & branding"
              description="Add your photo, certifications, and dietary specialties. Professional and Enterprise: upload your logo now."
              ctaLabel="Go to Profile"
              ctaHref="/profile"
            />
            <OnboardingStep
              step={2}
              title="Add your first client"
              description="Send a client invitation. They register via a secure link and get instant access to their meal plans."
              ctaLabel="Add Clients"
              ctaHref="/trainer"
            />
            <OnboardingStep
              step={3}
              title="Generate your first AI meal plan"
              description="Choose a client, select dietary preferences, and let the AI do the rest. Takes under 60 seconds."
              ctaLabel="Generate a Plan"
              ctaHref="/meal-plan-generator"
            />
          </div>
        </div>

        {/* Section 3 — OTO Upsell (conditional) */}
        {tier === "STARTER" && <StarterUpsell />}
        {tier === "PROFESSIONAL" && <ProfessionalUpsell />}
        {(tier === "ENTERPRISE" || tier === null) && <EnterpriseConfirmation />}

        {/* Section 4 — Trust footer */}
        <div className="text-center space-y-2 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-gray-400" />
            <span>14-day money-back guarantee. No questions asked.</span>
          </div>
          <p className="text-sm text-gray-500">
            Support:{" "}
            <a
              href="mailto:support@evofitmeals.com"
              className="text-blue-600 hover:underline"
            >
              support@evofitmeals.com
            </a>
          </p>
          <p className="text-xs text-gray-400">
            Your purchase is secured by Stripe.
          </p>
        </div>
      </div>
    </div>
  );
}
