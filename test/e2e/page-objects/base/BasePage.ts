/**
 * BasePage - Abstract base class for all page objects
 *
 * Provides common functionality for page interactions, waiting, and assertions.
 * All page objects should extend this class.
 *
 * @example
 * ```typescript
 * export class LoginPage extends BasePage {
 *   constructor(page: Page) {
 *     super(page);
 *   }
 *
 *   async navigate(): Promise<void> {
 *     await this.page.goto('/login');
 *     await this.waitForPageLoad();
 *   }
 * }
 * ```
 */

import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to the page - must be implemented by subclasses
   */
  abstract navigate(): Promise<void>;

  // ============================================================================
  // NAVIGATION & WAITING
  // ============================================================================

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for DOM content to be loaded
   */
  async waitForDOMContentLoaded(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for specific network response
   * @param urlPattern - URL pattern to match (can be string or regex)
   */
  async waitForResponse(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(resp => {
      if (typeof urlPattern === 'string') {
        return resp.url().includes(urlPattern);
      }
      return urlPattern.test(resp.url());
    });
  }

  /**
   * Wait for element to be visible
   * @param selector - CSS selector or data-testid
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForVisible(selector: string, timeout?: number): Promise<void> {
    await this.page.locator(selector).waitFor({
      state: 'visible',
      timeout
    });
  }

  /**
   * Wait for element to be hidden
   * @param selector - CSS selector or data-testid
   * @param timeout - Optional timeout in milliseconds
   */
  async waitForHidden(selector: string, timeout?: number): Promise<void> {
    await this.page.locator(selector).waitFor({
      state: 'hidden',
      timeout
    });
  }

  // ============================================================================
  // ELEMENT INTERACTIONS
  // ============================================================================

  /**
   * Click an element
   * @param selector - CSS selector or data-testid
   */
  async click(selector: string): Promise<void> {
    await this.page.locator(selector).click();
  }

  /**
   * Double click an element
   * @param selector - CSS selector or data-testid
   */
  async doubleClick(selector: string): Promise<void> {
    await this.page.locator(selector).dblclick();
  }

  /**
   * Right click an element
   * @param selector - CSS selector or data-testid
   */
  async rightClick(selector: string): Promise<void> {
    await this.page.locator(selector).click({ button: 'right' });
  }

  /**
   * Fill an input field
   * @param selector - CSS selector or data-testid
   * @param value - Value to fill
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).fill(value);
  }

  /**
   * Clear an input field
   * @param selector - CSS selector or data-testid
   */
  async clear(selector: string): Promise<void> {
    await this.page.locator(selector).clear();
  }

  /**
   * Select option from dropdown
   * @param selector - CSS selector or data-testid
   * @param value - Option value to select
   */
  async selectOption(selector: string, value: string): Promise<void> {
    await this.page.locator(selector).selectOption(value);
  }

  /**
   * Check a checkbox
   * @param selector - CSS selector or data-testid
   */
  async check(selector: string): Promise<void> {
    await this.page.locator(selector).check();
  }

  /**
   * Uncheck a checkbox
   * @param selector - CSS selector or data-testid
   */
  async uncheck(selector: string): Promise<void> {
    await this.page.locator(selector).uncheck();
  }

  /**
   * Upload file
   * @param selector - File input selector
   * @param filePath - Path to file to upload
   */
  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.page.locator(selector).setInputFiles(filePath);
  }

  /**
   * Press keyboard key
   * @param key - Key to press (e.g., 'Enter', 'Escape')
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Type text with delay (simulates human typing)
   * @param selector - CSS selector or data-testid
   * @param text - Text to type
   * @param delay - Delay between keystrokes in milliseconds (default: 100)
   */
  async type(selector: string, text: string, delay: number = 100): Promise<void> {
    await this.page.locator(selector).pressSequentially(text, { delay });
  }

  // ============================================================================
  // ELEMENT QUERIES
  // ============================================================================

  /**
   * Get locator for element
   * @param selector - CSS selector or data-testid
   */
  getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /**
   * Check if element is visible
   * @param selector - CSS selector or data-testid
   */
  async isVisible(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isVisible();
  }

  /**
   * Check if element is hidden
   * @param selector - CSS selector or data-testid
   */
  async isHidden(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isHidden();
  }

  /**
   * Check if element is enabled
   * @param selector - CSS selector or data-testid
   */
  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isEnabled();
  }

  /**
   * Check if element is disabled
   * @param selector - CSS selector or data-testid
   */
  async isDisabled(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isDisabled();
  }

  /**
   * Check if checkbox is checked
   * @param selector - CSS selector or data-testid
   */
  async isChecked(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isChecked();
  }

  /**
   * Get text content of element
   * @param selector - CSS selector or data-testid
   */
  async getText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Get inner text of element
   * @param selector - CSS selector or data-testid
   */
  async getInnerText(selector: string): Promise<string> {
    return await this.page.locator(selector).innerText();
  }

  /**
   * Get value of input field
   * @param selector - CSS selector or data-testid
   */
  async getValue(selector: string): Promise<string> {
    return await this.page.locator(selector).inputValue();
  }

  /**
   * Get attribute value
   * @param selector - CSS selector or data-testid
   * @param attribute - Attribute name
   */
  async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.page.locator(selector).getAttribute(attribute);
  }

  /**
   * Count number of elements matching selector
   * @param selector - CSS selector or data-testid
   */
  async count(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }

  // ============================================================================
  // ASSERTIONS
  // ============================================================================

  /**
   * Assert element is visible
   * @param selector - CSS selector or data-testid
   */
  async assertVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  /**
   * Assert element is hidden
   * @param selector - CSS selector or data-testid
   */
  async assertHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  /**
   * Assert element is enabled
   * @param selector - CSS selector or data-testid
   */
  async assertEnabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeEnabled();
  }

  /**
   * Assert element is disabled
   * @param selector - CSS selector or data-testid
   */
  async assertDisabled(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeDisabled();
  }

  /**
   * Assert checkbox is checked
   * @param selector - CSS selector or data-testid
   */
  async assertChecked(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeChecked();
  }

  /**
   * Assert checkbox is unchecked
   * @param selector - CSS selector or data-testid
   */
  async assertUnchecked(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).not.toBeChecked();
  }

  /**
   * Assert text content equals expected value
   * @param selector - CSS selector or data-testid
   * @param expectedText - Expected text content
   */
  async assertTextEquals(selector: string, expectedText: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(expectedText);
  }

  /**
   * Assert text content contains expected value
   * @param selector - CSS selector or data-testid
   * @param expectedText - Expected text substring
   */
  async assertTextContains(selector: string, expectedText: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(expectedText);
  }

  /**
   * Assert input value equals expected value
   * @param selector - CSS selector or data-testid
   * @param expectedValue - Expected input value
   */
  async assertValueEquals(selector: string, expectedValue: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveValue(expectedValue);
  }

  /**
   * Assert attribute equals expected value
   * @param selector - CSS selector or data-testid
   * @param attribute - Attribute name
   * @param expectedValue - Expected attribute value
   */
  async assertAttributeEquals(selector: string, attribute: string, expectedValue: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveAttribute(attribute, expectedValue);
  }

  /**
   * Assert count of elements
   * @param selector - CSS selector or data-testid
   * @param expectedCount - Expected number of elements
   */
  async assertCount(selector: string, expectedCount: number): Promise<void> {
    await expect(this.page.locator(selector)).toHaveCount(expectedCount);
  }

  /**
   * Assert URL contains path
   * @param path - Expected URL path or substring
   */
  async assertURLContains(path: string): Promise<void> {
    expect(this.page.url()).toContain(path);
  }

  /**
   * Assert URL equals path
   * @param url - Expected URL
   */
  async assertURLEquals(url: string): Promise<void> {
    expect(this.page.url()).toBe(url);
  }

  /**
   * Assert page title equals expected
   * @param expectedTitle - Expected page title
   */
  async assertTitleEquals(expectedTitle: string): Promise<void> {
    await expect(this.page).toHaveTitle(expectedTitle);
  }

  /**
   * Assert page title contains expected text
   * @param expectedText - Expected title substring
   */
  async assertTitleContains(expectedText: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(expectedText));
  }

  // ============================================================================
  // TABLE OPERATIONS
  // ============================================================================

  /**
   * Get row count in table
   * @param tableSelector - Table selector
   * @param rowSelector - Row selector (default: 'tbody tr')
   */
  async getTableRowCount(tableSelector: string, rowSelector: string = 'tbody tr'): Promise<number> {
    return await this.page.locator(`${tableSelector} ${rowSelector}`).count();
  }

  /**
   * Get text from table cell
   * @param tableSelector - Table selector
   * @param row - Row index (0-based)
   * @param column - Column index (0-based)
   */
  async getTableCellText(tableSelector: string, row: number, column: number): Promise<string> {
    return await this.page.locator(`${tableSelector} tbody tr:nth-child(${row + 1}) td:nth-child(${column + 1})`).textContent() || '';
  }

  /**
   * Click cell in table
   * @param tableSelector - Table selector
   * @param row - Row index (0-based)
   * @param column - Column index (0-based)
   */
  async clickTableCell(tableSelector: string, row: number, column: number): Promise<void> {
    await this.page.locator(`${tableSelector} tbody tr:nth-child(${row + 1}) td:nth-child(${column + 1})`).click();
  }

  // ============================================================================
  // MODAL OPERATIONS
  // ============================================================================

  /**
   * Wait for modal to be visible
   * @param modalSelector - Modal container selector
   */
  async waitForModal(modalSelector: string): Promise<void> {
    await this.waitForVisible(modalSelector);
  }

  /**
   * Close modal by clicking close button
   * @param closeButtonSelector - Close button selector
   */
  async closeModal(closeButtonSelector: string): Promise<void> {
    await this.click(closeButtonSelector);
  }

  /**
   * Close modal by pressing Escape key
   */
  async closeModalByEscape(): Promise<void> {
    await this.pressKey('Escape');
  }

  // ============================================================================
  // SCROLL OPERATIONS
  // ============================================================================

  /**
   * Scroll element into view
   * @param selector - CSS selector or data-testid
   */
  async scrollIntoView(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Scroll to top of page
   */
  async scrollToTop(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Scroll to bottom of page
   */
  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  // ============================================================================
  // SCREENSHOT OPERATIONS
  // ============================================================================

  /**
   * Take screenshot of page
   * @param filename - Screenshot filename
   */
  async takeScreenshot(filename: string): Promise<void> {
    await this.page.screenshot({ path: filename, fullPage: true });
  }

  /**
   * Take screenshot of element
   * @param selector - CSS selector or data-testid
   * @param filename - Screenshot filename
   */
  async takeElementScreenshot(selector: string, filename: string): Promise<void> {
    await this.page.locator(selector).screenshot({ path: filename });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Reload page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  /**
   * Go back in browser history
   */
  async goBack(): Promise<void> {
    await this.page.goBack();
    await this.waitForPageLoad();
  }

  /**
   * Go forward in browser history
   */
  async goForward(): Promise<void> {
    await this.page.goForward();
    await this.waitForPageLoad();
  }

  /**
   * Get current URL
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Pause execution (for debugging)
   * @param timeout - Pause duration in milliseconds
   */
  async pause(timeout: number = 1000): Promise<void> {
    await this.page.waitForTimeout(timeout);
  }
}
