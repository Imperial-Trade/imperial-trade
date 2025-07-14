-- Clean up all existing rate limit records with unknown-client
DELETE FROM rate_limits WHERE identifier = 'unknown-client';