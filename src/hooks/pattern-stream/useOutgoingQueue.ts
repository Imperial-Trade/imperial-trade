import { useEffect, useRef, useState, useCallback } from "react";

export interface QueuedItem<T = unknown> {
  id: string;
  payload: T;
  attempts: number;
  createdAt: number;
}

const DB_NAME = "ps_outgoing_queue_v1";
const STORE = "queue";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbAll<T>(): Promise<QueuedItem<T>[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result ?? []) as QueuedItem<T>[]);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut<T>(item: QueuedItem<T>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface UseOutgoingQueueOptions<T> {
  send: (payload: T) => Promise<void>;
  /** Filter persisted items at boot (e.g. only this room's queue) */
  filter?: (item: QueuedItem<T>) => boolean;
  /** Backoff in ms */
  retryDelays?: number[];
}

export function useOutgoingQueue<T>(opts: UseOutgoingQueueOptions<T>) {
  const { send, filter, retryDelays = [1000, 3000, 8000, 20000] } = opts;
  const [pending, setPending] = useState<QueuedItem<T>[]>([]);
  const isProcessing = useRef(false);
  const sendRef = useRef(send);
  sendRef.current = send;

  // Boot: load from IndexedDB
  useEffect(() => {
    let cancelled = false;
    dbAll<T>()
      .then((items) => {
        if (cancelled) return;
        const filtered = filter ? items.filter(filter) : items;
        setPending(filtered);
      })
      .catch((e) => console.warn("[ps-queue] failed to load", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(async (payload: T, id?: string): Promise<string> => {
    const item: QueuedItem<T> = {
      id: id ?? `q_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      payload,
      attempts: 0,
      createdAt: Date.now(),
    };
    setPending((prev) => [...prev, item]);
    try {
      await dbPut(item);
    } catch (e) {
      console.warn("[ps-queue] enqueue persist failed", e);
    }
    return item.id;
  }, []);

  const remove = useCallback(async (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
    try {
      await dbDelete(id);
    } catch (e) {
      console.warn("[ps-queue] remove failed", e);
    }
  }, []);

  // Process loop
  useEffect(() => {
    if (isProcessing.current) return;
    if (pending.length === 0) return;
    isProcessing.current = true;

    const head = pending[0];
    let cancelled = false;

    (async () => {
      try {
        await sendRef.current(head.payload);
        if (!cancelled) {
          await remove(head.id);
        }
      } catch (e) {
        console.warn("[ps-queue] send failed", e);
        const attempts = head.attempts + 1;
        const delay = retryDelays[Math.min(attempts - 1, retryDelays.length - 1)];
        await dbPut({ ...head, attempts });
        setPending((prev) => prev.map((p) => (p.id === head.id ? { ...p, attempts } : p)));
        await new Promise((r) => setTimeout(r, delay));
      } finally {
        isProcessing.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pending, remove, retryDelays]);

  return { enqueue, remove, pending, pendingCount: pending.length };
}
