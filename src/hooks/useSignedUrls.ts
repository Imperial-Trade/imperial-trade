import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSignedUrls = (paths: string[] | undefined, bucketName = 'journal-charts') => {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paths || paths.length === 0) {
      setSignedUrls([]);
      return;
    }

    const createSignedUrls = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: signedError } = await supabase.storage
          .from(bucketName)
          .createSignedUrls(paths, 3600); // 1 hour expiry

        if (signedError) {
          console.error('Error creating signed URLs:', signedError);
          setError(signedError.message);
          setSignedUrls([]);
          return;
        }

        if (data) {
          setSignedUrls(data.map(item => item.signedUrl));
        }
      } catch (err) {
        console.error('Error creating signed URLs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSignedUrls([]);
      } finally {
        setLoading(false);
      }
    };

    createSignedUrls();
  }, [paths, bucketName]);

  return { signedUrls, loading, error };
};