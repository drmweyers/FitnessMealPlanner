# Page Object Models

## Purpose
This directory contains **Page Object Models (POMs)** - reusable abstractions of pages and components that encapsulate UI interactions and selectors.

## Why Page Objects?

**Benefits:**
- ✅ **Maintainability:** Change selectors in one place, not 100 test files
- ✅ **Readability:** Tests read like user stories, not CSS selectors
- ✅ **Reusability:** Share common interactions across tests
- ✅ **Type Safety:** TypeScript autocompletion and validation
- ✅ **Consistency:** Standardized interaction patterns

**Without Page Objects (Bad):**
```typescript
test('User can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('.dashboard-header');
  expect(await page.textContent('.user-name')).toBe('Test User');
});
```

**With Page Objects (Good):**
```typescript
test('User can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login('test@example.com', 'password123');
  await loginPage.assertLoginSuccessful();
  await loginPage.assertUserNameDisplayed('Test User');
});
```

## Directory Structure

```
page-objects/
├── admin/                    # Admin-specific pages
│   ├── AdminRecipeManagementPage.ts
│   ├── AdminUserManagementPage.ts
│   ├── AdminAnalyticsPage.ts
│   ├── AdminDashboardPage.ts
│   └── AdminBMADGeneratorPage.ts
├── trainer/                  # Trainer-specific pages
│   ├── TrainerCustomerManagementPage.ts
│   ├── TrainerMealPlanPage.ts
│   ├── TrainerProgressTrackingPage.ts
│   └── TrainerDashboardPage.ts
├── customer/                 # Customer-specific pages
│   ├── CustomerMealPlanPage.ts
│   ├── CustomerGroceryListPage.ts
│   ├── CustomerProgressTrackingPage.ts
│   ├── CustomerFavoritesPage.ts
│   └── CustomerDashboardPage.ts
├── shared/                   # Shared across all roles
│   ├── LoginPage.ts
│   ├── NavigationBar.ts
│   ├── ProfilePage.ts
│   └── RegisterPage.ts
└── base/                     # Base classes
    ├── BasePage.ts
    └── BaseComponent.ts
```

## Base Page Object Class

All page objects extend from `BasePage`:

```typescript
// base/BasePage.ts
import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to the page
   */
  abstract navigate(): Promise<void>;

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Click element with wait
   */
  async click(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  /**
   * Fill input field
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).fill(value);
  }

  /**
   * Assert element is visible
   */
  async assertVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Assert text content
   */
  async assertTextContent(selector: string, expectedText: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(expectedText);
  }
}
```

## Page Object Pattern

Each page object should follow this structure:

```typescript
import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';

export class ExamplePage extends BasePage {
  // 1. Define locators as private properties
  private readonly exampleButton = 'button[data-testid="example-button"]';
  private readonly exampleInput = 'input[name="example"]';
  private readonly exampleTitle = '.page-title';

  // 2. Constructor
  constructor(page: Page) {
    super(page);
  }

  // 3. Navigation
  async navigate(): Promise<void> {
    await this.page.goto('/example');
    await this.waitForPageLoad();
  }

  // 4. Interaction methods
  async clickExampleButton(): Promise<void> {
    await this.click(this.exampleButton);
  }

  async fillExampleInput(value: string): Promise<void> {
    await this.fill(this.exampleInput, value);
  }

  async submitForm(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  // 5. Assertion methods
  async assertPageLoaded(): Promise<void> {
    await this.assertVisible(this.exampleTitle);
  }

  async assertExampleButtonVisible(): Promise<void> {
    await this.assertVisible(this.exampleButton);
  }

  // 6. Data retrieval methods
  async getExampleValue(): Promise<string> {
    return await this.page.locator(this.exampleInput).inputValue();
  }

  async getTitleText(): Promise<string> {
    return await this.page.locator(this.exampleTitle).textContent() || '';
  }
}
```

## Naming Conventions

### File Names
- Format: `{RoleName}{PageName}Page.ts`
- Examples:
  - `AdminRecipeManagementPage.ts`
  - `TrainerCustomerManagementPage.ts`
  - `CustomerMealPlanPage.ts`

### Class Names
- Format: `{RoleName}{PageName}Page`
- Examples:
  - `class AdminRecipeManagementPage extends BasePage`
  - `class TrainerCustomerManagementPage extends BasePage`

### Method Names
**Actions:**
- `click{ElementName}()` - Click an element
- `fill{InputName}(value)` - Fill an input
- `submit{FormName}()` - Submit a form
- `select{OptionName}()` - Select an option

**Assertions:**
- `assert{ElementName}Visible()` - Assert element is visible
- `assert{ElementName}Hidden()` - Assert element is hidden
- `assert{Property}Equals(expected)` - Assert value equals expected

**Getters:**
- `get{Property}()` - Get property value
- `is{State}()` - Check boolean state

## Best Practices

### 1. Encapsulate Selectors
✅ **Good:** Selectors as private properties
```typescript
private readonly submitButton = 'button[type="submit"]';
```

