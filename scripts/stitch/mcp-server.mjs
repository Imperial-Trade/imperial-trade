#!/usr/bin/env node
/**
 * Google Stitch MCP proxy for Cursor.
 * Exposes Stitch design tools (generate_screen_from_text, etc.) over stdio.
 *
 * Auth: STITCH_API_KEY or STITCH_ACCESS_TOKEN in env / .env (via Cursor envFile).
 * Do not log to stdout — MCP uses it for the protocol.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { StitchProxy } from "@google/stitch-sdk";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.join(ROOT, ".env.local"));

try {
  const proxy = new StitchProxy({});
  const transport = new StdioServerTransport();
  await proxy.start(transport);
} catch (err) {
  console.error("[stitch-mcp]", err?.message || err);
  console.error(
    "[stitch-mcp] Set STITCH_API_KEY in .env and reload MCP (Cursor Settings → MCP).",
  );
  process.exit(1);
}
