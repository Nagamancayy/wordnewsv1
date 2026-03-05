import { test, expect } from '@playwright/test';

test('debug map layers on live vercel', async ({ page }) => {
  console.log('--- STARTING PLAYWRIGHT DEBUG ---');
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`BROWSER ${msg.type().toUpperCase()}:`, msg.text());
    }
  });

  page.on('response', async res => {
    if (res.status() >= 400 && res.url().includes('api/conflict')) {
      console.log(`B-NETWORK-ERROR [${res.status()}]: ${res.url()}`);
      try {
        const text = await res.text();
        console.log(`B-NETWORK-BODY: ${text.substring(0, 150)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('http://localhost:3001/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/Users/prasetiyo-valortek/.gemini/antigravity/brain/ea864735-c631-4b20-8fa4-3ed6ffbe84e2/playwright_5s.png' });
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/Users/prasetiyo-valortek/.gemini/antigravity/brain/ea864735-c631-4b20-8fa4-3ed6ffbe84e2/playwright_10s.png' });
  } catch (err) {
    console.log('Navigation timeout, taking emergency screenshot...');
    await page.screenshot({ path: '/Users/prasetiyo-valortek/.gemini/antigravity/brain/ea864735-c631-4b20-8fa4-3ed6ffbe84e2/playwright_emergency.png' });
  }
  console.log('--- FINISHED PLAYWRIGHT DEBUG ---');
});
