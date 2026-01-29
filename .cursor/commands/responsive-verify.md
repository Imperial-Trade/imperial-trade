---
name: responsive-verify
title: Responsive Verification Command
description: Run the Responsive verification Skill across defined device viewports.
usage: /responsive-verify [path]

Steps:
1. Accept a target path (component or page). If not provided, run against root app view.
2. Invoke the `Responsive verification` Skill with the extended device matrix.
3. Return a per-viewport report, failing selectors, suggested minimal fixes, and screenshots.

Example:
`/responsive-verify src/components/charts/mecca/DeconstructorPanel.tsx`

