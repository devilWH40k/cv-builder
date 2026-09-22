# CV Builder Design System

## 1. Purpose

This document defines the visual design system for the CV Builder application.

All UI implementation should follow this document and the design tokens defined in:

`src/styles/_tokens.scss`

Before creating or modifying UI:

1. Read this document.
2. Check the existing design tokens.
3. Check existing reusable components in `src/app/shared/ui/`.
4. Reuse existing patterns before creating new ones.

The goal is a consistent, professional, accessible interface rather than individually styled screens.

---

## 2. Design Direction

The application should feel:

* modern
* professional
* clean
* minimal
* calm
* polished
* productivity-focused

The interface should support the user's work without competing visually with the CV itself.

The CV/document preview should generally be the strongest visual element on editor screens.

Avoid:

* excessive decoration
* excessive gradients
* excessive shadows
* excessive border radius
* overly colorful interfaces
* unnecessary animations
* glassmorphism unless explicitly required
* decorative UI that reduces usability
* dashboard-like visual clutter

Prefer clear hierarchy, generous whitespace, subtle borders, restrained color, and predictable interaction patterns.

---

# 3. Design Tokens

The source of truth for design values is:

`src/styles/_tokens.scss`

Do not duplicate token values inside component styles.

Use Sass modules:

```scss id="af4r2p"
@use 'styles/tokens' as tokens;
```

Prefer:

```scss id="k93e2n"
color: tokens.$text-primary;
padding: tokens.$spacing-4;
border-radius: tokens.$radius-md;
```

Do not write arbitrary values such as:

```scss id="37fyjj"
color: #222222;
padding: 17px;
border-radius: 11px;
```

when an appropriate token already exists.

A new design token may be introduced when a genuinely reusable design value is missing.

Do not create tokens solely to support a single arbitrary value.

---

# 4. Brand Colors

## Primary

Primary brand color:

`#5465FF`

Token:

```scss id="59sl0r"
$color-primary: #5465ff;
```

Primary is used for:

* primary buttons
* active navigation
* selected states
* focus indicators
* important interactive elements
* links where appropriate
* brand accents

Supporting primary colors:

```scss id="f5wt49"
$color-primary-hover: #4353e6;
$color-primary-active: #3544cc;
$color-primary-light: #eef0ff;
```

Do not use the primary color for large areas unnecessarily.

---

## Secondary

Secondary brand color:

`#D1FAFF`

Token:

```scss id="y3wwf2"
$color-secondary: #d1faff;
```

Secondary is intended primarily for subtle visual emphasis.

Use it for:

* highlighted areas
* selected secondary content
* subtle informational backgrounds
* decorative accents
* onboarding or helper elements

Do not use secondary as the default button color.

---

# 5. Neutral Palette

The application uses a cool neutral palette.

Main values include:

```text id="1qngow"
Gray 50     #F8FAFC
Gray 100    #F1F5F9
Gray 200    #E2E8F0
Gray 300    #CBD5E1
Gray 400    #94A3B8
Gray 500    #64748B
Gray 600    #475569
Gray 700    #334155
Gray 800    #1E293B
Gray 900    #0F172A
```

Prefer semantic tokens rather than referencing neutral palette values directly.

Example:

```scss id="cz3gsn"
color: tokens.$text-secondary;
```

instead of:

```scss id="idsgzc"
color: tokens.$color-gray-600;
```

---

# 6. Semantic Colors

Use semantic colors consistently.

## Success

```text id="zmh3u6"
#16A34A
```

Used for:

* successful operations
* valid states
* completion indicators

## Warning

```text id="1jx6ri"
#D97706
```

Used for:

* warnings
* potentially destructive actions
* attention-required states

## Danger

```text id="fd3qno"
#DC2626
```

Used for:

* destructive actions
* errors
* invalid form fields
* deletion

## Information

```text id="zw6v84"
#0284C7
```

Used for informational messages when primary branding is not appropriate.

Do not use semantic colors decoratively.

---

# 7. Backgrounds

Primary application background:

```scss id="mh61bg"
$background-app
```

Default surface:

```scss id="a2m51j"
$background-surface
```

Subtle background:

```scss id="57w1o3"
$background-subtle
```

A typical application screen should use:

```text id="jqrbvm"
Application background
    ↓
#F8FAFC

Cards / panels
    ↓
#FFFFFF

Borders
    ↓
#E2E8F0
```

