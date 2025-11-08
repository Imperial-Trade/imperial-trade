#!/usr/bin/env node

/**
 * Utility script to inspect recent OneSignal notifications.
 *
 * Usage:
 *   export ONESIGNAL_APP_ID="your-app-id"
 *   export ONESIGNAL_API_KEY="your-api-key"
 *   node scripts/check-onesignal-notifications.js [limit]
 *
 * Environment variables required:
 *   ONESIGNAL_APP_ID
 *   ONESIGNAL_API_KEY
 */

const { ONESIGNAL_APP_ID, ONESIGNAL_API_KEY } = process.env;

if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
  console.error('❌ Missing ONESIGNAL_APP_ID or ONESIGNAL_API_KEY in environment.');
  process.exitCode = 1;
  process.exit();
}

const limitArg = Number(process.argv[2]);
const limit = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : 20;

const query = new URLSearchParams({
  app_id: ONESIGNAL_APP_ID,
  limit: String(limit),
});

const endpoint = `https://onesignal.com/api/v1/notifications?${query.toString()}`;

const headers = {
  Authorization: ONESIGNAL_API_KEY.startsWith('os_v2_')
    ? `Bearer ${ONESIGNAL_API_KEY}`
    : `Basic ${ONESIGNAL_API_KEY}`,
  'Content-Type': 'application/json',
};

console.log(`📡 Fetching up to ${limit} notifications for app ${ONESIGNAL_APP_ID}...`);

try {
  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed (${response.status}): ${errorBody}`);
  }

  const payload = await response.json();
  const notifications = Array.isArray(payload.notifications) ? payload.notifications : [];

  console.log(`✅ Received ${notifications.length} notifications (total_count=${payload.total_count ?? 'n/a'}).`);
  console.log('');

  if (notifications.length === 0) {
    console.log('No notifications found.');
    process.exit(0);
  }

  for (const notification of notifications) {
    const heading = notification.headings?.en ?? '[no heading]';
    const content = notification.contents?.en ?? '[no content]';
    const status = [
      `Successful: ${notification.successful ?? 0}`,
      `Failed: ${notification.failed ?? 0}`,
      `Errored: ${notification.errored ?? 0}`,
    ].join(' | ');

    console.log(`🔔 Notification ${notification.id}`);
    console.log(`    Name: ${notification.name ?? '[no internal name]'}`);
    console.log(`    Heading: ${heading}`);
    console.log(`    Content: ${content}`);
    console.log(`    Send After: ${notification.send_after ?? 'n/a'}`);
    console.log(`    URL: ${notification.url ?? 'n/a'}`);
    console.log(`    Status: ${status}`);
    console.log('    ---');
  }
} catch (error) {
  console.error('❌ Unable to fetch notifications:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
