import { nanoid } from 'nanoid';

export interface NotificationEvent {
  id?: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  eventKey?: string;
  deliveryChannel?: string;
  timestamp?: Date | string;
  priority?: number;
  source?: string;
}

type Listener = (event: NotificationEvent) => void;

const listeners = new Set<Listener>();
const queuedEvents: NotificationEvent[] = [];
const seenEventKeys = new Map<string, number>();
const EVENT_TTL_MS = 60_000;

const cloneEvent = (event: NotificationEvent): NotificationEvent => ({
  ...event,
  metadata: event.metadata ? { ...event.metadata } : undefined,
});

const pruneEventKeys = () => {
  const now = Date.now();
  for (const [key, timestamp] of seenEventKeys.entries()) {
    if (now - timestamp > EVENT_TTL_MS) {
      seenEventKeys.delete(key);
    }
  }
};

const dispatchToListeners = (event: NotificationEvent) => {
  pruneEventKeys();
  const dedupKey = event.eventKey || event.id;
  if (dedupKey) {
    const lastSeen = seenEventKeys.get(dedupKey);
    if (lastSeen && Date.now() - lastSeen < EVENT_TTL_MS) {
      return;
    }
    seenEventKeys.set(dedupKey, Date.now());
  }

  let handled = false;
  listeners.forEach((listener) => {
    try {
      listener(event);
      handled = true;
    } catch (error) {
      console.error('NotificationBus listener error:', error);
    }
  });

  if (!handled) {
    // Re-queue for later if nobody processed it
    queuedEvents.push(cloneEvent(event));
  }
};

export const emitNotification = (
  event: NotificationEvent,
  options: { queueIfNoListeners?: boolean } = {}
) => {
  const enrichedEvent: NotificationEvent = {
    ...event,
    id: event.id ?? nanoid(),
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
  };

  if (listeners.size === 0) {
    if (options.queueIfNoListeners !== false) {
      queuedEvents.push(cloneEvent(enrichedEvent));
    }
    return;
  }

  dispatchToListeners(enrichedEvent);
};

export const subscribeToNotifications = (
  listener: Listener,
  options: { flushQueued?: boolean } = {}
) => {
  listeners.add(listener);

  if (options.flushQueued !== false && queuedEvents.length > 0) {
    const pending = queuedEvents.splice(0, queuedEvents.length);
    pending.forEach((event) => {
      try {
        listener(event);
      } catch (error) {
        console.error('NotificationBus listener error (queued event):', error);
      }
    });
  }

  return () => {
    listeners.delete(listener);
  };
};

// Ensure browser environments expose a compatible global helper
if (typeof window !== 'undefined') {
  const globalWindow = window as typeof window & {
    addNotification?: (event: NotificationEvent) => void;
    __notificationBusEmit__?: typeof emitNotification;
  };

  if (!globalWindow.__notificationBusEmit__) {
    globalWindow.__notificationBusEmit__ = emitNotification;
  }

  globalWindow.addNotification = (event: NotificationEvent) => {
    globalWindow.__notificationBusEmit__?.(event);
  };
}

