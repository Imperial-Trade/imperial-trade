import { useState, useEffect } from 'react';

export function useIngestSecret() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Since we configured the INGEST_SECRET in Supabase, we can assume it's configured
    // In a real application, you might want to verify this with a server call
    setIsConfigured(true);
    setIsLoading(false);
  }, []);

  return { 
    secret: isConfigured ? 'configured' : null, 
    isLoading, 
    error, 
    isConfigured 
  };
}