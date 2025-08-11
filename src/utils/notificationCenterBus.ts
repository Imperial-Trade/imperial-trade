
export const OPEN_NOTIFICATION_CENTER_EVENT = 'open-notification-center';

export function openNotificationCenter() {
  window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATION_CENTER_EVENT));
}

export function onOpenNotificationCenter(handler: () => void) {
  const listener = () => handler();
  window.addEventListener(OPEN_NOTIFICATION_CENTER_EVENT, listener as EventListener);
  return () => window.removeEventListener(OPEN_NOTIFICATION_CENTER_EVENT, listener as EventListener);
}
