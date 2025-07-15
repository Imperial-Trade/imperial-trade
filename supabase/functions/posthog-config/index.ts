
import { corsHeaders } from '../_shared/cors.ts'

console.log("PostHog config function invoked")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('POSTHOG_API_KEY')
    
    if (!apiKey) {
      console.log("PostHog API key not configured")
      return new Response(
        JSON.stringify({ 
          error: 'PostHog not configured',
          enabled: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    const config = {
      apiKey,
      apiHost: 'https://app.posthog.com',
      enabled: true,
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (posthog: any) => {
        console.log('PostHog loaded successfully')
      }
    }

    return new Response(
      JSON.stringify(config),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('PostHog config error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get PostHog config',
        enabled: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