Avoid making every section a card.

Use whitespace and layout hierarchy before adding additional containers.

---

# 8. Typography

Primary font family:

```scss id="i6z67h"
$font-family-base
```

The preferred font is:

**Inter**

with appropriate system fallbacks.

Typography should feel neutral, readable, and professional.

---

## Type Scale

Use the typography tokens from `_tokens.scss`.

```text id="f3s0n1"
12px    XS
14px    Small
16px    Base
18px    Large
20px    XL
24px    2XL
28px    3XL
32px    4XL
```

Avoid arbitrary font sizes.

---

## Recommended Hierarchy

### Page title

```text id="6i1fj3"
28–32px
Semibold
Tight line height
Primary text
```

### Section title

```text id="d8y6ma"
20–24px
Semibold
Primary text
```

### Card title

```text id="42gvn9"
16–18px
Semibold
Primary text
```

### Body

```text id="d50jyc"
14–16px
Regular
Primary text
```

### Secondary text

```text id="5twd4e"
14px
Regular
Secondary text
```

### Helper text

```text id="jweqpo"
12–14px
Regular
Muted text
```

Avoid using font weight alone as the only indication of hierarchy.

Combine typography, spacing, and color appropriately.

---

# 9. Spacing

The application uses a **4px base spacing system**.

Available tokens include:

```text id="9bb0zd"
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
```

Use the corresponding `$spacing-*` tokens.

Typical usage:

```text id="ftj7j7"
4px     icon/internal micro spacing
8px     closely related elements
12px    compact control spacing
16px    standard spacing
24px    component/card padding
32px    section spacing
48px+   major page separation
```

Prefer spacing to additional borders when separating content.

---

# 10. Border Radius

Use the provided radius scale.

```text id="azp6c4"
Small       4px
Medium      8px
Large       12px
Extra large 16px
Full        pill/circle
```

The normal application radius should usually be:

```scss id="59jwk3"
tokens.$radius-md
```

or:

```scss id="rr3k0c"
tokens.$radius-lg
```

Do not make every UI element highly rounded.

Pill-shaped elements should primarily be reserved for:

* tags
* badges
* status indicators
* compact filters

---

# 11. Shadows

Shadows should be subtle.

Prefer borders before shadows for ordinary interface structure.

Typical usage:

```text id="n7klb3"
shadow-xs   subtle elevation
shadow-sm   cards / floating controls
shadow-md   dropdowns
shadow-lg   dialogs / important overlays
```

Avoid strong or dramatic shadows.

Do not add shadows to every card.

---

# 12. Buttons

Buttons should use shared UI components when available.

Expected variants:

```text id="bxh5t4"
Primary
Secondary
Ghost
Danger
```

---

## Primary Button

Use for the main action in a context.

Examples:

* Save
* Continue
* Export CV
* Create CV

Typical appearance:

```text id="ctj94s"
Background: Primary
Text: White
Radius: Medium
Height: 40px or 44px
```

There should normally be only one visually dominant primary action in a local context.

---

## Secondary Button

Use for important but non-primary actions.

Typical appearance:

```text id="xfklby"
Background: White
Border: Standard border
Text: Primary text
```

---

## Ghost Button

Use for low-emphasis actions.

Examples:

* Cancel
* Back
* Close
* contextual actions

Ghost buttons should not compete with primary actions.

---

## Danger Button

Use only for destructive actions.

Examples:

* Delete CV
* Delete experience
* Remove account

Use the danger color.

Do not use primary brand color for destructive actions.

---

## Button Icons

When a button contains an icon:

```text id="gt0e2s"
Icon → 16–20px
Gap  → 8px
```

Prefer:

```text id="3uex0w"
[icon] Label
```

for actions where the icon improves recognition.

Do not add icons to every button unnecessarily.

---

# 13. Iconography

Use **Lucide** as the application's icon library.

Do not use:

* emoji as interface icons
* Unicode characters as interface icons
* random inline SVG icons
* icons from multiple libraries

unless explicitly required.

Typical sizes:

```text id="s9kwq1"
16px    compact action
20px    standard UI
24px    prominent action
32px+   empty states / special UI
```

Use consistent stroke width.

Examples of appropriate icons:

