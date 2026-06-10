import { describe, it, expect, vi } from "vitest";
import { canonicalHostRedirect } from "../../server/middleware/canonicalHost";

function run(host: string | undefined, url = "/pricing?tier=pro") {
  const req = { headers: { host }, originalUrl: url } as never;
  const res = { redirect: vi.fn() } as never;
  const next = vi.fn();
  canonicalHostRedirect(req, res, next);
  return {
    redirect: (res as { redirect: ReturnType<typeof vi.fn> }).redirect,
    next,
  };
}

describe("canonicalHostRedirect", () => {
  it("301s evofitmeals.com to meals.evofit.io preserving the path", () => {
    const { redirect, next } = run("evofitmeals.com");
    expect(redirect).toHaveBeenCalledWith(
      301,
      "https://meals.evofit.io/pricing?tier=pro",
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("301s www.evofitmeals.com (case-insensitive, port-tolerant)", () => {
    const { redirect } = run("WWW.EVOFITMEALS.COM:443", "/");
    expect(redirect).toHaveBeenCalledWith(301, "https://meals.evofit.io/");
  });

  it("passes through the canonical host", () => {
    const { redirect, next } = run("meals.evofit.io");
    expect(redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("passes through localhost and missing host headers", () => {
    expect(run("localhost:3000").next).toHaveBeenCalled();
    expect(run(undefined).next).toHaveBeenCalled();
  });
});
