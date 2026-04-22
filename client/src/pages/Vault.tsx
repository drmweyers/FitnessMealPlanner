import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Download,
  Lock,
  BookOpen,
  Mail,
  FileSpreadsheet,
  FileCheck,
  MessageSquare,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Copy,
  CheckCheck,
  ClipboardCheck,
  UtensilsCrossed,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import type { VaultItemType, VaultTier } from "../../../shared/vault-catalog";
import type {
  DietaryQuestionnaire,
  EmailTemplate,
  MealPlanTemplateRef,
} from "../../../shared/vault-templates";

interface AvailableItem {
  slug: string;
  title: string;
  subtitle: string;
  type: VaultItemType;
  deliveredTier: VaultTier;
}

interface LockedItem {
  slug: string;
  title: string;
  type: VaultItemType;
  requiredTier: VaultTier;
}

interface VaultResponse {
  success: boolean;
  tier: VaultTier;
  catalogVersion: string;
  items: AvailableItem[];
  locked: LockedItem[];
  lockedCount: number;
}

interface TemplatesResponse {
  success: boolean;
  emailTemplates: EmailTemplate[];
  questionnaire: DietaryQuestionnaire;
  mealPlanTemplates: MealPlanTemplateRef[];
}

const TYPE_META: Record<
  VaultItemType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  playbook: { label: "Playbook", icon: BookOpen },
  scripts: { label: "Scripts", icon: MessageSquare },
  protocol: { label: "Protocol", icon: ClipboardList },
  "email-pack": { label: "Email Pack", icon: Mail },
  sop: { label: "SOPs", icon: FileCheck },
  spreadsheet: { label: "Spreadsheet", icon: FileSpreadsheet },
};

