
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toLocaleDateString();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function createPageUrl(pageName: string): string {
  return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

// Utility function to safely convert values to string
export function safeToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// Type guard for checking if a value is a File
export function isFile(value: unknown): value is File {
  return value instanceof File;
}

// Type guard for checking if an object has a specific property
export function hasProperty<K extends string>(
  obj: unknown,
  prop: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}
