---
name: pre-commit-lint
description: Suggested pre-commit hook to run lint and typecheck prior to commits. Configure this in Cursor Hooks UI or your local git hooks.

Command:
```
npm run lint || true
npm run typecheck || true
```

Notes:
- If running in Cursor Hook environment, return errors back to the agent for immediate feedback.
- Use `|| true` only if you don't want the hook to block commits; remove to block on failure.

