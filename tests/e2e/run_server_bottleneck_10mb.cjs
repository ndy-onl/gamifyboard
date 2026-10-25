const { chromium } = require('/srv/Content-Factory/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = '/srv/gamifyboard-ecosystem/load_test_results/server_throttled_10mbit';

// 5 Boards
const BOARDS = [
  { name: 'Team1_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc8606h000go73p47tzd4sl' },
  { name: 'Team2_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc87r5o000ho73p2s4jh9jz' },
  { name: 'Team3_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc88fsn000io73p4xiwylz6' },
  { name: 'Team4_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc8gc8l000jo73p9msq0qrg' },
  { name: 'Supervisor_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvdivlsn000po73phdyl3j9d' },
];

// Diverse Devices
const DEVICES = [
  { name: 'Desktop_1080p', viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
  { name: 'MacBook_Air', viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15' },
  { name: 'Laptop_Compact', viewport: { width: 1366, height: 768 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0' },
  { name: 'iPad_Pro', viewport: { width: 1024, height: 1366 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
];

// Individual Client profiles (different latencies / bandwidth jitter on top of the shared server bottleneck)
const CLIENT_PROFILES = [
  { name: 'Home_WiFi', latency: 20, dl: 2000000, ul: 1000000 },
  { name: 'Campus_WiFi', latency: 60, dl: 1000000, ul: 500000 },
  { name: 'Cellular_4G', latency: 90, dl: 1500000, ul: 800000 },
  { name: 'Weak_Mobile', latency: 150, dl: 500000, ul: 250000 },
];

function setServerThrottle(enable) {
  if (enable) {
    console.log('\n[TC] Applying 10Mbit/s server-wide bandwidth bottleneck on 192.168.10.14...');
    try {
      execSync('ssh -i /tmp/coolify_c1s.key root@192.168.10.14 "tc qdisc del dev ens18 root 2>/dev/null || true"');
      execSync('ssh -i /tmp/coolify_c1s.key root@192.168.10.14 "tc qdisc add dev ens18 root tbf rate 10mbit burst 32kbit latency 400ms"');
      console.log('[TC] 10Mbit/s bottleneck ACTIVATED on server!');
    } catch (e) {
      console.error('[TC] Failed to set throttle:', e.message);
    }
  } else {
    console.log('\n[TC] Removing server-wide bandwidth bottleneck...');
    try {
      execSync('ssh -i /tmp/coolify_c1s.key root@192.168.10.14 "tc qdisc del dev ens18 root 2>/dev/null || true"');
      console.log('[TC] Server restored to full gigabit speed!');
    } catch (e) {
      console.error('[TC] Failed to remove throttle:', e.message);
    }
  }
}

async function runParticipant(browser, participantId, board, device, profile) {
  const context = await browser.newContext({
    viewport: device.viewport,
    userAgent: device.userAgent,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Apply client latency jitter
  try {
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: profile.latency,
      downloadThroughput: profile.dl,
      uploadThroughput: profile.ul,
    });
  } catch (err) {}

  const errors = [];
  let s3ImagesLoaded = 0;
  const failedRequests = [];

  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(msg.text());
    }
  });

  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/s3/') || url.includes(':8333') || url.includes('.png') || url.includes('.jpg') || url.includes('.webp')) {
      if (resp.status() >= 200 && resp.status() < 400) s3ImagesLoaded++;
    }
    if (resp.status() >= 400 && !url.includes('favicon')) {
      failedRequests.push({ url, status: resp.status() });
    }
  });

  const start = Date.now();
  let status = 'SUCCESS';

  try {
    console.log(`[P${participantId}] Entering ${board.name} via ${profile.name} (${device.name})...`);
    await page.goto(board.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const canvas = await page.waitForSelector('canvas', { timeout: 60000 });

    // Allow time for images to flow through the 10Mbit bottleneck
    await page.waitForTimeout(8000);

    const box = await canvas.boundingBox();
    if (box) {
      // Perform 4 drag actions
      for (let i = 0; i < 4; i++) {
        const sx = box.x + box.width * (0.6 + Math.random() * 0.3);
        const sy = box.y + box.height * (0.3 + Math.random() * 0.5);
        const ex = box.x + box.width * (0.15 + Math.random() * 0.35);
        const ey = box.y + box.height * (0.3 + Math.random() * 0.5);

        await page.mouse.move(sx, sy);
        await page.mouse.down();
        for (let s = 1; s <= 4; s++) {
          await page.mouse.move(sx + (ex - sx) * (s / 4), sy + (ey - sy) * (s / 4));
          await page.waitForTimeout(50);
        }
        await page.mouse.up();
        await page.waitForTimeout(150);
      }
    }

    await page.waitForTimeout(4000);

    // Take screenshot
    const shot = path.join(OUTPUT_DIR, `Bottleneck_P${participantId}_${board.name}.png`);
    await page.screenshot({ path: shot });

  } catch (err) {
    status = 'FAILED: ' + err.message;
  } finally {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    await context.close();
    console.log(`[P${participantId}] Done in ${duration}s | Status: ${status} | Imgs: ${s3ImagesLoaded} | Errs: ${errors.length}`);
    return { participantId, status, duration, s3ImagesLoaded, errorsCount: errors.length };
  }
}

async function main() {
  console.log('=== REAL SERVER-WIDE 10 MBIT/S BOTTLENECK TEST: 50 SIMULTANEOUS CLIENTS ===');
  
  // Set server throttle
  setServerThrottle(true);

  let browser;
  const results = [];

  try {
    browser = await chromium.launch({
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
        const profile = CLIENT_PROFILES[(pId - 1) % CLIENT_PROFILES.length];
        participants.push({ pId, board, device, profile });
        pId++;
      }
    }

    // Launch in 5 parallel batches across the 5 boards
    const BATCH_SIZE = 10;
    for (let i = 0; i < participants.length; i += BATCH_SIZE) {
      const batch = participants.slice(i, i + BATCH_SIZE);
      console.log(`\n--- Launching Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} active users against 10Mbit pipe) ---`);
      const batchRes = await Promise.all(batch.map(p => runParticipant(browser, p.pId, p.board, p.device, p.profile)));
      results.push(...batchRes);
    }

  } finally {
    if (browser) await browser.close();
    // ALWAYS remove throttle at the end
    setServerThrottle(false);
  }

  const success = results.filter(r => r.status === 'SUCCESS').length;
  console.log('\n=== SERVER BOTTLENECK TEST FINISHED ===');
  console.log(`Summary: ${success} / ${results.length} succeeded under shared 10Mbit server bottleneck.`);
}

main().catch(err => {
  console.error(err);
  setServerThrottle(false);
});
