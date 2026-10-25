const { chromium } = require('/srv/Content-Factory/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/srv/gamifyboard-ecosystem/load_test_results/drag_chaos';
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 5 Boards
const BOARDS = [
  { name: 'Team1_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc8606h000go73p47tzd4sl' },
  { name: 'Team2_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc87r5o000ho73p2s4jh9jz' },
  { name: 'Team3_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc88fsn000io73p4xiwylz6' },
  { name: 'Team4_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc8gc8l000jo73p9msq0qrg' },
  { name: 'Supervisor_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvdivlsn000po73phdyl3j9d' },
];

const DEVICES = [
  { name: 'Desktop_1080p', viewport: { width: 1920, height: 1080 } },
  { name: 'MacBook_Air', viewport: { width: 1440, height: 900 } },
  { name: 'Laptop_Compact', viewport: { width: 1366, height: 768 } },
  { name: 'iPad_Pro', viewport: { width: 1024, height: 1366 } },
];

async function simulateWildDraggingUser(browser, participantId, board, device) {
  const context = await browser.newContext({
    viewport: device.viewport,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    console.log(`[P${participantId}] Joining ${board.name} for Chaos Dragging...`);
    await page.goto(board.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const canvas = await page.waitForSelector('canvas', { timeout: 30000 });

    // Wait 5 seconds for initial objects/images to populate
    await page.waitForTimeout(5000);

    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box not found');

    // Perform 8 aggressive click-and-drag actions per user across the board
    for (let action = 0; action < 8; action++) {
      // Pick random source on right side (font cards) or center
      const startX = box.x + box.width * (0.5 + Math.random() * 0.4);
      const startY = box.y + box.height * (0.2 + Math.random() * 0.6);

      // Pick target destination on left / columns
      const endX = box.x + box.width * (0.1 + Math.random() * 0.4);
      const endY = box.y + box.height * (0.2 + Math.random() * 0.6);

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      
      // Move in increments to simulate drag
      const steps = 5;
      for (let s = 1; s <= steps; s++) {
        await page.mouse.move(
          startX + (endX - startX) * (s / steps),
          startY + (endY - startY) * (s / steps)
        );
        await page.waitForTimeout(50);
      }
      await page.mouse.up();
      await page.waitForTimeout(200);
    }

    // Give 3s to let Yjs sync and render
    await page.waitForTimeout(3000);

    // Save final screenshot after chaos
    const shot = path.join(OUTPUT_DIR, `Chaos_P${participantId}_${board.name}.png`);
    await page.screenshot({ path: shot });

    console.log(`[P${participantId}] Dragging completed successfully! (Errors: ${errors.length})`);
    return { participantId, status: 'SUCCESS', errorsCount: errors.length };
  } catch (err) {
    console.log(`[P${participantId}] FAILED: ${err.message}`);
    return { participantId, status: 'FAILED: ' + err.message, errorsCount: errors.length };
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('=== STARTING 50 CONCURRENT DRAG-&-DROP CHAOS TEST ===');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const participants = [];
  let pId = 1;
  for (let b = 0; b < BOARDS.length; b++) {
    const board = BOARDS[b];
    for (let i = 0; i < 10; i++) {
      const device = DEVICES[(pId - 1) % DEVICES.length];
      participants.push({ pId, board, device });
      pId++;
    }
  }

  // Run in 5 concurrent waves of 10 users interacting simultaneously
  const results = [];
  const BATCH_SIZE = 10;
  for (let i = 0; i < participants.length; i += BATCH_SIZE) {
    const batch = participants.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Firing Chaos Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} active draggers) ---`);
    const batchRes = await Promise.all(batch.map(p => simulateWildDraggingUser(browser, p.pId, p.board, p.device)));
    results.push(...batchRes);
  }

  await browser.close();

  console.log('\n=== DRAG-&-DROP CHAOS TEST FINISHED ===');
  const success = results.filter(r => r.status === 'SUCCESS').length;
  console.log(`Summary: ${success} / ${results.length} succeeded without crash.`);
}

main().catch(console.error);