const TIER_LABEL: Record<VaultTier, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export default function Vault() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloadingSlug, setDownloadingSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<VaultResponse>({
    queryKey: ["vault-items"],
    queryFn: async () => {
      const res = await apiFetch("/vault/items");
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to load vault");
      }
      return res.json();
    },
    enabled: user?.role === "trainer",
    staleTime: 5 * 60 * 1000,
  });

  const { data: templates } = useQuery<TemplatesResponse>({
    queryKey: ["vault-templates"],
    queryFn: async () => {
      const res = await apiFetch("/vault/templates");
      if (!res.ok) {
        throw new Error("Failed to load templates");
      }
      return res.json();
    },
    enabled: user?.role === "trainer",
    staleTime: 10 * 60 * 1000,
  });

  async function copyToClipboard(text: string, slug: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Paste it into your email tool of choice.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select the text manually and copy with Ctrl/Cmd+C.",
        variant: "destructive",
      });
    }
  }

  if (user?.role !== "trainer") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-purple-600" />
        <h1 className="text-3xl font-bold text-gray-900">
          Business Vault is for Trainers
        </h1>
        <p className="mt-4 text-gray-600">
          The Business Vault bundles playbooks, SOPs, and scripts that power
          trainer businesses. Ask your trainer for access to any shared
          materials.
        </p>
      </div>
    );
  }

  async function handleDownload(slug: string, title: string) {
    setDownloadingSlug(slug);
    try {
      const res = await apiFetch(`/vault/download/${slug}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `evofit-${slug}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Download started",
        description: `${title} is ready.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed";
      toast({
        title: "Download failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDownloadingSlug(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-purple-600">
          <Sparkles className="h-4 w-4" />
          EvoFit Business Vault
        </div>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">
          Your Business Vault
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Playbooks, scripts, SOPs, and email sequences designed to help you
          sell, onboard, and retain nutrition clients. All PDFs are tailored to
          your current tier.
        </p>
        {data && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="bg-purple-600 text-white hover:bg-purple-700">
              {TIER_LABEL[data.tier]} Tier
            </Badge>
            <span className="text-sm text-gray-500">
              {data.items.length} unlocked
              {data.lockedCount > 0 ? ` • ${data.lockedCount} locked` : ""}
            </span>
          </div>
        )}
      </header>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-3">
                <div className="h-6 w-1/3 rounded bg-gray-200" />
                <div className="h-5 w-2/3 rounded bg-gray-200" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-5/6 rounded bg-gray-100" />
              </CardContent>
              <CardFooter>
                <div className="h-9 w-32 rounded bg-gray-200" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-6 text-red-700">
            We couldn't load your Business Vault right now. Refresh the page or
            try again in a few minutes.
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            const isDownloading = downloadingSlug === item.slug;
            return (
              <Card
                key={item.slug}
                className="flex flex-col border-purple-100 transition hover:border-purple-300 hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-600">
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </div>
                  <CardTitle className="mt-2 text-lg leading-snug text-gray-900">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 text-sm text-gray-600">
                  {item.subtitle}
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-purple-200 text-purple-700"
                  >
                    {TIER_LABEL[item.deliveredTier]} edition
                  </Badge>
                  <Button
                    onClick={() => handleDownload(item.slug, item.title)}
                    disabled={isDownloading}
                    className="bg-orange-500 text-white hover:bg-orange-600"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isDownloading ? "Preparing…" : "Download"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {templates && (
        <section className="mt-16">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-purple-600">
            <Sparkles className="h-4 w-4" />
            In-App Resources
          </div>
          <p className="mb-6 max-w-2xl text-sm text-gray-600">
            The email templates, intake questionnaire, and meal plan templates
            referenced throughout the vault PDFs. Copy-paste into your email
            tool or clone a meal plan into your client library.
          </p>

          <div className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <Mail className="h-5 w-5 text-purple-600" />
              Email Templates
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {templates.emailTemplates.map((tmpl) => {
                const isCopied = copiedSlug === tmpl.slug;
                return (
                  <Card key={tmpl.slug} className="border-purple-100">
                    <CardHeader>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-purple-600">
                        {tmpl.category}
                      </div>
                      <CardTitle className="mt-1 text-base text-gray-900">
                        {tmpl.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-gray-700">
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                          Subject
                        </div>
                        <div className="rounded bg-gray-50 px-3 py-2 font-mono text-xs">
                          {tmpl.subject}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                          Body
                        </div>
                        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-gray-50 px-3 py-2 font-sans text-xs leading-relaxed text-gray-700">
                          {tmpl.body}
                        </pre>
                      </div>
                      {Array.isArray(tmpl.placeholders) &&
                        tmpl.placeholders.length > 0 && (
                          <div className="text-xs text-gray-500">
                            Placeholders to replace:{" "}
                            <span className="font-mono text-purple-700">
                              {tmpl.placeholders
                                .map((t) => `{{${t}}}`)
                                .join(" ")}
                            </span>
                          </div>
                        )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(
                            `Subject: ${tmpl.subject}\n\n${tmpl.body}`,
                            tmpl.slug,
                          )
                        }
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        {isCopied ? (
                          <>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy template
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <ClipboardCheck className="h-5 w-5 text-purple-600" />
              {templates.questionnaire.title}
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-gray-600">
              {templates.questionnaire.intro}
            </p>
            <Card className="border-purple-100">
              <CardContent className="space-y-5 pt-6">
                {templates.questionnaire.sections.map((section) => (
                  <div key={section.heading}>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-purple-600">
                      {section.heading}
                    </h3>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                      {section.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const text = templates.questionnaire.sections
                      .map(
                        (s) =>
                          `## ${s.heading}\n\n${s.questions
                            .map((q, i) => `${i + 1}. ${q}`)
                            .join("\n")}`,
                      )
                      .join("\n\n");
                    copyToClipboard(
                      `${templates.questionnaire.title}\n\n${templates.questionnaire.intro}\n\n${text}`,
                      "questionnaire",
                    );
                  }}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  {copiedSlug === "questionnaire" ? (
                    <>
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy questionnaire
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="mb-10">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-gray-900">
              <UtensilsCrossed className="h-5 w-5 text-purple-600" />
              Official Meal Plan Templates
            </h2>
            <p className="mb-4 max-w-2xl text-sm text-gray-600">
              Use these as starting points when building plans for new clients.
              Head to{" "}
              <Link
                href="/meal-plan-generator"
                className="font-semibold text-purple-700 underline"
              >
                the Meal Plan Generator
              </Link>{" "}
              and use these names + tags as reference when setting up the plan.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {templates.mealPlanTemplates.map((tmpl) => (
                <Card key={tmpl.slug} className="border-purple-100">
                  <CardHeader>
                    <CardTitle className="text-base text-gray-900">
                      {tmpl.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    {tmpl.tagline}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-1">
                    {tmpl.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-purple-200 text-xs text-purple-700"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {data && data.locked.length > 0 && (
        <section className="mt-16">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            <Lock className="h-4 w-4" />
            Unlocked at higher tiers
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.locked.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              return (
                <Card
                  key={item.slug}
                  className="border-dashed border-gray-200 bg-gray-50"
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </div>
                    <CardTitle className="mt-2 text-base text-gray-700">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-gray-300 text-gray-500"
                    >
                      {TIER_LABEL[item.requiredTier]}+ required
                    </Badge>
                    <Link href="/pricing">
                      <Button variant="outline" size="sm">
                        Upgrade
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
