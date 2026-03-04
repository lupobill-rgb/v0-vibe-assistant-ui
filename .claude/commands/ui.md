# /ui — UI Work Enforcement
# Run this command before any UI task. Non-negotiable.

## STOP. READ THESE FILES FIRST.

**Step 1.** Read `/.claude/FRONTEND_SKILL.md` in full before writing a single line.
**Step 2.** Read `/apps/executor/src/templates/design-phases.ts` in full.
**Step 3.** Do not write code until both files are read.

## CHECKLIST — Validate every diff before submitting

- [ ] Background uses the dark navy token from FRONTEND_SKILL.md
- [ ] Primary color is violet as specified in FRONTEND_SKILL.md
- [ ] Cyan accent applied where specified
- [ ] Headings use Space Grotesk, body uses Inter — both loaded via Google Fonts
- [ ] Hero has gradient as specified
- [ ] Primary buttons use gradient as specified
- [ ] Cards use the exact pattern from FRONTEND_SKILL.md
- [ ] Inputs use the exact pattern from FRONTEND_SKILL.md
- [ ] Navbar is sticky with glassmorphism as specified
- [ ] Layout uses max-width and section padding from FRONTEND_SKILL.md
- [ ] Responsive across mobile, tablet, desktop

If any box is unchecked, fix it. Do not submit until all pass.

## IF THE DESIGN DRIFTS
You are not interpreting the design system. You are implementing it exactly. If you find yourself choosing a color, font, or component pattern that is not in FRONTEND_SKILL.md, stop and go back to the file.
