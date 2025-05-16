const { test } = require('@playwright/test');
const fs = require('fs');

test.describe.configure({ mode: 'serial' });
test.setTimeout(120000); // 2 minutes per test

const urls = fs.readFileSync('urls.txt', 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0);

const passed = [];
const failed = [];
const linkResults = {}; // { url: { passed: [], failed: [] } }

// Helper for per-step timeout
async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), ms))
  ]);
}

for (const url of urls) {
  console.log(`Starting tests for: ${url}`);

  // Test for homepage title
  test(`homepage of ${url} has a title`, async ({ page }) => {
    let title = '';
    let result = 'FAIL';
    try {
      await page.goto(url, { timeout: 60000 });

      // Try to handle common cookie consent popups universally
      const consentButtons = [
        'button:has-text("Accept")',
        'button:has-text("I Accept")',
        'button:has-text("Agree")',
        'button:has-text("Yes, I agree")',
        'button:has-text("Allow all")',
        'button:has-text("OK")'
      ];

      for (const selector of consentButtons) {
        const button = page.locator(selector);
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          await button.click().catch(() => {});
          break;
        }
      }

      title = await page.title();
      result = title ? 'PASS' : 'FAIL';
    } catch (e) {
      const msg = e.message.split('\n')[0];
      if (msg.includes('timeout')) {
        title = 'SITE TIMEOUT';
      } else {
        title = `Error: ${msg}`;
      }
    }

    if (result === 'PASS') {
      passed.push({ url, title });
    } else {
      failed.push({ url, title });
    }
  });

  // Test for all <a> links on the page
  test(`all links on ${url} are reachable`, async ({ page }) => {
    linkResults[url] = { passed: [], failed: [] };
    try {
      await withTimeout(page.goto(url, { timeout: 60000 }), 65000);

      // Limit to first 20 links for speed and reliability
      const links = (await page.$$eval('a[href]', as =>
        as.map(a => ({ href: a.href, text: a.innerText.trim() }))
      )).slice(0, 20);

      for (const link of links) {
        // Skip empty, anchor, or mailto/tel links
        if (
          !link.href ||
          link.href.startsWith('mailto:') ||
          link.href.startsWith('tel:') ||
          link.href.startsWith('#')
        ) continue;

        try {
          const response = await withTimeout(page.goto(link.href, { timeout: 5000 }), 7000);
          const status = response ? response.status() : 'No Response';
          if (status === 200) {
            linkResults[url].passed.push({ text: link.text, href: link.href });
          } else {
            linkResults[url].failed.push({ text: link.text, href: link.href, status });
          }
          await withTimeout(page.goBack(), 7000);
        } catch (e) {
          linkResults[url].failed.push({ text: link.text, href: link.href, error: e.message.split('\n')[0] });
          await withTimeout(page.goBack().catch(() => {}), 7000);
        }
      }
    } catch (e) {
      // If the whole test fails, log the error for this URL
      linkResults[url].failed.push({ text: 'ALL LINKS', href: url, error: 'Could not load page or links: ' + e.message.split('\n')[0] });
    }
  });
}

test.afterAll(async () => {
  let log = '--- PASSED ---\n';
  for (const entry of passed) {
    log += `URL: ${entry.url}, Title: ${entry.title}\n`;
    if (linkResults[entry.url]) {
      log += `  Links Passed:\n`;
      for (const link of linkResults[entry.url].passed) {
        log += `    [PASS] ${link.text} -> ${link.href}\n`;
      }
      log += `  Links Failed:\n`;
      for (const link of linkResults[entry.url].failed) {
        log += `    [FAIL] ${link.text} -> ${link.href}`;
        if (link.status) log += ` (status: ${link.status})`;
        if (link.error) log += ` (error: ${link.error})`;
        log += `\n`;
      }
    }
  }
  log += '\n--- FAILED ---\n';
  for (const entry of failed) {
    log += `URL: ${entry.url}, Title: ${entry.title}\n`;
    if (linkResults[entry.url]) {
      log += `  Links Passed:\n`;
      for (const link of linkResults[entry.url].passed) {
        log += `    [PASS] ${link.text} -> ${link.href}\n`;
      }
      log += `  Links Failed:\n`;
      for (const link of linkResults[entry.url].failed) {
        log += `    [FAIL] ${link.text} -> ${link.href}`;
        if (link.status) log += ` (status: ${link.status})`;
        if (link.error) log += ` (error: ${link.error})`;
        log += `\n`;
      }
    }
  }
  fs.writeFileSync('test-log.txt', log);
});