---
name: bug-check
title: Bug & Error Check Command
description: Run the Bug & error check Skill to detect lint/TS issues and common runtime risks, and propose minimal fixes.
usage: /bug-check [path]

Steps:
1. Accept a target path (changed files or component). If not provided, run quick heuristics over the repository.
2. Invoke the `Bug & error check` Skill.
3. Return lint/TS output (if available), list of issues with severity and minimal fix suggestions.

Example:
`/bug-check src/components/charts/mecca/DeconstructorPanel.tsx`

