// ============================================================
// ARIA - WATCHDOG ANGEL for Tammy Adams / LivePsychicChat
// Monitors all sites every 5 minutes
// WhatsApp alerts to Tammy at (951) 437-0186 via CallMeBot
// NEVER fixes anything without Tammy's approval
// ============================================================

const https = require('https');
const http = require('http');

// ---- CONFIGURATION ----
const TAMMY_PHONE = '19514370186';
const CALLMEBOT_API_KEY = '6555612';

// Sites Aria watches
const SITES = [
  { name: 'PsychicChatapp',       url: 'https://psychicchatapp.com' },
  { name: 'PsychicWorldConnect',  url: 'https://psychicworldconnection.com' },
  { name: 'GuidingLightOfficial', url: 'https://guidinglightchatofficial.com' },
];

// How often to check (milliseconds) — 5 minutes
const CHECK_INTERVAL = 5 * 60 * 1000;

// Max response time before Aria warns you (milliseconds)
const SLOW_THRESHOLD = 5000;

// ---- ARIA'S MEMORY (tracks what she already alerted you about) ----
const alertedIssues = new Set();

// ---- CORE CHECK FUNCTION ----
function checkSite(site) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const protocol = site.url.startsWith('https') ? https : http;

    const req = protocol.get(site.url, { timeout: 10000 }, (res) => {
      const responseTime = Date.now() - startTime;
      const status = res.statusCode;

      if (status >= 200 && status < 400) {
        if (responseTime > SLOW_THRESHOLD) {
          resolve({ site, ok: false, issue: `SLOW (${responseTime}ms)`, responseTime });
        } else {
          resolve({ site, ok: true, responseTime });
        }
      } else {
        resolve({ site, ok: false, issue: `HTTP Error ${status}`, responseTime });
      }
    });

    req.on('error', (err) => {
      resolve({ site, ok: false, issue: `SITE DOWN - ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ site, ok: false, issue: 'SITE NOT RESPONDING (timeout)' });
    });
  });
}

// ---- SEND WHATSAPP ALERT VIA CALLMEBOT ----
function sendWhatsApp(message) {
  return new Promise((resolve, reject) => {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${TAMMY_PHONE}&text=${encodedMessage}&apikey=${CALLMEBOT_API_KEY}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Aria] WhatsApp alert sent to Tammy!`);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`[Aria] WhatsApp FAILED: ${err.message}`);
      reject(err);
    });
  });
}

// ---- MAIN MONITORING LOOP ----
async function ariaChecks() {
  console.log(`\n[Aria] Checking all sites at ${new Date().toLocaleTimeString()}...`);

  const results = await Promise.all(SITES.map(checkSite));

  for (const result of results) {
    const key = `${result.site.name}:${result.issue}`;

    if (!result.ok) {
      console.log(`[Aria] PROBLEM FOUND: ${result.site.name} - ${result.issue}`);

      if (!alertedIssues.has(key)) {
        alertedIssues.add(key);

        const msg =
          `ARIA ALERT\n` +
          `Hi Tammy! I found a problem:\n\n` +
          `Site: ${result.site.name}\n` +
          `Problem: ${result.issue}\n\n` +
          `URL: ${result.site.url}\n\n` +
          `I will NOT fix anything without your approval!\n` +
          `- Aria, your Watchdog Angel`;

        await sendWhatsApp(msg);
      }
    } else {
      for (const key of alertedIssues) {
        if (key.startsWith(result.site.name)) {
          alertedIssues.delete(key);
          console.log(`[Aria] ${result.site.name} is back up! OK`);
        }
      }
      console.log(`[Aria] ${result.site.name} OK (${result.responseTime}ms)`);
    }
  }
}

// ---- START ARIA ----
console.log('Aria is awake and watching your sites, Tammy!');
console.log(`Alerts will go to WhatsApp: ${TAMMY_PHONE}`);
console.log(`Checking every 5 minutes\n`);

ariaChecks();
setInterval(ariaChecks, CHECK_INTERVAL);
