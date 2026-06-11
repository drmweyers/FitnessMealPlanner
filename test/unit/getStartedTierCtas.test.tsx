/**
 * Get-Started Funnel — tier CTA destinations & tier carry-over
 *
 * Regression tests for the 2026-06-10 funnel-loop audit:
 *  - /get-started tier CTAs must NOT loop to /pricing; each must go to its
 *    tier's deep-dive sales page (/starter, /professional, /enterprise).
 *  - /get-started must honor the ?tier= param set by the homepage CTAs.
 *  - The deep-dive sales pages' CTAs must start a real Stripe checkout for
 *    their tier (previously they pointed at the dead /api/login route).
 *  - /pricing buy buttons must work for anonymous buyers (the authenticated
 *    checkout endpoint 401s — they must fall back to the public funnel
 *    checkout with the tier carried over).
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";

/* ── Mocks ───────────────────────────────────────────── */

const { mockNavigate, mockStartTierCheckout } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockStartTierCheckout: vi.fn().mockResolvedValue(undefined),
}));

// wouter: render Link as a plain anchor, capture navigation
vi.mock("wouter", async () => {
  const ReactMod = await import("react");
  return {
    Link: ({ href, to, children, ...rest }: any) =>
      ReactMod.createElement("a", { href: href ?? to, ...rest }, children),
    useLocation: () => ["/get-started", mockNavigate],
  };
});

// lucide-react: the global setup mock misses some icons these pages use
// (MessageSquare, BookOpen, Salad, …) — provide every icon via Proxy.
vi.mock("lucide-react", async () => {
  const ReactMod = await import("react");
  return new Proxy(
    {},
    {
      has: () => true,
      get: (_target, name) => {
        if (name === "then") return undefined;
        if (name === "__esModule") return true;
        return (props: any) =>
          ReactMod.createElement("svg", {
            "data-testid": `icon-${String(name)}`,
          });
      },
    },
  );
});

// framer-motion: strip animation props, render plain elements
vi.mock("framer-motion", async () => {
  const ReactMod = await import("react");
  const stripped = (props: any) => {
    const {
      initial,
      animate,
      exit,
      variants,
      transition,
      whileInView,
      viewport,
      whileHover,
      whileTap,
      ...rest
    } = props;
    return rest;
  };
  return {
    motion: new Proxy(
      {},
      {
        has: () => true,
        get: (_target, tag) => {
          if (tag === "then") return undefined;
          return ({ children, ...props }: any) =>
            ReactMod.createElement(
              typeof tag === "string" ? tag : "div",
              stripped(props),
              children,
            );
        },
      },
    ),
    AnimatePresence: ({ children }: any) => children,
    useInView: () => true,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn(), set: vi.fn() }),
  };
});

// The real purchase action — mocked so we can assert tier carry-over
vi.mock("../../client/src/lib/startTierCheckout", () => ({
  startTierCheckout: mockStartTierCheckout,
  createTierCheckoutSession: vi.fn(),
}));

import FunnelLanding from "../../client/src/pages/FunnelLanding";
import StarterSalesPage from "../../client/src/pages/StarterSalesPage";
import ProfessionalSalesPage from "../../client/src/pages/ProfessionalSalesPage";
import EnterpriseSalesPage from "../../client/src/pages/EnterpriseSalesPage";
import HybridPricing from "../../client/src/pages/HybridPricing";

/* ── Helpers ─────────────────────────────────────────── */

function linkOf(el: HTMLElement): string | null {
  const anchor = el.closest("a");
  return anchor ? anchor.getAttribute("href") : null;
}

beforeEach(() => {
  cleanup();
  mockNavigate.mockClear();
  mockStartTierCheckout.mockClear();
  window.history.replaceState(null, "", "/get-started");
});

/* ── /get-started tier CTAs ──────────────────────────── */

describe("FunnelLanding (/get-started) tier CTAs", () => {
  it("sends each tier card CTA to its deep-dive sales page, not /pricing", () => {
    render(<FunnelLanding />);

    expect(linkOf(screen.getByText("Get Starter"))).toBe("/starter");
    expect(linkOf(screen.getByText("Get Professional"))).toBe("/professional");
    expect(linkOf(screen.getByText("Get Enterprise"))).toBe("/enterprise");
  });

  it("sends the final-CTA tier buttons to their deep-dive sales pages", () => {
    render(<FunnelLanding />);

    expect(linkOf(screen.getByText("Starter — $199"))).toBe("/starter");
    expect(linkOf(screen.getByText("Professional — $299"))).toBe(
      "/professional",
    );
    expect(linkOf(screen.getByText("Enterprise — $399"))).toBe("/enterprise");
  });
});

describe("FunnelLanding ?tier= carry-over", () => {
  it.each([
    ["starter", "/starter"],
    ["professional", "/professional"],
    ["enterprise", "/enterprise"],
  ])("redirects ?tier=%s to its deep-dive sales page", (tier, dest) => {
    window.history.replaceState(null, "", `/get-started?tier=${tier}`);
    render(<FunnelLanding />);

    expect(mockNavigate).toHaveBeenCalledWith(dest, { replace: true });
  });

  it("ignores an unknown ?tier= value", () => {
    window.history.replaceState(null, "", "/get-started?tier=bogus");
    render(<FunnelLanding />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not redirect without a ?tier= param", () => {
    render(<FunnelLanding />);

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

/* ── Deep-dive sales page CTAs → real purchase action ── */

describe("Deep-dive sales page CTAs start checkout for their tier", () => {
  it("StarterSalesPage CTAs start a starter checkout", async () => {
    render(<StarterSalesPage />);

    const ctas = screen.getAllByText("Get Starter for $199");
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const cta of ctas) {
      fireEvent.click(cta);
    }

    await waitFor(() =>
      expect(mockStartTierCheckout).toHaveBeenCalledWith("starter"),
    );
    expect(mockStartTierCheckout).toHaveBeenCalledTimes(ctas.length);
    // No CTA may still point at the dead /api/login route
    expect(document.querySelector('a[href="/api/login"]')).toBeNull();
  });

  it("ProfessionalSalesPage CTAs start a professional checkout", async () => {
    render(<ProfessionalSalesPage />);

    const ctas = screen.getAllByText("Get Professional for $299");
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const cta of ctas) {
      fireEvent.click(cta);
    }

    await waitFor(() =>
      expect(mockStartTierCheckout).toHaveBeenCalledWith("professional"),
    );
    expect(document.querySelector('a[href="/api/login"]')).toBeNull();
  });

  it("EnterpriseSalesPage CTAs start an enterprise checkout", async () => {
    render(<EnterpriseSalesPage />);

    const ctas = screen.getAllByText("Get Enterprise for $399");
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const cta of ctas) {
      fireEvent.click(cta);
    }

    await waitFor(() =>
      expect(mockStartTierCheckout).toHaveBeenCalledWith("enterprise"),
    );
    expect(document.querySelector('a[href="/api/login"]')).toBeNull();
  });
});

/* ── /pricing anonymous fallback ─────────────────────── */

describe("HybridPricing (/pricing) anonymous checkout fallback", () => {
  it("falls back to the public funnel checkout when the authed endpoint 401s", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<HybridPricing />);

    fireEvent.click(screen.getAllByText("Get Professional")[0]);

    await waitFor(() =>
      expect(mockStartTierCheckout).toHaveBeenCalledWith("professional"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/subscription/create-checkout",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