❌ **Bad:** Selectors directly in tests
```typescript
await page.click('button[type="submit"]'); // Don't do this in tests
```

### 2. Use Data Test IDs
✅ **Good:** Stable data-testid selectors
```typescript
private readonly saveButton = '[data-testid="save-button"]';
```

❌ **Bad:** Fragile CSS selectors
```typescript
private readonly saveButton = 'div > button.btn.btn-primary'; // Fragile!
```

### 3. Return Page Objects for Chaining
✅ **Good:** Enable method chaining
```typescript
async fillForm(data: FormData): Promise<this> {
  await this.fill(this.nameInput, data.name);
  await this.fill(this.emailInput, data.email);
  return this;
}

// Usage:
await loginPage.fillForm(data).submitForm();
```

### 4. Use Descriptive Method Names
✅ **Good:** Clear intent
```typescript
async clickGenerateRecipesButton(): Promise<void>
async assertRecipeGenerationStarted(): Promise<void>
```

❌ **Bad:** Vague names
```typescript
async click(): Promise<void>
async check(): Promise<void>
```

### 5. Separate Actions and Assertions
✅ **Good:** Separate concerns
```typescript
// Action
async generateRecipes(count: number): Promise<void> {
  await this.fill(this.countInput, count.toString());
  await this.click(this.generateButton);
}

// Assertion
async assertRecipesGenerated(): Promise<void> {
  await this.assertVisible(this.successMessage);
}
```

### 6. Handle Async Operations
✅ **Good:** Wait for operations
```typescript
async submitForm(): Promise<void> {
  await this.click(this.submitButton);
  await this.page.waitForResponse(resp => resp.url().includes('/api/submit'));
  await this.waitForPageLoad();
}
```

## Complex Patterns

### Modal Handling
```typescript
async openModal(): Promise<void> {
  await this.click(this.openModalButton);
  await this.assertVisible(this.modalContainer);
}

async closeModal(): Promise<void> {
  await this.click(this.closeModalButton);
  await this.assertHidden(this.modalContainer);
}

async fillModalForm(data: ModalData): Promise<void> {
  await this.openModal();
  await this.fill(this.modalInput, data.value);
  await this.click(this.modalSubmitButton);
  await this.closeModal();
}
```

### Table Interactions
```typescript
async getRowCount(): Promise<number> {
  return await this.page.locator(this.tableRows).count();
}

async getRowData(rowIndex: number): Promise<RowData> {
  const row = this.page.locator(this.tableRows).nth(rowIndex);
  return {
    name: await row.locator('.name-cell').textContent(),
    status: await row.locator('.status-cell').textContent()
  };
}

async clickRowAction(rowIndex: number, action: 'edit' | 'delete'): Promise<void> {
  const row = this.page.locator(this.tableRows).nth(rowIndex);
  await row.locator(`button[data-action="${action}"]`).click();
}
```

### Form Handling
```typescript
interface FormData {
  name: string;
  email: string;
  role: 'admin' | 'trainer' | 'customer';
}

async fillForm(data: FormData): Promise<void> {
  await this.fill(this.nameInput, data.name);
  await this.fill(this.emailInput, data.email);
  await this.page.selectOption(this.roleSelect, data.role);
}

async submitForm(): Promise<void> {
  await this.click(this.submitButton);
  await this.page.waitForResponse(resp => resp.url().includes('/api/submit'));
}

async fillAndSubmitForm(data: FormData): Promise<void> {
  await this.fillForm(data);
  await this.submitForm();
}
```

## Usage in Tests

```typescript
import { test, expect } from '@playwright/test';
import { RoleAuthHelper } from '../utils/roleTestHelpers';
import { AdminRecipeManagementPage } from '../page-objects/admin/AdminRecipeManagementPage';

test.describe('Admin Recipe Management', () => {
  let adminPage: AdminRecipeManagementPage;

  test.beforeEach(async ({ page }) => {
    await RoleAuthHelper.loginAsAdmin(page);
    adminPage = new AdminRecipeManagementPage(page);
    await adminPage.navigate();
  });

  test('Admin can generate recipes', async () => {
    await adminPage.goToBMADTab();
    await adminPage.fillGenerationForm({
      count: 10,
      mealTypes: ['breakfast', 'lunch'],
      fitnessGoal: 'weight_loss'
    });
    await adminPage.submitGeneration();
    await adminPage.assertGenerationStarted();
  });
});
```

## Maintenance

**When to update page objects:**
- When UI selectors change
- When page structure changes
- When new features are added
- When interaction patterns change

**How to update:**
1. Update selectors in page object
2. Run tests to verify changes
3. Update method signatures if needed
4. Update documentation

---

**Last Updated:** [Current Date]
**Maintained By:** Testing Team
**Related Documentation:**
- `test/MASTER_TEST_ENHANCEMENT_PLAN.md`
- `test/docs/ROLE_BASED_TESTING_GUIDE.md`
- Playwright Page Objects: https://playwright.dev/docs/pom
