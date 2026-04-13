import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, CREDENTIALS } from "../../helpers/constants.js";
import { BaseActor, RoleName } from "./BaseActor.js";

export class TrainerActor extends BaseActor {
  readonly role: RoleName = "trainer";

  static async login(
    creds: { email: string; password: string } = CREDENTIALS.trainer,
    baseUrl?: string,
  ): Promise<TrainerActor> {
    const client = await ForgeApiClient.loginWith(
      creds.email,
      creds.password,
      baseUrl,
    );
    return new TrainerActor(client);
  }

  // ---------- Customer roster ----------
  listCustomers() {
    return this.client.get(API.trainer.customers);
  }
  inviteCustomer(email: string) {
    return this.client.post(API.invitations.send, {
      email,
      role: "customer",
    });
  }

  // ---------- Meal plans ----------
  listMealPlans() {
    return this.client.get(API.trainer.mealPlans);
  }
  createMealPlan(payload: {
    mealPlanData: Record<string, unknown>;
    notes?: string;
    tags?: string[];
    isTemplate?: boolean;
  }) {
    return this.client.post(API.trainer.mealPlans, payload);
  }
  generateMealPlan(payload: unknown) {
    return this.client.post(API.mealPlans.generate, payload);
  }
  assignMealPlan(planId: string, customerId: string) {
    return this.client.post(API.trainer.mealPlanAssign(planId), { customerId });
  }
  unassignMealPlan(planId: string, customerId: string) {
    return this.client.delete(API.trainer.mealPlanUnassign(planId, customerId));
  }
  shareMealPlan(planId: string) {
    return this.client.post(API.mealPlans.share(planId));
  }

  // ---------- Customer detail ----------
  customerMealPlans(customerId: string) {
    return this.client.get(API.trainer.customerMealPlans(customerId));
  }
  customerMeasurements(customerId: string) {
    return this.client.get(API.trainer.customerMeasurements(customerId));
  }
  customerProgressTimeline(customerId: string) {
    return this.client.get(API.trainer.customerProgressTimeline(customerId));
  }

  // ---------- Recipes ----------
  listRecipes(params?: Record<string, string>) {
    return this.client.get(API.recipes.list, params);
  }
  favoriteRecipe(recipeId: string) {
    return this.client.post(API.favorites, { recipeId });
  }

  // ---------- Profile / billing ----------
  profileStats() {
    return this.client.get(API.trainer.profileStats);
  }
  entitlements() {
    return this.client.get(API.entitlements);
  }
  currentTier() {
    return this.client.get(API.tiers.current);
  }
  usage() {
    return this.client.get(API.tiers.usage);
  }

  // ---------- PDF export ----------
  exportMealPlanPdf(planId: string) {
    return this.client.raw("POST", API.pdf.exportPlan(planId));
  }
}
