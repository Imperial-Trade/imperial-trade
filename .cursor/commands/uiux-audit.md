---
name: uiux-audit
title: UI/UX Audit Command
description: Invoke the UI/UX reviewer subagent to produce a prioritized UX report and minimal patches.
usage: /uiux-audit [path]

Steps:
1. Accept a target path (component/page) or list of changed files.
2. Invoke the `UI/UX reviewer` subagent.
3. Return a prioritized report (Critical/High/Medium/Low) with exact minimal patch suggestions and screenshots.

Example:
`/uiux-audit src/components/charts/mecca/DeconstructorPanel.tsx`

