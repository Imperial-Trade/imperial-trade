#!/usr/bin/env node
/**
 * Deploy Supabase Edge Function via Management API
 * Usage: node scripts/deploy-function.js <function-name>
 *
 * Requires: SUPABASE_ACCESS_TOKEN in .env
 */

import { createReadStream, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'kmuoqkcxguafxulqlbmi';

async function deployFunction(functionName) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ SUPABASE_ACCESS_TOKEN not found in environment');
    console.error('Get it from: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  const functionsDir = join(__dirname, '..', 'supabase', 'functions', functionName);

  console.log(`📦 Deploying function: ${functionName}`);
  console.log(`📁 From: ${functionsDir}`);

  // Create form data with function files
  const form = new FormData();

  // Add all files in the function directory
  const files = readdirSync(functionsDir);
  files.forEach(file => {
    const filePath = join(functionsDir, file);
    if (statSync(filePath).isFile()) {
      form.append('files', createReadStream(filePath), file);
    }
  });

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${functionName}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...form.getHeaders()
      },
      body: form
    }
  );

  if (response.ok) {
    console.log(`✅ Successfully deployed: ${functionName}`);
    const data = await response.json();
    console.log(data);
  } else {
    console.error(`❌ Deployment failed: ${response.status} ${response.statusText}`);
    const error = await response.text();
    console.error(error);
    process.exit(1);
  }
}

const functionName = process.argv[2];

if (!functionName) {
  console.error('Usage: node deploy-function.js <function-name>');
  process.exit(1);
}

deployFunction(functionName);
