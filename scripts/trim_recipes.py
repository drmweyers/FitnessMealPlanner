#!/usr/bin/env python3
"""
Trim over-populated recipe tiers to their targets.
  STARTER:      2,806 → 1,500  (delete ~1,306)
  PROFESSIONAL: 2,194 → 1,500  (delete ~694)
  ENTERPRISE:   untouched (under target)

Strategy: delete unapproved first, then oldest approved.
Bulk delete in batches of 50.
"""

import json
import ssl
import urllib.request
import urllib.error
import sys
import time

BASE = "https://evofitmeals.com"
EMAIL = "admin@fitmeal.pro"
PASSWORD = "AdminPass123"

ctx = ssl.create_default_context()


def api(method, path, body=None, token=None):
    """Make an API request and return parsed JSON (or None for 204)."""
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
            if resp.status == 204:
                return None
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        print(f"  HTTP {e.code} on {method} {path}: {body_text[:300]}")
        raise


def login():
    print("=== Authenticating ===")
    r = api("POST", "/api/auth/login", {"email": EMAIL, "password": PASSWORD})
    token = r.get("data", {}).get("accessToken") or r.get("accessToken")
    if not token:
        # Try alternate response shape
        token = r.get("token")
    if not token:
        print(f"Login response keys: {list(r.keys())}")
        sys.exit("Could not extract token from login response")
    print("  Logged in successfully.")
    return token


def get_tier_count(token, tier, ingredient=None):
    """Use recipe-count endpoint to get count for a tier+ingredient."""
    body = {"tierLevel": tier}
    if ingredient:
        body["mainIngredient"] = ingredient
    r = api("POST", "/api/admin/generate-bulk/recipe-count", body, token)
    return r.get("count", 0)


def fetch_all_recipes_for_tier(token, tier):
    """Paginate through ALL admin recipes and filter by tier client-side.
    Returns list of recipe dicts sorted by createdAt ascending (oldest first).
    """
    print(f"  Fetching all {tier} recipes (paginating)...")
    all_recipes = []
    page = 1
    limit = 50
    while True:
        r = api("GET", f"/api/admin/recipes?page={page}&limit={limit}", token=token)
        recipes = r.get("recipes", [])
        total = r.get("total", 0)
        if not recipes:
            break
        for rec in recipes:
            tl = (rec.get("tierLevel") or rec.get("tier_level") or "").lower()
            if tl == tier.lower():
                all_recipes.append(rec)
        # Check if we've fetched all pages
        if page * limit >= total:
            break
        page += 1
        if page % 50 == 0:
            print(f"    ... page {page}, found {len(all_recipes)} {tier} so far (total DB: {total})")

    # Sort by createdAt ascending (oldest first)
    all_recipes.sort(key=lambda r: r.get("createdAt", r.get("created_at", "")))
    print(f"  Found {len(all_recipes)} {tier} recipes total.")
    return all_recipes


def fetch_recipes_for_tier_large(token, tier):
    """For large fetches, use limit=50 but be smarter about it.
    Since admin endpoint returns ALL tiers mixed, we need to paginate through everything.
    """
    print(f"  Fetching ALL recipes to filter {tier} tier (this may take a while)...")
    all_recipes = []
    page = 1
    limit = 100
    # First get total count
    r = api("GET", f"/api/admin/recipes?page=1&limit=1", token=token)
    total = int(r.get("total", 0))
    print(f"  Total recipes in DB: {total}")

    while True:
        r = api("GET", f"/api/admin/recipes?page={page}&limit={limit}", token=token)
        recipes = r.get("recipes", [])
        if not recipes:
            break
        for rec in recipes:
            tl = (rec.get("tierLevel") or rec.get("tier_level") or "").lower()
            if tl == tier.lower():
                all_recipes.append(rec)
        if page * limit >= total:
            break
        page += 1
        if page % 100 == 0:
            print(f"    ... page {page}/{(total+limit-1)//limit}, found {len(all_recipes)} {tier} so far")

    # Sort: unapproved first, then by createdAt ascending (oldest first)
    def sort_key(r):
        approved = r.get("approved", r.get("is_approved", True))
        created = r.get("createdAt", r.get("created_at", ""))
        return (1 if approved else 0, created)

    all_recipes.sort(key=sort_key)
    print(f"  Found {len(all_recipes)} {tier} recipes total.")
    return all_recipes


def bulk_delete(token, ids):
    """Delete recipes in batches of 50."""
    total = len(ids)
    deleted = 0
    for i in range(0, total, 50):
        batch = ids[i:i+50]
        try:
            api("DELETE", "/api/admin/recipes", {"ids": batch}, token)
            deleted += len(batch)
            if deleted % 200 == 0 or deleted == total:
                print(f"    Deleted {deleted}/{total}")
        except Exception as e:
            print(f"    Error deleting batch at offset {i}: {e}")
            # Try individual deletes for this batch
            for rid in batch:
                try:
                    api("DELETE", f"/api/admin/recipes/{rid}", token=token)
                    deleted += 1
                except Exception:
                    print(f"      Failed to delete {rid}")
    return deleted


def trim_tier(token, tier, target):
    """Trim a tier down to target count."""
    print(f"\n{'='*60}")
    print(f"=== TRIMMING {tier.upper()} to {target} ===")
    print(f"{'='*60}")

    # Get current count
    current = get_tier_count(token, tier)
    print(f"  Current {tier} count: {current}")

    if current <= target:
        print(f"  Already at or below target ({target}). Skipping.")
        return 0

    to_delete = current - target
    print(f"  Need to delete: {to_delete}")

    # Fetch all recipes for this tier
    recipes = fetch_recipes_for_tier_large(token, tier)

    if len(recipes) < to_delete:
        print(f"  WARNING: Only found {len(recipes)} recipes but need to delete {to_delete}")
        to_delete = len(recipes)

    # Take the first `to_delete` recipes (unapproved first, then oldest)
    ids_to_delete = [r["id"] for r in recipes[:to_delete]]

    # Count how many are unapproved vs approved
    unapproved = sum(1 for r in recipes[:to_delete] if not r.get("approved", r.get("is_approved", True)))
    approved = to_delete - unapproved
    print(f"  Deleting {unapproved} unapproved + {approved} approved (oldest) = {to_delete} total")

    # Execute deletion
    deleted = bulk_delete(token, ids_to_delete)
    print(f"  Deleted {deleted} {tier} recipes.")

    # Verify
    new_count = get_tier_count(token, tier)
    print(f"  New {tier} count: {new_count} (target: {target})")

    return deleted


def main():
    token = login()

    # Show initial counts
    print("\n=== INITIAL COUNTS ===")
    for tier in ["starter", "professional", "enterprise"]:
        count = get_tier_count(token, tier)
        print(f"  {tier}: {count}")

    # Phase 1: Trim Starter
    starter_deleted = trim_tier(token, "starter", 1500)

    # Phase 2: Trim Professional
    pro_deleted = trim_tier(token, "professional", 1500)

    # Final verification
    print("\n" + "="*60)
    print("=== FINAL VERIFICATION ===")
    print("="*60)
    total_all = 0
    for tier in ["starter", "professional", "enterprise"]:
        count = get_tier_count(token, tier)
        print(f"  {tier}: {count}")
        total_all += count
    print(f"  TOTAL: {total_all}")
    print(f"\n  Starter deleted: {starter_deleted}")
    print(f"  Professional deleted: {pro_deleted}")
    print(f"  Grand total deleted: {starter_deleted + pro_deleted}")
    print("\nDone!")


if __name__ == "__main__":
    main()
