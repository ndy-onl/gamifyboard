const { chromium } = require('/srv/Content-Factory/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = '/srv/gamifyboard-ecosystem/load_test_results';

// 5 Boards
const BOARDS = [
  { name: 'Team1_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc8606h000go73p47tzd4sl' },
  { name: 'Team2_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc87r5o000ho73p2s4jh9jz' },
  { name: 'Team3_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc88fsn000io73p4xiwylz6' },
  { name: 'Team4_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvc8gc8l000jo73p9msq0qrg' },
  { name: 'Supervisor_LooknFeel', url: 'https://app.alpha.gamifyboard.com/?id=cmvdivlsn000po73phdyl3j9d' },
];

// Diverse Devices & User Agents
const DEVICES = [
  { name: 'Desktop_1080p', viewport: { width: 1920, height: 1080 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
  { name: 'MacBook_Air', viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15' },
  { name: 'Laptop_Compact', viewport: { width: 1366, height: 768 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0' },
  { name: 'iPad_Pro', viewport: { width: 1024, height: 1366 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  { name: 'Windows_Edge', viewport: { width: 1536, height: 864 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0' },
];

// Diverse Network Conditions (CDP network throttling emulation)
const NETWORKS = [
  { name: 'Fast_WiFi', offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 10 },
  { name: 'Normal_WiFi', offline: false, downloadThroughput: 10 * 1024 * 1024 / 8, uploadThroughput: 5 * 1024 * 1024 / 8, latency: 40 },
  { name: 'Good_4G', offline: false, downloadThroughput: 4 * 1024 * 1024 / 8, uploadThroughput: 2 * 1024 * 1024 / 8, latency: 80 },
  { name: 'Slow_Campus_WiFi', offline: false, downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 150 },
];

async function runParticipant(browser, participantId, board, device, network, report) {
  const context = await browser.newContext({
    viewport: device.viewport,
    userAgent: device.userAgent,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Apply network throttling via CDP
  try {
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    if (network.downloadThroughput !== -1) {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: network.latency,
        downloadThroughput: network.downloadThroughput,
        uploadThroughput: network.uploadThroughput,
      });
    }
  } catch (err) {
    // Non-CDP fallback if any
  }

  const errors = [];
  const failedRequests = [];
  let s3ImagesLoaded = 0;

  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore benign canvas or favicon errors if any
      if (!txt.includes('favicon')) {
        errors.push(txt);
      }
    }
  });

  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/s3/') || url.includes(':8333') || url.includes('.png') || url.includes('.jpg') || url.includes('.webp')) {
      if (resp.status() >= 200 && resp.status() < 400) {
        s3ImagesLoaded++;
      }
    }
    if (resp.status() >= 400 && !url.includes('favicon')) {
      failedRequests.push({ url, status: resp.status() });
    }
  });

  const start = Date.now();
  let status = 'SUCCESS';
  let canvasFound = false;

  try {
    console.log(`[P${participantId}] Joining ${board.name} (${device.name}, ${network.name})...`);
    await page.goto(board.url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Wait for canvas or Excalidraw UI
    await page.waitForSelector('canvas', { timeout: 35000 });
    canvasFound = true;

    // Give Yjs websocket and images 10-15s to settle and render
    await page.waitForTimeout(10000);

    // Save screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `P${participantId}_${board.name}_${device.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

  } catch (err) {
    status = 'FAILED: ' + err.message;
  } finally {
    const duration = ((Date.now() - start) / 1000).toFixed(1);
    await context.close();

    const result = {
      participantId,
      board: board.name,
      device: device.name,
      network: network.name,
      durationSec: duration,
      status,
      canvasFound,
      s3ImagesLoaded,
      failedRequestsCount: failedRequests.length,
      failedRequests: failedRequests.slice(0, 5),
      errorsCount: errors.length,
      errors: errors.slice(0, 5),
    };
    report.push(result);
    console.log(`[P${participantId}] Finished in ${duration}s - Status: ${status} (Images: ${s3ImagesLoaded}, Errs: ${errors.length})`);
  }
}

async function main() {
  console.log('=== STARTING 50 PARTICIPANT CONCURRENT LOAD SIMULATION ===');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const report = [];
  const participants = [];

  // Generate 50 participants: 10 per board
  let pId = 1;
  for (let bIdx = 0; bIdx < BOARDS.length; bIdx++) {
    const board = BOARDS[bIdx];
    for (let i = 0; i < 10; i++) {
      const device = DEVICES[(pId - 1) % DEVICES.length];
      const network = NETWORKS[(pId - 1) % NETWORKS.length];
      participants.push({ pId, board, device, network });
      pId++;
    }
  }

  // Run in concurrent batches of 10 to simulate real parallel bursts without crashing local Node RAM
  const BATCH_SIZE = 10;
  for (let i = 0; i < participants.length; i += BATCH_SIZE) {
    const batch = participants.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Launching Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} participants) ---`);
    await Promise.all(batch.map(p => runParticipant(browser, p.pId, p.board, p.device, p.network, report)));
  }

  await browser.close();

  const reportPath = path.join(OUTPUT_DIR, 'summary_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n=== LOAD TEST COMPLETED ===');
  console.log(`Total participants simulated: ${report.length}`);
  const successCount = report.filter(r => r.status === 'SUCCESS').length;
  console.log(`Success: ${successCount} / ${report.length}`);
  const failed = report.filter(r => r.status !== 'SUCCESS');
  if (failed.length > 0) {
    console.log(`Failed participants: ${failed.length}`);
    failed.forEach(f => console.log(` - P${f.participantId} (${f.board}): ${f.status}`));
  }
}

main().catch(console.error);