```text id="tdqftn"
Plus
Pencil
Trash2
Download
Eye
FileText
GripVertical
ChevronDown
ChevronLeft
ChevronRight
Settings
User
Briefcase
GraduationCap
Mail
Phone
MapPin
Github
Linkedin
```

Icon-only buttons must have an accessible name.

---

# 14. Forms

Forms are a major part of the CV Builder and must remain visually consistent.

Prefer shared form components where available.

---

## Labels

Labels should appear above their controls.

Labels should:

* be clearly associated with the input
* use consistent typography
* use primary or secondary text
* have predictable spacing

Required fields should be communicated accessibly.

---

## Inputs

Default input height:

```text id="dqgrkb"
44px
```

Inputs should use:

* surface background
* standard border
* medium radius
* consistent horizontal padding
* clear focus state

Example:

```scss id="ot31qn"
.input {
  height: tokens.$input-height;
  padding-inline: tokens.$input-padding-x;

  color: tokens.$text-primary;
  background: tokens.$background-surface;

  border: 1px solid tokens.$input-border;
  border-radius: tokens.$input-radius;

  &:focus {
    border-color: tokens.$input-border-focus;
  }
}
```

---

## Focus

Focus must always be visible.

Primary color should generally be used for focused form controls.

Do not remove outlines/focus indicators without providing an accessible replacement.

---

## Validation

Invalid fields should use danger styling.

Display validation messages close to the relevant control.

Avoid displaying errors before the user has reasonably interacted with a field.

---

## Helper Text

Use muted text below the field.

Helper text should explain useful constraints rather than repeat the label.

---

# 15. Cards and Panels

Cards should use:

```text id="fctz1d"
Background    Surface
Border        Standard border
Radius        Large
Padding       Usually 20–24px
Shadow        None or subtle
```

Cards should represent meaningful groups of related content.

Do not wrap every UI element in a card.

---

# 16. CV Editor Layout

The primary desktop editor layout should generally follow:

```text id="u70fnx"
┌─────────────────────────────────────────────────────────────┐
│ Header                                      Preview  Export │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│ Editor                       │                              │
│                              │        CV Preview            │
│ Personal Information         │                              │
│ Experience                   │         A4 document          │
│ Education                    │                              │
│ Skills                       │                              │
│                              │                              │
└──────────────────────────────┴──────────────────────────────┘
```

The editor and CV preview should be visually distinct.

The CV preview should feel like a real document rather than another application card.

---

# 17. CV Preview

The CV preview is one of the most important visual elements.

It should:

* resemble a physical document
* use a white background
* preserve document proportions
* provide clear separation from the application background
* use restrained shadow/elevation
* prioritize accurate document rendering

Do not apply application UI styles blindly inside CV templates.

The CV document has its own typography and layout requirements.

Application design tokens may be reused where appropriate, but CV templates may define their own presentation tokens.

---

# 18. Responsive Design

Design mobile-first.

Primary responsive targets:

```text id="dm48hx"
Mobile
Tablet
Desktop
Large desktop
```

Use the breakpoint tokens defined in `_tokens.scss`.

Avoid creating breakpoints directly inside components when an existing breakpoint token is suitable.

---

## Desktop

Editor and preview may appear side-by-side.

---

## Tablet

The editor should remain usable without cramped controls.

The preview may be reduced or moved into a separate mode.

---

## Mobile

Do not attempt to squeeze the full desktop editor and A4 preview side-by-side.

Prefer switching between:

```text id="dvn1cq"
Edit
Preview
```

modes.

Touch targets should remain sufficiently large.

---

# 19. Navigation

Navigation should be simple and task-oriented.

Avoid unnecessary nested navigation.

For editor sections, clear navigation may include:

```text id="fujt1h"
Personal Details
Summary
Experience
Education
Skills
Languages
Projects
Links
```

The currently active section should be visually clear.

---

# 20. Empty States

Empty states should explain what the user can do next.

Example:

```text id="rvmx6r"
No work experience added yet.

[+ Add experience]
```

Use illustrations or large icons sparingly.

Do not create decorative empty states that overpower the actual task.

---

# 21. Loading States

Use appropriate loading feedback.

Prefer:

* skeletons for content areas
* compact spinners for actions
* disabled button + progress indication for submissions

Avoid blocking the entire application for small background operations.

Prevent duplicate submissions while an action is running.

---

# 22. Notifications

