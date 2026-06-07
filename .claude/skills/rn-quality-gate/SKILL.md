---
name: rn-quality-gate
description: Use after implementing any React Native feature to review code quality, states, accessibility, and performance before marking work complete.
---

# React Native Quality Gate Skill

## Purpose

Use this skill after implementing any React Native feature.

Run this before marking any feature complete. Do not skip it because the feature "looks fine."

## Core Rule

**Do not mark work complete until the quality gate passes.**

Fix all critical and medium issues. Do not fix nice-to-haves unless the user asks.

## Checks

Review each of the following:

### Code quality
- TypeScript correctness — no `any`, no type suppressions without justification
- Lint issues — no unused imports, no console.log left in
- Component structure — components are small, single-responsibility
- Reusable UI usage — no one-off styled views where a shared component exists
- Theme token usage — no hardcoded colors, spacing, or font sizes

### Navigation
- Navigation correctness — correct stack, correct params, correct back behavior
- No broken routes or missing screens in navigation config

### States
- Loading state — shown while async operations run
- Empty state — shown when a list or content area has no data
- Error state — shown when an API call or operation fails
- Success state — shown or navigated to after successful actions
- Disabled states — buttons and inputs disabled at the right times

### Forms
- Form validation — all required fields validated before submit
- Disabled submit state — submit button disabled until form is valid
- Keyboard behavior — keyboard does not obscure inputs; dismiss on submit

### Layout
- Small screen layout — tested at 375px wide minimum
- No overflow, no clipped content, no broken layout at small sizes

### Accessibility
- Accessibility labels on all interactive elements
- Touch target size — minimum 44×44pt for tappable elements
- Screen reader order makes sense

### Performance
- Performance risks — no unnecessary re-renders, no heavy operations on main thread
- Lists use FlatList or FlashList, not ScrollView with map
- Images are optimized and not blocking render

### Tests
- Test coverage — critical paths have at least basic test coverage

## Required agents

Use these agents in sequence:

1. **mobile-qa-reviewer** — always run after any implementation
2. **accessibility-reviewer** — run when any UI was changed
3. **rn-performance-reviewer** — run when lists, images, animations, or complex rendering changed

Do not skip agents because the change "seems small."

## Output

Return:

1. **Critical issues** — must fix before shipping (broken behavior, crashes, data loss, inaccessible UI)
2. **Medium issues** — should fix in this session (missing states, bad layout, weak validation)
3. **Nice-to-haves** — log but do not fix unless asked (polish, micro-interactions, minor copy)
4. **Exact files to fix** — file path and line number for each issue
5. **Manual test checklist** — steps to verify the feature works end to end
