import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const absoluteUrl = (path: string) => {
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`
}

export function formatDate(input: string | number): string {
  const date = new Date(input)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export const createPageUrl = (page: string): string => {
  const pageMap: Record<string, string> = {
    'signin': '/signin',
    'signup': '/signup',
    'account-request': '/account-request',
    'home': '/',
    'dashboard': '/dashboard',
    'admin': '/dashboard/admin',
    'Education': '/academy',
    'Forum': '/orderflow'
  };
  
  return pageMap[page] || '/';
};

export function slugify(str: string) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap symbols for latin letters
  const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
  const to = "aaaaeeeeiiiiooooouuuunc------";
  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
}

export function truncate(str: string, length: number) {
  if (str.length <= length) {
    return str;
  }
  return str.substring(0, length) + '...';
}
