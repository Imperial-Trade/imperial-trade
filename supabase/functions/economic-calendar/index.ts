
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Advanced in-memory cache with TTL and deduplication
interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize = 100;

  private generateKey(params: any): string {
    return JSON.stringify(params, Object.keys(params).sort());
  }

  private cleanup(): void {
    const now = Date.now();
    
    // Clean expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }

    // Clean old pending requests (older than 30 seconds)
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }

    // Limit cache size (LRU-style)
    if (this.cache.size > this.maxCacheSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      
      const toRemove = this.cache.size - this.maxCacheSize + 10;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
  }

  async getOrSet<T>(
    params: any, 
    fetcher: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const key = this.generateKey(params);
    const now = Date.now();

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && now < cached.expiry) {
      console.log(`Cache HIT for key: ${key}`);
      return cached.data as T;
    }

    // Check if request is already pending (deduplication)
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`Request DEDUPLICATED for key: ${key}`);
      return pending.promise as Promise<T>;
    }

    // Create new request
    console.log(`Cache MISS for key: ${key}, fetching new data`);
    const requestPromise = fetcher();
    
    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: now
    });

    try {
      const data = await requestPromise;
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: now,
        expiry: now + ttl
      });

      // Remove from pending
      this.pendingRequests.delete(key);
      
      // Cleanup periodically
      if (Math.random() < 0.1) { // 10% chance
        this.cleanup();
      }

      return data;
    } catch (error) {
      // Remove from pending on error
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length
    };
  }
}

// Global cache instance
const cache = new AdvancedCache();

interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  impact: 'high' | 'medium' | 'low';
  event: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  date: string;
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { dateFrom, dateTo, currencies, impacts } = requestBody;
    
    console.log('Economic calendar request:', { dateFrom, dateTo, currencies, impacts });

    // Use advanced cache with deduplication
    const events = await cache.getOrSet(
      { dateFrom, dateTo, currencies, impacts },
      async () => {
        // Build database query
        let query = supabase
          .from('economic_events')
          .select('*')
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true });

        // Apply date filtering
        if (dateFrom) {
          query = query.gte('event_date', dateFrom);
        }
        if (dateTo) {
          query = query.lte('event_date', dateTo);
        }

        // Apply currency filtering
        if (currencies && currencies.length > 0) {
          query = query.in('currency_code', currencies);
        }

        // Apply impact filtering with case conversion
        if (impacts && impacts.length > 0) {
          // Convert lowercase impacts to capitalized format for database
          const capitalizedImpacts = impacts.map((impact: string) => 
            impact.charAt(0).toUpperCase() + impact.slice(1).toLowerCase()
          );
          query = query.in('impact', capitalizedImpacts);
        }

        const { data: dbEvents, error } = await query;

        if (error) {
          console.error('Database query error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log('Retrieved events from database:', dbEvents?.length || 0);

        // Transform database results to match frontend interface
        const transformedEvents: EconomicEvent[] = (dbEvents || []).map(dbEvent => ({
          id: dbEvent.id,
          time: dbEvent.event_time || '00:00',
          currency: dbEvent.currency_code || 'USD',
          impact: dbEvent.impact?.toLowerCase() as 'high' | 'medium' | 'low',
          event: dbEvent.event_name,
          actual: dbEvent.actual_value || '',
          forecast: dbEvent.forecast || '',
          previous: dbEvent.previous_value || '',
          date: dbEvent.event_date,
          description: dbEvent.description || ''
        }));

        return transformedEvents;
      },
      5 * 60 * 1000 // 5 minutes TTL
    );

    console.log('Returning events:', events.length);
    console.log('Cache stats:', cache.getCacheStats());

    return new Response(
      JSON.stringify({ 
        events,
        meta: {
          count: events.length,
          cached: true,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // 5 minutes browser cache
        } 
      }
    );

  } catch (error) {
    console.error('Economic calendar error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch economic events',
        details: (error as Error).message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
