/**
 * Device Fingerprinting for Cross-Device OneSignal Support
 * Generates unique fingerprints to identify devices/browsers
 */

export interface DeviceInfo {
  fingerprint: string;
  browserName: string;
  browserVersion: string;
  platform: string;
  isMobile: boolean;
  screenResolution: string;
  timezone: string;
  language: string;
  userAgent: string;
}

export function generateDeviceFingerprint(): DeviceInfo {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let canvasFingerprint = '';
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    canvasFingerprint = canvas.toDataURL();
  }

  const browserInfo = getBrowserInfo();
  const screenRes = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language || 'en-US';
  
  // Create fingerprint components
  const components = [
    browserInfo.name,
    browserInfo.version,
    navigator.platform,
    screenRes,
    timezone,
    language,
    canvasFingerprint.slice(-50), // Last 50 chars of canvas fingerprint
    navigator.hardwareConcurrency?.toString() || '4',
    new Date().getTimezoneOffset().toString()
  ];

  // Generate hash-like fingerprint
  const fingerprint = btoa(components.join('|')).replace(/[+/=]/g, '').slice(0, 32);

  return {
    fingerprint,
    browserName: browserInfo.name,
    browserVersion: browserInfo.version,
    platform: navigator.platform,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    screenResolution: screenRes,
    timezone,
    language,
    userAgent: navigator.userAgent
  };
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    return { name: 'Chrome', version: match?.[1] || 'Unknown' };
  }
  
  if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    return { name: 'Firefox', version: match?.[1] || 'Unknown' };
  }
  
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    return { name: 'Safari', version: match?.[1] || 'Unknown' };
  }
  
  if (userAgent.includes('Edge')) {
    const match = userAgent.match(/Edge\/(\d+)/);
    return { name: 'Edge', version: match?.[1] || 'Unknown' };
  }
  
  return { name: 'Unknown', version: 'Unknown' };
}

export function getStoredDeviceFingerprint(): string | null {
  try {
    return localStorage.getItem('device_fingerprint');
  } catch {
    return null;
  }
}

export function storeDeviceFingerprint(fingerprint: string): void {
  try {
    localStorage.setItem('device_fingerprint', fingerprint);
  } catch {
    // Ignore storage errors
  }
}

export function checkDeviceSubscriptionStatus(userId: string, deviceFingerprint: string): Promise<boolean> {
  // This will be used to check if current device has active subscription
  const key = `onesignal_device_${userId}_${deviceFingerprint}`;
  try {
    return Promise.resolve(localStorage.getItem(key) === 'subscribed');
  } catch {
    return Promise.resolve(false);
  }
}

export function setDeviceSubscriptionStatus(userId: string, deviceFingerprint: string, subscribed: boolean): void {
  const key = `onesignal_device_${userId}_${deviceFingerprint}`;
  try {
    if (subscribed) {
      localStorage.setItem(key, 'subscribed');
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}