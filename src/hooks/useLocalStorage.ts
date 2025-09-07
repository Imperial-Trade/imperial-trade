
// Imperative localStorage helper (no React hooks) to avoid dispatcher errors
// Returns a tuple: [value, setValue, removeValue]
export function useLocalStorage<T>(key: string, initialValue: T) {
  console.warn('[DEBUG] useLocalStorage invoked for key:', key);

  let current: T = initialValue;
  try {
    const item = window.localStorage.getItem(key);
    current = item ? (JSON.parse(item) as T) : initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    current = initialValue;
  }

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? (value as (v: T) => T)(current) : value;
      current = valueToStore;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      current = initialValue;
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [current, setValue, removeValue] as const;
}