Use notifications for important operation results.

Typical types:

```text id="bbnhkz"
Success
Error
Warning
Information
```

Messages should be concise and actionable.

Avoid showing a success notification for every trivial interaction.

---

# 23. Dialogs

Dialogs should be reserved for actions requiring focused user attention.

Typical examples:

* destructive confirmation
* template selection
* important configuration
* leaving with unsaved changes

Do not use dialogs for normal navigation.

Destructive dialogs must clearly identify the destructive action.

---

# 24. Accessibility

Accessibility is part of the design system.

Interactive controls must:

* be keyboard accessible
* have visible focus states
* have accessible names
* use semantic HTML where possible
* maintain appropriate color contrast

Do not use `<div>` elements as buttons.

Prefer:

```html id="edvxgz"
<button type="button">
```

Icon-only controls require an accessible label.

Example:

```html id="bls5g2"
<button
  type="button"
  aria-label="Delete experience"
>
  <lucide-icon [img]="Trash2Icon" />
</button>
```

Do not communicate state using color alone.

---

# 25. Animation

Animation should support understanding rather than decoration.

Use the transition tokens defined in `_tokens.scss`.

Typical durations:

```text id="ssm3ce"
Fast       120ms
Normal     200ms
Slow       300ms
```

Good uses:

* hover transitions
* expanding sections
* dropdowns
* dialogs
* subtle state transitions

Avoid:

* long animations
* bouncing UI
* excessive movement
* animation that delays interaction

Respect reduced-motion preferences when implementing substantial motion.

---

# 26. Reusable UI Components

Reusable design-system components should live under:

`src/app/shared/ui/`

Expected components may include:

```text id="hkwgv8"
shared/ui/
├── button/
├── icon-button/
├── input/
├── textarea/
├── select/
├── checkbox/
├── form-field/
├── card/
├── dialog/
├── tooltip/
├── badge/
├── spinner/
└── empty-state/
```

Do not create all of these upfront.

Create reusable primitives when they are actually needed.

Before creating a new component, check whether an existing shared component already solves the problem.

---

# 27. Component Styling Rules

Component styles should consume design tokens.

Example:

```scss id="ouczpj"
@use 'styles/tokens' as tokens;

.profile-card {
  padding: tokens.$spacing-6;

  background: tokens.$background-surface;

  border: 1px solid tokens.$border-color;
  border-radius: tokens.$radius-lg;
}
```

Avoid:

```scss id="nzd90g"
.profile-card {
  padding: 23px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 11px;
}
```

Do not duplicate shared button/input/card styling inside feature components.

---

# 28. CSS / SCSS Rules

Use SCSS.

Use Sass modules:

```scss id="r45hhc"
@use 'styles/tokens' as tokens;
```

Do not use deprecated Sass `@import`.

Prefer component-scoped styles.

Use global styles only for genuinely global concerns such as:

* reset/base styles
* typography defaults
* application background
* design-system utilities where justified

Avoid `!important` unless required to override third-party styling and there is no cleaner alternative.

Avoid deeply nested SCSS.

Prefer nesting depth of no more than approximately three levels.

---

# 29. Visual Consistency Rules for Codex

When implementing UI:

1. Read this document.
2. Inspect `_tokens.scss`.
3. Inspect existing components under `shared/ui`.
4. Reuse existing components.
5. Reuse existing design tokens.
6. Follow existing layout patterns.
7. Keep spacing consistent.
8. Use Lucide icons.
9. Maintain accessibility.
10. Check responsive behavior.

Do not invent new:

* colors
* shadows
* spacing scales
* border radii
* typography scales
* button styles
* form styles

when the design system already provides an appropriate option.

---

# 30. When a Design Pattern Is Missing

If a required pattern is not documented:

1. Inspect similar existing UI.
2. Reuse the closest existing pattern where appropriate.
3. Use existing design tokens.
4. Keep the solution visually consistent.
5. Prefer a simple implementation.

If the decision would establish a significant new application-wide pattern, do not silently invent a new design language.

---

# 31. Design Priorities

When making UI decisions, prioritize:

1. Usability
2. Consistency
3. Accessibility
4. Clear visual hierarchy
5. Readability
6. Responsive behavior
7. Visual polish

The application should feel cohesive rather than individually designed screen by screen.

The user should focus primarily on creating their CV, not on understanding the interface.
