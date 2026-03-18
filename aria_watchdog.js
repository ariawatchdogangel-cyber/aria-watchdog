// ============================================================
// ARIA - WATCHDOG ANGEL for Tammy Adams / LivePsychicChat
// Monitors all sites every 5 minutes
// Texts Tammy at (951) 437-0186 when something breaks
// NEVER fixes anything without Tammy's approval
// ============================================================

const https = require('https');
const http = require('http');

// ---- CONFIGURATION ----
const TAMMY_PHONE = '+19514370186';

// Your Twilio credentials (fill these in from your Twilio account)
const TWILIO_ACCOUNT_SID = 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN  = 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_FROM_NUMBER = 'YOUR_TWILIO_PHONE_NUMBER'; // e.g. +18005551234

// Sites Aria watches
const SITES = [
  { name: 'PsychicChatapp',       url: 'https://psychicchatapp.com' },
  { name: 'PsychicWorldConnect',  url: 'https://psychicworldconnection.com' },
  { name: 'GuidingLightOfficial', url: 'https://guidinglightchatofficial.com' },


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
          resolve({ site, ok: false, issue: `SLOW (${responseTime}ms — usually means something is wrong)`, responseTime });
        } else {
          resolve({ site, ok: true, responseTime });
        }
      } else {
        resolve({ site, ok: false, issue: `HTTP Error ${status}`, responseTime });
      }
    });

    req.on('error', (err) => {
      resolve({ site, ok: false, issue: `SITE DOWN — ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ site, ok: false, issue: 'SITE NOT RESPONDING (timeout)' });
    });
  });
}

// ---- SEND SMS VIA TWILIO ----
function sendSMS(message) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      To:   TAMMY_PHONE,
      From: TWILIO_FROM_NUMBER,
      Body: message,
    }).toString();

    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Aria] SMS sent to Tammy: ${message}`);
        resolve(data);
      });
    });

    req.on('error', (err) => {
      console.error(`[Aria] SMS FAILED: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// ---- MAIN MONITORING LOOP ----
async function ariaChecks() {
  console.log(`\n[Aria] Checking all sites at ${new Date().toLocaleTimeString()}...`);

  const results = await Promise.all(SITES.map(checkSite));

  for (const result of results) {
    const key = `${result.site.name}:${result.issue}`;

    if (!result.ok) {
      console.log(`[Aria] PROBLEM FOUND: ${result.site.name} — ${result.issue}`);

      // Only alert Tammy once per unique issue (no spam)
      if (!alertedIssues.has(key)) {
        alertedIssues.add(key);

        const msg =
          `🚨 ARIA ALERT 🚨\n` +
          `Hi Tammy! I found a problem:\n\n` +
          `Site: ${result.site.name}\n` +
          `Problem: ${result.issue}\n\n` +
          `URL: ${result.site.url}\n\n` +
          `Reply YES to fix it or NO to ignore.\n` +
          `— Aria, your Watchdog Angel 👁️`;

        await sendSMS(msg);
      }
    } else {
      // Site is back up — clear the alert memory so she can alert again if it goes down later
      for (const key of alertedIssues) {
        if (key.startsWith(result.site.name)) {
          alertedIssues.delete(key);
          console.log(`[Aria] ${result.site.name} is back up! ✅`);
        }
      }
      console.log(`[Aria] ${result.site.name} ✅ OK (${result.responseTime}ms)`);
    }
  }
}

// ---- START ARIA ----
console.log('👁️ Aria is awake and watching your sites, Tammy!');
console.log(`📱 Alerts will go to: ${TAMMY_PHONE}`);
console.log(`⏱️  Checking every 5 minutes\n`);

ariaChecks(); // Run immediately on start
setInterval(ariaChecks, CHECK_INTERVAL); // Then every 5 minutes

