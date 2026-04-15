import { Link } from "wouter";
import {
  AlertCircle,
  Check,
  ArrowRight,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useState } from "react";

// ─── FAQ item ───
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 text-sm">{question}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ───
export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16 space-y-12">
        {/* Section 1 — Soft recovery header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            No problem — your spot is still waiting.
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            You left before completing checkout. Your selection is saved. Here's
            a reminder of what you were about to unlock:
          </p>
        </div>

        {/* Section 2 — Enterprise value block */}
        <div className="bg-white border-2 border-orange-500 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs font-semibold">
              Most Complete Plan
            </Badge>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              EvoFitMeals Enterprise — $399, One Time
            </h2>
          </div>

          <ul className="space-y-3">
            {[
              "Unlimited clients — no cap, ever",
              "6,000+ recipes across all 17 meal categories",
              "White-label mode — your brand on every PDF and client touchpoint",
              "Bulk assign meal plans to your entire roster in one click",
              "All export formats: PDF, CSV, and Excel",
              "Full analytics dashboard",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm text-gray-800"
              >
                <Check className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-gray-400" />
            <span>14-day money-back guarantee. No risk.</span>
          </div>

          <Link href="/enterprise">
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 gap-2 text-base">
              Get Enterprise — $399
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Section 3 — Softer tier options */}
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600 font-medium">
            Or choose the plan that fits where you are today:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/starter">
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8"
              >
                Starter — $199
              </Button>
            </Link>
            <Link href="/professional">
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8"
              >
                Professional — $299
              </Button>
            </Link>
          </div>
        </div>

        {/* Section 4 — FAQ */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Questions</h2>
          <FaqItem
            question="Why is EvoFitMeals one-time pricing?"
            answer="We built the software once. You shouldn't pay forever. One-time payment = permanent access, including all future updates to your tier."
          />
          <FaqItem
            question="Can I upgrade later?"
            answer="Yes. If you start with Starter or Professional, you can upgrade at any time — just pay the difference."
          />
        </div>
      </div>
    </div>
  );
}
