
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseOptimizedSearchOptions {
  delay?: number;
  minLength?: number;
}

export const useOptimizedSearch = (
  initialValue: string = '',
  options: UseOptimizedSearchOptions = {}
) => {
  const { delay = 300, minLength = 0 } = options;
  
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (value.length >= minLength) {
        setDebouncedSearchTerm(value);
      } else {
        setDebouncedSearchTerm('');
      }
    }, delay);
  }, [delay, minLength]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    handleSearchChange,
    clearSearch,
    isSearching: searchTerm !== debouncedSearchTerm
  };
};
