---
name: stitch-design
title: Stitch Design (Google Stitch MCP)
description: Generate or refine Insight UI concepts with Google Stitch while implementing in React.
usage: /stitch-design [screen or feature description]

Steps:
1. Confirm the **google-stitch** MCP server is connected (Cursor Settings → MCP). If missing, ensure `STITCH_API_KEY` is in `.env` and reload MCP.
2. Read `.stitch/project.json` for Insight design context (dark glass, cyan primary, Messenger-quality chat).
3. Use **google-stitch** MCP tools to generate or iterate a screen:
   - Prefer `generate_screen_from_text` with `deviceType: MOBILE` for Insight surfaces.
   - Reuse `STITCH_PROJECT_ID` from `.env` when refining an existing flow.
4. Save CLI outputs to `stitch-output/` when batch-generating: `npm run stitch:generate -- --prompt "..."`.
5. Translate Stitch HTML/layout into existing React + Tailwind patterns — do not paste raw HTML into the app; map spacing, hierarchy, and components to `src/insight/` and `src/pages/dashboard/pattern-stream/`.
6. Preserve responsive behavior, dark mode tokens, and existing navigation shells (`InsightPage`, `PatternStreamLayout`, `FeedComposerStrip`).

Example:
`/stitch-design Create room step 2 invite picker — Telegram-style search, Insight tokens`
