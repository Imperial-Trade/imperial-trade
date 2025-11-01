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

    // Filter out invalid paths and log for debugging
    const validPaths = paths.filter(path => {
      if (!path || typeof path !== 'string') {
        console.warn('Invalid path in useSignedUrls:', path);
        return false;
      }
      return true;
    });

    if (validPaths.length === 0) {
      console.warn('No valid paths provided to useSignedUrls');
      setSignedUrls([]);
      return;
    }

    const createSignedUrls = async () => {
      setLoading(true);
      setError(null);

      try {
        // Separate absolute URLs from relative paths
        const absoluteUrls: string[] = [];
        const relativePaths: string[] = [];
        const pathIndexMap: { [key: number]: number } = {}; // Maps original index to result index

        validPaths.forEach((path, originalIndex) => {
          if (path.startsWith('http://') || path.startsWith('https://')) {
            // Already an absolute URL, use as-is
            absoluteUrls.push(path);
            pathIndexMap[originalIndex] = absoluteUrls.length - 1;
          } else {
            // Relative path, needs signing
            relativePaths.push(path);
            pathIndexMap[originalIndex] = relativePaths.length - 1 + absoluteUrls.length;
          }
        });

        console.log('Processing URLs:', { absoluteUrls, relativePaths });

        let signedUrlResults: string[] = [];

        // Handle absolute URLs (pass through)
        signedUrlResults = [...absoluteUrls];

        // Handle relative paths (need signing)
        if (relativePaths.length > 0) {
          const { data, error: signedError } = await supabase.storage
            .from(bucketName)
            .createSignedUrls(relativePaths, 3600); // 1 hour expiry

          if (signedError) {
            console.error('Error creating signed URLs:', signedError);
            setError(signedError.message);
            setSignedUrls(absoluteUrls); // At least return absolute URLs
            return;
          }

          if (data) {
            // Handle both 'signedUrl' and 'signedURL' properties
            const signedUrls = data.map(item => 
              item.signedUrl || (item as any)['signedURL'] || ''
            ).filter(url => url); // Filter out empty strings

            signedUrlResults = [...absoluteUrls, ...signedUrls];
          }
        }

        console.log('Final signed URLs:', signedUrlResults);
        setSignedUrls(signedUrlResults);
      } catch (err) {
        console.error('Error in useSignedUrls:', err);
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