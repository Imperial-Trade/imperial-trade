#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { stitch } from "@google/stitch-sdk";

const ROOT = process.cwd();

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

function parseArgs(argv) {
  const args = {
    prompt: "",
    name: "",
    outDir: "stitch-output",
    projectTitle: "Imperial Trade Design Lab",
    projectId: process.env.STITCH_PROJECT_ID || "",
    deviceType: "DESKTOP",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if ((a === "--prompt" || a === "-p") && argv[i + 1]) {
      args.prompt = argv[i + 1];
      i += 1;
      continue;
    }
    if ((a === "--name" || a === "-n") && argv[i + 1]) {
      args.name = argv[i + 1];
      i += 1;
      continue;
    }
    if (a === "--out-dir" && argv[i + 1]) {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (a === "--project" && argv[i + 1]) {
      args.projectTitle = argv[i + 1];
      i += 1;
      continue;
    }
    if (a === "--project-id" && argv[i + 1]) {
      args.projectId = argv[i + 1];
      i += 1;
      continue;
    }
    if (a === "--device" && argv[i + 1]) {
      args.deviceType = argv[i + 1].toUpperCase();
      i += 1;
    }
  }

  return args;
}

function slug(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function usage() {
  console.log(`
Usage:
  npm run stitch:generate -- --prompt "Insight chat create-room page, Messenger quality"

Optional flags:
  --name <screen-name>         Output file basename
  --project <title>            Create new Stitch project title (if no project id)
  --project-id <id>            Reuse an existing Stitch project id
  --device <type>              MOBILE | DESKTOP | TABLET | AGNOSTIC (default: DESKTOP)
  --out-dir <path>             Output directory (default: stitch-output)
`);
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(outPath, buffer);
}

async function main() {
  loadEnvFile(path.join(ROOT, ".env"));
  loadEnvFile(path.join(ROOT, ".env.local"));

  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) {
    usage();
    process.exit(1);
  }

  if (!process.env.STITCH_API_KEY && !process.env.STITCH_ACCESS_TOKEN) {
    console.error(
      "Missing auth: set STITCH_API_KEY (or STITCH_ACCESS_TOKEN) in your shell or .env file.",
    );
    process.exit(1);
  }

  const outDir = path.resolve(ROOT, args.outDir);
  await ensureDir(outDir);

  const allowedDevices = new Set(["MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"]);
  const deviceType = allowedDevices.has(args.deviceType)
    ? args.deviceType
    : "DESKTOP";

  console.log(`\n[stitch] generating screen (${deviceType})...`);

  let project;
  if (args.projectId) {
    project = stitch.project(args.projectId);
    console.log(`[stitch] using project ${args.projectId}`);
  } else {
    project = await stitch.createProject(args.projectTitle);
    console.log(`[stitch] created project ${project.projectId}`);
  }

  const screen = await project.generate(args.prompt, deviceType);
  const [htmlUrl, imageUrl] = await Promise.all([
    screen.getHtml(),
    screen.getImage(),
  ]);

  const baseName =
    slug(args.name || args.prompt) || `screen-${new Date().toISOString().slice(0, 10)}`;
  const htmlPath = path.join(outDir, `${baseName}.html`);
  const imagePath = path.join(outDir, `${baseName}.png`);
  const metaPath = path.join(outDir, `${baseName}.json`);

  await Promise.all([
    download(htmlUrl, htmlPath),
    download(imageUrl, imagePath),
    fs.promises.writeFile(
      metaPath,
      JSON.stringify(
        {
          prompt: args.prompt,
          projectId: project.projectId,
          screenId: screen.screenId,
          deviceType,
          htmlUrl,
          imageUrl,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    ),
  ]);

  console.log("[stitch] done");
  console.log(`- HTML: ${path.relative(ROOT, htmlPath)}`);
  console.log(`- PNG : ${path.relative(ROOT, imagePath)}`);
  console.log(`- META: ${path.relative(ROOT, metaPath)}`);
  console.log(`- projectId: ${project.projectId}`);
  console.log(`- screenId : ${screen.screenId}\n`);
}

main().catch((err) => {
  console.error("[stitch] failed:", err?.message || err);
  process.exit(1);
});
