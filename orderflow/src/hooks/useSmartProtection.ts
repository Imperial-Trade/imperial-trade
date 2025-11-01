
import { useCallback } from 'react';

interface ProtectionOptions {
  edgeThreshold: number;
  allowedSelectors: string[];
}

export function useSmartProtection({ edgeThreshold, allowedSelectors }: ProtectionOptions) {
  const isProtectedElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;

    // Check if element or its parents have protection attribute
    let current = element;
    while (current && current !== document.body) {
      if (current.hasAttribute('data-prevent-widget-open')) {
        return true;
      }
      
      // Check if it's an interactive element that should be protected
      const tagName = current.tagName.toLowerCase();
      if (['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
        return true;
      }

      // Check if it has interactive classes or roles
      if (current.getAttribute('role') === 'button' || 
          current.classList.contains('cursor-pointer') ||
          current.classList.contains('clickable')) {
        return true;
      }

      current = current.parentElement;
    }

    return false;
  }, []);

  const canTriggerSidebar = useCallback((e: MouseEvent): boolean => {
    // Always allow if within edge threshold
    if (e.clientX > edgeThreshold) return false;

    // Check if over protected element
    const target = e.target as Element | null;
    if (isProtectedElement(target)) {
      // Allow if specifically in allowed selectors
      return allowedSelectors.some(selector => target?.closest(selector));
    }

    return true;
  }, [edgeThreshold, isProtectedElement, allowedSelectors]);

  return { canTriggerSidebar, isProtectedElement };
}
