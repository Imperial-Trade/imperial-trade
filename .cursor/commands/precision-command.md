# Precision Execution - Universal Commands

## Command: understand-and-execute
**Purpose**: Ensure deep understanding before execution

**Process**:
1. Parse the user's prompt completely
2. Extract exact requirements and constraints
3. Read all relevant files
4. Understand current implementation
5. Plan minimal changes
6. Verify understanding
7. Execute precisely
8. Validate no breaking changes

**Output**: Summary of understanding, files to modify, what to preserve

---

## Command: preserve-and-modify
**Purpose**: Modify specific functionality while preserving everything else

**Steps**:
1. Identify what to change (exact requirement)
2. Identify what to preserve (everything else)
3. Read current code thoroughly
4. Make isolated, minimal changes
5. Verify preservation of existing functionality
6. Test all modes/contexts

---

## Command: responsive-verify
**Purpose**: Ensure changes work across all screen sizes and modes

**Comprehensive Checklist**:
- [ ] Mobile behavior verified (< 768px)
- [ ] Tablet/iPad behavior verified (768px - 1023px)
- [ ] Desktop behavior verified (≥ 1024px)
- [ ] No layout breaks at breakpoints
- [ ] Spacing/positioning consistent
- [ ] All interactive elements work

**Component Visibility Checks**:
- [ ] All buttons visible and clickable at ALL breakpoints
- [ ] No buttons hidden by responsive classes or overflow
- [ ] Text fully readable (not truncated incorrectly)
- [ ] Components fit within containers
- [ ] No horizontal scrolling from overflow

**Text and Content Validation**:
- [ ] Button text fully visible (e.g., "Complete & Continue" not "Complete & Cont...")
- [ ] Long text uses proper truncation if needed
- [ ] No text overflow causing layout breaks

**iPad/Tablet Specific**:
- [ ] Portrait orientation verified
- [ ] Landscape orientation verified
- [ ] Components fit properly, nothing hidden
- [ ] Layout doesn't break on resize

---

## Command: minimal-change
**Purpose**: Make only necessary changes, nothing more

**Rules**:
- Change ONLY what's requested
- Don't refactor unrelated code
- Don't "improve" things not asked for
- Don't add features not requested
- Preserve all existing patterns

---

## Command: verify-before-complete
**Purpose**: Final verification before completing changes

**Checklist**:
- [ ] Matches user's exact request
- [ ] No existing functionality broken
- [ ] All modes/contexts work
- [ ] Layouts/designs preserved
- [ ] No errors (linting, compilation, runtime)
- [ ] Changes are minimal
- [ ] Code follows existing patterns

