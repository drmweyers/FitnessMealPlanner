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
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../contexts/AuthContext";
import type { VaultItemType, VaultTier } from "../../../shared/vault-catalog";

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
