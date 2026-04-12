import { ForgeApiClient } from "../../helpers/api-client.js";
import { API, CREDENTIALS } from "../../helpers/constants.js";
import { BaseActor, RoleName } from "./BaseActor.js";

export class ClientActor extends BaseActor {
  readonly role: RoleName = "client";

  static async login(
    creds: { email: string; password: string } = CREDENTIALS.customer,
    baseUrl?: string,
  ): Promise<ClientActor> {
    const client = await ForgeApiClient.loginWith(
      creds.email,
      creds.password,
      baseUrl,
    );
    return new ClientActor(client);
  }

  // ---------- Meal plans ----------
  myMealPlans() {
    return this.client.get("/api/customer/meal-plans");
  }
  viewSharedPlan(token: string) {
    return this.client.get(API.mealPlans.shared(token));
  }

  // ---------- Progress ----------
  logMeasurement(payload: unknown) {
    return this.client.post(API.progress.measurements, payload);
  }
  listMeasurements() {
    return this.client.get(API.progress.measurements);
  }
  uploadProgressPhoto(payload: unknown) {
    return this.client.post(API.progress.photos, payload);
  }

  // ---------- Grocery ----------
  groceryLists() {
    return this.client.get(API.grocery.lists);
  }
  generateGroceryFromMealPlan(mealPlanId: string) {
    return this.client.post(API.grocery.generateFromMealPlan, { mealPlanId });
  }
  checkOffItem(listId: string, itemId: string, checked: boolean) {
    return this.client.put(API.grocery.item(listId, itemId), { checked });
  }

  // ---------- Recipes / favorites ----------
  browseRecipes(params?: Record<string, string>) {
    return this.client.get(API.recipes.list, params);
  }
  favoriteRecipe(recipeId: string) {
    return this.client.post(API.favorites, { recipeId });
  }

  // ---------- Bug pipeline ----------
  submitBug(payload: {
    title: string;
    description: string;
    category?: string;
    priority?: string;
  }) {
    return this.client.post("/api/bugs", payload);
  }

  // ---------- Profile ----------
  profile() {
    return this.client.get(API.profile);
  }
  customerStats() {
    return this.client.get(API.customer.profileStats);
  }
}
