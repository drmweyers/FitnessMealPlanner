#!/usr/bin/env node
/**
 * Generate PDF from HTML file using Puppeteer
 *
 * IMPORTANT: Uses page.setContent() NOT page.goto() to avoid
 * SPA router interception. See feedback_pdf_generation.md.
 *
 * Usage:
 *   node scripts/generate-pdf-from-html.js <input.html> <output.pdf>
 *   node scripts/generate-pdf-from-html.js client/public/downloads/ai-meal-planning-blueprint.html client/public/downloads/AI-Meal-Planning-Blueprint.pdf
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePdf(inputHtml, outputPdf) {
  const htmlPath = path.resolve(inputHtml);
  const pdfPath = path.resolve(outputPdf);

  if (!fs.existsSync(htmlPath)) {
    console.error(`Error: HTML file not found: ${htmlPath}`);
    process.exit(1);
  }

  console.log(`Reading: ${htmlPath}`);
  const html = fs.readFileSync(htmlPath, 'utf8');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // CRITICAL: Use setContent, NOT goto — avoids SPA router interception
  console.log('Loading HTML content...');
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for Google Fonts to load
  console.log('Waiting for fonts...');
  await new Promise(r => setTimeout(r, 3000));

  // Verify content rendered
  const pageCount = await page.evaluate(() => document.querySelectorAll('.page').length);
  const bodyLen = await page.evaluate(() => document.body.innerText.length);
  console.log(`Content: ${pageCount} pages, ${bodyLen} chars`);

  if (bodyLen < 100) {
    console.error('Error: HTML content did not render properly');
    await browser.close();
    process.exit(1);
  }

  // Generate PDF
  console.log(`Generating PDF: ${pdfPath}`);
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true
  });

  const stats = fs.statSync(pdfPath);
  console.log(`Done! ${(stats.size / 1024).toFixed(1)} KB — ${pageCount} pages`);

  await browser.close();
}

// CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node generate-pdf-from-html.js <input.html> <output.pdf>');
  process.exit(1);
}

generatePdf(args[0], args[1]).catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
