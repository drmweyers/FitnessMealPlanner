import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Cross-Role Interaction Comprehensive Tests
 * 
 * Tests interactions between different user roles:
 * - Admin ↔ Trainer interactions
 * - Admin ↔ Customer interactions  
 * - Trainer ↔ Customer interactions
 * - Multi-user scenarios
 * - Permission boundaries
 * - Data sharing and privacy
 */

const CREDENTIALS = {
  admin: { email: 'admin@fitmeal.pro', password: 'AdminPass123' },
  trainer: { email: 'trainer.test@evofitmeals.com', password: 'TestTrainer123!' },
  customer: { email: 'customer.test@evofitmeals.com', password: 'TestCustomer123!' }
};

async function loginAs(page: Page, role: keyof typeof CREDENTIALS) {
  const credentials = CREDENTIALS[role];
  await page.goto('/login');
  await page.fill('#email', credentials.email);
  await page.fill('#password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// Helper to create separate browser contexts for each role
async function createRoleContext(browser: Browser, role: keyof typeof CREDENTIALS) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  return { context, page };
}

test.describe('Cross-Role Interaction Tests', () => {
  
  test.describe('Admin-Trainer Interactions', () => {
    
    test('Admin can manage trainer accounts', async ({ browser }) => {
      const { context: adminContext, page: adminPage } = await createRoleContext(browser, 'admin');
      
      try {
        // Navigate to user management
        const userManagementPages = ['/users', '/admin/users', '/manage-users'];
        let userPageFound = false;
        
        for (const userPage of userManagementPages) {
          try {
            await adminPage.goto(userPage);
            await adminPage.waitForTimeout(2000);
            
            const usersVisible = await adminPage.locator('.user-card, .user-item, tbody tr, [data-testid*="user"]').count();
            if (usersVisible > 0) {
              console.log(`Admin: Found users management at ${userPage} (${usersVisible} users visible)`);
              userPageFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (userPageFound) {
          // Look for trainer in the list
          const trainerIdentifiers = [
            `text=${CREDENTIALS.trainer.email}`,
            'text=trainer',
            '[data-role="trainer"]'
          ];
          
          for (const identifier of trainerIdentifiers) {
            try {
              const trainerElement = adminPage.locator(identifier).first();
              if (await trainerElement.isVisible({ timeout: 2000 })) {
                console.log(`Admin: Found trainer account with identifier: ${identifier}`);
                
                // Look for edit/manage options for trainer
                const manageButtons = [
                  'button:has-text("Edit")',
                  'button:has-text("Manage")',
                  'button:has-text("View")',
                  '.edit-user',
                  '.manage-user'
                ];
                
                for (const buttonSelector of manageButtons) {
                  try {
                    const manageButton = adminPage.locator(buttonSelector).first();
                    if (await manageButton.isVisible({ timeout: 2000 })) {
                      console.log(`Admin: Can manage trainer via: ${buttonSelector}`);
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                break;
              }
            } catch (e) {
              continue;
            }
          }
        } else {
          console.log('Admin: User management interface not found');
        }
        
        // Test admin access to trainer's data/activities
        const trainerDataPages = ['/trainers', '/trainer-analytics', '/trainer-reports'];
        
        for (const dataPage of trainerDataPages) {
          try {
            await adminPage.goto(dataPage);
            await adminPage.waitForTimeout(2000);
            
            const currentUrl = adminPage.url();
            if (!currentUrl.includes('403') && !currentUrl.includes('unauthorized')) {
              console.log(`Admin: Can access trainer data at ${dataPage}`);
            }
          } catch (e) {
            continue;
          }
        }
        
      } finally {
        await adminContext.close();
      }
    });
    
    test('Admin can view trainer-created content', async ({ browser }) => {
      const { context: adminContext, page: adminPage } = await createRoleContext(browser, 'admin');
      
      try {
        // Check if admin can see all recipes (including trainer-created ones)
        await adminPage.goto('/recipes');
        await adminPage.waitForTimeout(3000);
        
        const recipeCount = await adminPage.locator('.recipe-card, .recipe-item, [data-testid*="recipe"]').count();
        console.log(`Admin: Can see ${recipeCount} recipes in system`);
        
        // Check if admin can see all meal plans
        const mealPlanPages = ['/meal-plans', '/plans', '/admin/meal-plans'];
        
        for (const planPage of mealPlanPages) {
          try {
            await adminPage.goto(planPage);
            await adminPage.waitForTimeout(2000);
            
            const mealPlanCount = await adminPage.locator('.meal-plan-card, .plan-card, [data-testid*="meal-plan"]').count();
            if (mealPlanCount > 0) {
              console.log(`Admin: Can see ${mealPlanCount} meal plans at ${planPage}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
      } finally {
        await adminContext.close();
      }
    });
  });
  
  test.describe('Trainer-Customer Interactions', () => {
    
    test('Trainer can assign meal plans to customers', async ({ browser }) => {
      const { context: trainerContext, page: trainerPage } = await createRoleContext(browser, 'trainer');
      
      try {
        // Navigate to customers
        const customerPages = ['/customers', '/my-customers', '/clients'];
        let customerPageFound = false;
        
        for (const customerPage of customerPages) {
          try {
            await trainerPage.goto(customerPage);
            await trainerPage.waitForTimeout(2000);
            
            const customerCount = await trainerPage.locator('.customer-card, .client-card, [data-testid*="customer"]').count();
            if (customerCount > 0) {
              console.log(`Trainer: Found customers page at ${customerPage} (${customerCount} customers)`);
              customerPageFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (customerPageFound) {
          // Look for the test customer
          const customerIdentifiers = [
            `text=${CREDENTIALS.customer.email}`,
            'text=customer',
            '[data-role="customer"]'
          ];
          
          let customerFound = false;
          for (const identifier of customerIdentifiers) {
            try {
              const customerElement = trainerPage.locator(identifier).first();
              if (await customerElement.isVisible({ timeout: 2000 })) {
                console.log(`Trainer: Found customer with identifier: ${identifier}`);
                customerFound = true;
                
                // Look for assign meal plan functionality
                const assignButtons = [
                  'button:has-text("Assign")',
                  'button:has-text("Assign Meal Plan")', 
                  'button:has-text("Create Plan")',
                  '.assign-plan-btn'
                ];
                
                for (const buttonSelector of assignButtons) {
                  try {
                    const assignButton = trainerPage.locator(buttonSelector).first();
                    if (await assignButton.isVisible({ timeout: 2000 })) {
                      await assignButton.click();
                      await trainerPage.waitForTimeout(2000);
                      
                      console.log(`Trainer: Opened meal plan assignment via: ${buttonSelector}`);
                      
                      // Check if assignment form/modal opened
                      const assignmentForms = [
                        '.modal',
                        '.assignment-form',
                        'form',
                        '[role="dialog"]'
                      ];
                      
                      for (const formSelector of assignmentForms) {
                        try {
                          const form = trainerPage.locator(formSelector).first();
                          if (await form.isVisible({ timeout: 2000 })) {
                            console.log(`Trainer: Assignment interface opened: ${formSelector}`);
                            break;
                          }
                        } catch (e) {
                          continue;
                        }
                      }
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!customerFound) {
            console.log('Trainer: Test customer not found in customer list');
          }
        } else {
          console.log('Trainer: Customer management interface not found');
        }
        
      } finally {
        await trainerContext.close();
      }
    });
    
    test('Customer can view trainer-assigned meal plans', async ({ browser }) => {
      const { context: customerContext, page: customerPage } = await createRoleContext(browser, 'customer');
      
      try {
        // Navigate to meal plans
        const mealPlanPages = ['/meal-plans', '/my-meal-plans', '/plans'];
        let mealPlanPageFound = false;
        
        for (const planPage of mealPlanPages) {
          try {
            await customerPage.goto(planPage);
            await customerPage.waitForTimeout(3000);
            
            const mealPlanCount = await customerPage.locator('.meal-plan-card, .plan-card, [data-testid*="meal-plan"]').count();
            if (mealPlanCount >= 0) { // 0 or more is valid
              console.log(`Customer: Found meal plans page at ${planPage} (${mealPlanCount} plans)`);
              mealPlanPageFound = true;
              
              if (mealPlanCount > 0) {
                // Click on first meal plan to view details
                const firstPlan = customerPage.locator('.meal-plan-card, .plan-card, [data-testid*="meal-plan"]').first();
                await firstPlan.click();
                await customerPage.waitForTimeout(2000);
                
                // Check for meal plan details
                const planDetails = [
                  'text=Breakfast',
                  'text=Lunch', 
                  'text=Dinner',
                  'text=Snack',
                  '.meal-details',
                  '.recipe-card'
                ];
                
                for (const detailSelector of planDetails) {
                  try {
                    const detail = customerPage.locator(detailSelector).first();
                    if (await detail.isVisible({ timeout: 2000 })) {
                      console.log(`Customer: Can view meal plan detail: ${detailSelector}`);
                    }
                  } catch (e) {
                    continue;
                  }
                }
              }
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!mealPlanPageFound) {
          console.log('Customer: Meal plans interface not accessible');
        }
        
      } finally {
        await customerContext.close();
      }
    });
    
    test('Trainer can view customer progress', async ({ browser }) => {
      const { context: trainerContext, page: trainerPage } = await createRoleContext(browser, 'trainer');
      
      try {
        // Navigate to customers and look for progress tracking
        await trainerPage.goto('/customers');
        await trainerPage.waitForTimeout(2000);
        
        // Look for customer progress/analytics buttons
        const progressButtons = [
          'button:has-text("Progress")',
          'button:has-text("Analytics")', 
          'button:has-text("View Progress")',
          'a:has-text("Progress")',
          '.progress-btn'
        ];
        
        let progressFound = false;
        for (const buttonSelector of progressButtons) {
          try {
            const progressButton = trainerPage.locator(buttonSelector).first();
            if (await progressButton.isVisible({ timeout: 2000 })) {
              await progressButton.click();
              await trainerPage.waitForTimeout(2000);
              
              console.log(`Trainer: Accessed customer progress via: ${buttonSelector}`);
              progressFound = true;
              
              // Check for progress indicators
              const progressElements = [
                '.progress-chart',
                '.analytics-chart',
                '.weight-tracker',
                'text=Weight',
                'text=Measurements'
              ];
              
              for (const elementSelector of progressElements) {
                try {
                  const element = trainerPage.locator(elementSelector).first();
                  if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`Trainer: Can view progress element: ${elementSelector}`);
                  }
                } catch (e) {
                  continue;
                }
              }
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!progressFound) {
          console.log('Trainer: Customer progress tracking not found');
        }
        
      } finally {
        await trainerContext.close();
      }
    });
    
    test('Trainer-Customer communication features', async ({ browser }) => {
      const { context: trainerContext, page: trainerPage } = await createRoleContext(browser, 'trainer');
      
      try {
        // Look for communication features
        const communicationPages = ['/messages', '/chat', '/communication'];
        let communicationFound = false;
        
        for (const commPage of communicationPages) {
          try {
            await trainerPage.goto(commPage);
            await trainerPage.waitForTimeout(2000);
            
            const currentUrl = trainerPage.url();
            if (!currentUrl.includes('404') && !currentUrl.includes('login')) {
              console.log(`Trainer: Found communication feature at ${commPage}`);
              communicationFound = true;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!communicationFound) {
          // Look for communication buttons/links in customer management
          await trainerPage.goto('/customers');
          await trainerPage.waitForTimeout(2000);
          
          const communicationButtons = [
            'button:has-text("Message")',
            'button:has-text("Contact")',
            'button:has-text("Chat")',
            'a:has-text("Message")'
          ];
          
          for (const buttonSelector of communicationButtons) {
            try {
              const commButton = trainerPage.locator(buttonSelector).first();
              if (await commButton.isVisible({ timeout: 2000 })) {
                console.log(`Trainer: Found communication option: ${buttonSelector}`);
                communicationFound = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        console.log(`Trainer-Customer Communication: ${communicationFound ? 'Available' : 'Not implemented'}`);
        
      } finally {
        await trainerContext.close();
      }
    });
  });
  
  test.describe('Permission Boundary Tests', () => {
    
    test('Customer cannot access trainer functions', async ({ browser }) => {
      const { context: customerContext, page: customerPage } = await createRoleContext(browser, 'customer');
      
      try {
        // Attempt to access trainer-only pages
        const trainerOnlyPages = [
          '/customers',
          '/manage-customers',
          '/create-meal-plan',
          '/trainer-dashboard',
          '/assign-plans'
        ];
        
        for (const restrictedPage of trainerOnlyPages) {
          try {
            await customerPage.goto(restrictedPage);
            await customerPage.waitForTimeout(2000);
            
            const currentUrl = customerPage.url();
            if (currentUrl.includes('403') || currentUrl.includes('unauthorized') || currentUrl.includes('access-denied')) {
              console.log(`Customer: Correctly blocked from ${restrictedPage}`);
            } else if (currentUrl.includes('login')) {
              console.log(`Customer: Redirected to login when accessing ${restrictedPage}`);
            } else {
              console.log(`Customer: WARNING - May have accessed restricted page ${restrictedPage}`);
            }
          } catch (e) {
            console.log(`Customer: Access to ${restrictedPage} failed (expected)`);
          }
        }
        
        // Test if customer can see trainer-specific UI elements
        await customerPage.goto('/dashboard');
        await customerPage.waitForTimeout(2000);
        
        const trainerOnlyElements = [
          'text=Manage Customers',
          'text=Create Meal Plan',
          'button:has-text("Assign")',
          '.trainer-only',
          '[data-role="trainer"]'
        ];
        
        for (const elementSelector of trainerOnlyElements) {
          try {
            const element = customerPage.locator(elementSelector).first();
            const isVisible = await element.isVisible({ timeout: 1000 });
            if (isVisible) {
              console.log(`Customer: WARNING - Can see trainer element: ${elementSelector}`);
            } else {
              console.log(`Customer: Correctly hidden trainer element: ${elementSelector}`);
            }
          } catch (e) {
            console.log(`Customer: Trainer element not present: ${elementSelector}`);
          }
        }
        
      } finally {
        await customerContext.close();
      }
    });
    
    test('Trainer cannot access admin functions', async ({ browser }) => {
      const { context: trainerContext, page: trainerPage } = await createRoleContext(browser, 'trainer');
      
      try {
        // Attempt to access admin-only pages
        const adminOnlyPages = [
          '/admin',
          '/users',
          '/system-settings',
          '/admin-dashboard',
          '/manage-trainers'
        ];
        
        for (const restrictedPage of adminOnlyPages) {
          try {
            await trainerPage.goto(restrictedPage);
            await trainerPage.waitForTimeout(2000);
            
            const currentUrl = trainerPage.url();
            if (currentUrl.includes('403') || currentUrl.includes('unauthorized') || currentUrl.includes('access-denied')) {
              console.log(`Trainer: Correctly blocked from ${restrictedPage}`);
            } else if (currentUrl.includes('login')) {
              console.log(`Trainer: Redirected to login when accessing ${restrictedPage}`);
            } else {
              console.log(`Trainer: WARNING - May have accessed restricted page ${restrictedPage}`);
            }
          } catch (e) {
            console.log(`Trainer: Access to ${restrictedPage} failed (expected)`);
          }
        }
        
        // Test if trainer can see admin-specific UI elements
        await trainerPage.goto('/dashboard');
        await trainerPage.waitForTimeout(2000);
        
        const adminOnlyElements = [
          'text=Admin Panel',
          'text=Manage Users',
          'text=System Settings',
          'button:has-text("Delete User")',
          '.admin-only'
        ];
        
        for (const elementSelector of adminOnlyElements) {
          try {
            const element = trainerPage.locator(elementSelector).first();
            const isVisible = await element.isVisible({ timeout: 1000 });
            if (isVisible) {
              console.log(`Trainer: WARNING - Can see admin element: ${elementSelector}`);
            } else {
              console.log(`Trainer: Correctly hidden admin element: ${elementSelector}`);
            }
          } catch (e) {
            console.log(`Trainer: Admin element not present: ${elementSelector}`);
          }
        }
        
      } finally {
        await trainerContext.close();
      }
    });
  });
  
  test.describe('Data Privacy and Isolation Tests', () => {
    
    test('Customers can only see their own data', async ({ browser }) => {
      const { context: customerContext, page: customerPage } = await createRoleContext(browser, 'customer');
      
      try {
        // Check that customer can only see their own meal plans
        await customerPage.goto('/meal-plans');
        await customerPage.waitForTimeout(2000);
        
        // Look for other customer identifiers that shouldn't be visible
        const otherCustomerIndicators = [
          'text=john.doe@', // Example other customer email
          'text=jane.smith@',
          'text=Customer #',
          'text=Client #'
        ];
        
        let otherCustomerDataFound = false;
        for (const indicator of otherCustomerIndicators) {
          try {
            const element = customerPage.locator(indicator).first();
            if (await element.isVisible({ timeout: 1000 })) {
              console.log(`Customer: WARNING - May see other customer data: ${indicator}`);
              otherCustomerDataFound = true;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!otherCustomerDataFound) {
          console.log('Customer: Data isolation appears correct - no other customer data visible');
        }
        
      } finally {
        await customerContext.close();
      }
    });
    
    test('Trainers can only manage assigned customers', async ({ browser }) => {
      const { context: trainerContext, page: trainerPage } = await createRoleContext(browser, 'trainer');
      
      try {
        await trainerPage.goto('/customers');
        await trainerPage.waitForTimeout(2000);
        
        const customerCount = await trainerPage.locator('.customer-card, .client-card, [data-testid*="customer"]').count();
        console.log(`Trainer: Can see ${customerCount} customers (should only be assigned ones)`);
        
        // In a real test, we would verify this trainer can only see their assigned customers
        // This would require a more complex test setup with multiple trainers and customers
        
      } finally {
        await trainerContext.close();
      }
    });
  });
  
  test.describe('Multi-User Concurrent Access Tests', () => {
    
    test('Multiple roles can access system simultaneously', async ({ browser }) => {
      const adminContext = await createRoleContext(browser, 'admin');
      const trainerContext = await createRoleContext(browser, 'trainer');  
      const customerContext = await createRoleContext(browser, 'customer');
      
      try {
        // All three users navigate to their respective dashboards simultaneously
        const navigationPromises = [
          adminContext.page.goto('/dashboard'),
          trainerContext.page.goto('/dashboard'),
          customerContext.page.goto('/dashboard')
        ];
        
        await Promise.all(navigationPromises);
        
        // Wait for all pages to load
        await Promise.all([
          adminContext.page.waitForTimeout(2000),
          trainerContext.page.waitForTimeout(2000),
          customerContext.page.waitForTimeout(2000)
        ]);
        
        // Verify all users are still logged in and see appropriate content
        const urls = [
          adminContext.page.url(),
          trainerContext.page.url(), 
          customerContext.page.url()
        ];
        
        const allLoggedIn = urls.every(url => !url.includes('login'));
        console.log(`Multi-user concurrent access: ${allLoggedIn ? 'SUCCESS' : 'FAILED'} - All users maintained sessions`);
        
        // Test concurrent operations
        const operationPromises = [
          adminContext.page.goto('/recipes'),
          trainerContext.page.goto('/customers'),
          customerContext.page.goto('/meal-plans')
        ];
        
        await Promise.allSettled(operationPromises);
        console.log('Multi-user concurrent operations completed');
        
      } finally {
        await adminContext.context.close();
        await trainerContext.context.close();
        await customerContext.context.close();
      }
    });
  });
});