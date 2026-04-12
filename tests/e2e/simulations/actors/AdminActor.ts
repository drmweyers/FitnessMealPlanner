import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, CREDENTIALS } from "../../helpers/constants.js";
import { BaseActor, RoleName } from "./BaseActor.js";

export class AdminActor extends BaseActor {
  readonly role: RoleName = "admin";

  static async login(
    creds: { email: string; password: string } = CREDENTIALS.admin,
    baseUrl?: string,
  ): Promise<AdminActor> {
    const client = await ForgeApiClient.loginWith(
      creds.email,
      creds.password,
      baseUrl,
    );
    return new AdminActor(client);
  }

  // ---------- User management ----------
  listUsers(params?: Record<string, string>) {
    return this.client.get("/api/admin/users", params);
  }
  grantTier(email: string, tier: "starter" | "professional" | "enterprise") {
    return this.client.post("/api/admin/grant-tier", { email, tier });
  }

  // ---------- Bulk recipe generation ----------
  startBulkGeneration(payload: { count: number; tier?: string }) {
    return this.client.post(API.admin.generate, payload);
  }
  bulkProgress(batchId: string) {
    return this.client.get(`/api/admin/generate/progress/${batchId}`);
  }
  bmadStart(payload: unknown) {
    return this.client.post(API.admin.generateBmad, payload);
  }
  bmadProgress(batchId: string) {
    return this.client.get(API.admin.bmadProgress(batchId));
  }

  // ---------- Recipe moderation ----------
  approveRecipe(id: string) {
    return this.client.post(`/api/admin/recipes/${id}/approve`);
  }
  bulkDeleteRecipes(ids: string[]) {
    return this.client.post("/api/admin/recipes/bulk-delete", { ids });
  }

  // ---------- Bug reports ----------
  listBugReports(params?: Record<string, string>) {
    return this.client.get("/api/bugs", params);
  }
  getBugReport(id: string) {
    return this.client.get(`/api/bugs/${id}`);
  }
  setBugStatus(id: string, status: string, adminNotes?: string) {
    return this.client.raw("PATCH", `/api/bugs/${id}/status`, {
      status,
      adminNotes,
    });
  }
  setBugPriority(id: string, priority: string) {
    return this.client.raw("PATCH", `/api/bugs/${id}/priority`, { priority });
  }

  // ---------- Cache + analytics ----------
  clearCache() {
    return this.client.post("/api/admin/cache/clear");
  }
  apiUsage() {
    return this.client.get(API.admin.apiUsage);
  }
}
