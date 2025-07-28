import { Page } from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs/promises';
import path from 'path';
import { testConfig } from '../puppeteer.config';

export class VisualTesting {
  private static baselineDir = path.join(process.cwd(), testConfig.screenshotsPath, 'baseline');
  private static actualDir = path.join(process.cwd(), testConfig.screenshotsPath, 'actual');
  private static diffDir = path.join(process.cwd(), testConfig.screenshotsPath, 'diff');

  static async setupDirectories(): Promise<void> {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.actualDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  static async captureBaseline(page: Page, testName: string): Promise<string> {
    await this.setupDirectories();
    
    const filename = `${testName}.png`;
    const filepath = path.join(this.baselineDir, filename);
    
    await page.screenshot({
      path: filepath,
      fullPage: true,
      type: 'png'
    });
    
    return filepath;
  }

  static async compareScreenshot(page: Page, testName: string): Promise<{
    match: boolean;
    diffPercentage: number;
    diffPath?: string;
  }> {
    await this.setupDirectories();
    
    const filename = `${testName}.png`;
    const baselinePath = path.join(this.baselineDir, filename);
    const actualPath = path.join(this.actualDir, filename);
    const diffPath = path.join(this.diffDir, filename);
    
    // Take current screenshot
    await page.screenshot({
      path: actualPath,
      fullPage: true,
      type: 'png'
    });
    
    // Check if baseline exists
    try {
      await fs.access(baselinePath);
    } catch {
      // No baseline exists, copy current as baseline
      await fs.copyFile(actualPath, baselinePath);
      return { match: true, diffPercentage: 0 };
    }
    
    // Load images
    const baselineBuffer = await fs.readFile(baselinePath);
    const actualBuffer = await fs.readFile(actualPath);
    
    const baselineImg = PNG.sync.read(baselineBuffer);
    const actualImg = PNG.sync.read(actualBuffer);
    
    // Ensure images are same size
    if (baselineImg.width !== actualImg.width || baselineImg.height !== actualImg.height) {
      throw new Error(`Image dimensions don't match: baseline(${baselineImg.width}x${baselineImg.height}) vs actual(${actualImg.width}x${actualImg.height})`);
    }
    
    // Compare images
    const diffImg = new PNG({ width: baselineImg.width, height: baselineImg.height });
    const diffPixels = pixelmatch(
      baselineImg.data,
      actualImg.data,
      diffImg.data,
      baselineImg.width,
      baselineImg.height,
      {
        threshold: 0.1,
        diffColor: [255, 0, 0],
        diffColorAlt: [0, 255, 0],
      }
    );
    
    const totalPixels = baselineImg.width * baselineImg.height;
    const diffPercentage = (diffPixels / totalPixels) * 100;
    
    const match = diffPercentage <= testConfig.visualDiffThreshold;
    
    if (!match) {
      // Save diff image
      await fs.writeFile(diffPath, PNG.sync.write(diffImg));
      return { match: false, diffPercentage, diffPath };
    }
    
    return { match: true, diffPercentage };
  }

  static async waitForAnimations(page: Page): Promise<void> {
    // Wait for CSS animations and transitions to complete
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 100);
        });
        
        let timeout = setTimeout(() => {
          observer.disconnect();
          resolve();
        }, 100);
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
      });
    });
    
    // Additional wait for any remaining animations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  static async hideVolatileElements(page: Page): Promise<void> {
    // Hide elements that change frequently (timestamps, etc.)
    await page.evaluate(() => {
      const volatileSelectors = [
        '[data-testid="timestamp"]',
        '.timestamp',
        '[data-testid="last-updated"]',
        '.relative-time',
        '[data-testid="loading"]',
        '.loading-spinner'
      ];
      
      volatileSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });
    });
  }
}