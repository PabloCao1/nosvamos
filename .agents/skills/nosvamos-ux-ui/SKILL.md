---
name: nosvamos-ux-ui
description: Use this skill whenever designing, redesigning, reviewing or implementing UX/UI for NosVamos. Preserve the existing main menu and expandable + menu visual language, use a minimal iPhone-inspired interface, avoid unnecessary cards, and include polished screen transitions.
---

# NosVamos UX/UI Design Skill

Act as a senior product designer specialized in iOS-style consumer applications.

The goal is to make NosVamos feel like a professionally designed travel application for iPhone, not like an AI-generated UI, SaaS dashboard, generic Tailwind template, or landing page.

The interface must feel:

- minimal
- native
- calm
- polished
- responsive
- compact
- intuitive
- modern
- iPhone-inspired
- designed specifically for travel

Do not redesign established visual elements without a strong UX reason.

---

# 1. Preserve the existing NosVamos identity

Before modifying any screen, inspect the existing codebase and identify the current implementation of:

- main navigation menu
- primary navigation colors
- active navigation state
- inactive navigation state
- icons used in navigation
- typography used in navigation
- spacing
- border radius
- background colors
- expandable `+` menu
- buttons inside the expandable `+` menu
- animations of the expandable `+` menu
- overlay/backdrop behavior
- positioning of the `+` menu
- visual states of its actions

These existing elements are part of the NosVamos design system.

## Main menu

The existing main menu MUST retain:

- its current colors
- its current layout
- its current icon treatment
- its current active state
- its current background
- its current proportions
- its current visual hierarchy

Do not replace it with a generic navigation bar.

Do not introduce a new palette for navigation.

Do not redesign the main navigation unless explicitly requested.

---

# 2. Expandable + menu

NosVamos uses an expandable `+` action menu on multiple screens.

This menu is a core component of the application.

Always reuse the existing component whenever possible.

Preserve:

- its current primary color
- its icon treatment
- its shape
- its positioning
- its expansion direction
- its visual hierarchy
- its action button styles
- its labels
- its animation philosophy
- its backdrop behavior

Never create a different floating-action-button style for another screen if the existing `+` menu can be reused.

Any new action added to this menu should visually match the existing actions.

Before implementing a new floating or quick action, search the codebase for the existing `+` menu implementation and extend it.

---

# 3. Color system

The existing NosVamos colors are the source of truth.

Before introducing any new color:

1. Inspect the existing CSS, theme, Tailwind configuration, variables or components.
2. Reuse existing design tokens.
3. Prefer neutral variants derived from the existing palette.
4. Do not invent new accent colors unless necessary.

The application's primary accent should remain the current NosVamos accent color.

Use accent color intentionally.

Good uses:

- selected states
- primary action
- active navigation
- important travel status
- selected date
- interactive links
- meaningful highlights

Avoid applying accent color to:

- every icon
- every heading
- every container
- decorative backgrounds
- every badge
- ordinary information

Neutral colors should carry most of the interface.

---

# 4. iPhone-inspired visual language

Use Apple's iOS product design as inspiration, without attempting to clone Apple applications pixel-for-pixel.

Prioritize:

- strong typography
- clean alignment
- subtle separators
- restrained use of containers
- natural scrolling
- clear hierarchy
- direct manipulation
- familiar gestures
- responsive transitions
- contextual actions

The UI should feel at home on an iPhone.

Avoid Android Material patterns unless they are already established in NosVamos.

---

# 5. Do NOT put everything inside cards

This is a critical rule.

Do not automatically place content inside cards.

Before creating a card ask:

> Does this content need to be visually isolated from surrounding content?

If the answer is no, do not use a card.

Prefer:

- sections
- rows
- lists
- timelines
- separators
- grouped content
- typography hierarchy
- whitespace
- background contrast

instead of containers.

## Good candidates for cards

Cards may be used when an item behaves as a distinct object, such as:

- accommodation reservation
- flight ticket
- train reservation
- transport booking
- important document
- ticket
- payment summary
- travel pass
- map preview
- important warning

Even then, keep the card visually restrained.

## Poor candidates for cards

Do not use cards merely for:

- page titles
- section headings
- ordinary settings
- simple lists
- basic itinerary rows
- navigation
- profile fields
- form labels
- every individual action
- explanatory text

---

# 6. Avoid the AI-generated app aesthetic

Do not produce stereotypical AI-generated frontend patterns.

Avoid:

- cards inside cards
- excessive rounded rectangles
- `rounded-2xl` everywhere
- `rounded-3xl` everywhere
- large decorative shadows
- floating containers with no functional reason
- glassmorphism
- gradients used decoratively
- giant dashboard hero sections
- oversized page titles
- large empty areas
- excessive pills
- badge overload
- icons inside colored rounded squares everywhere
- repeated subtitles explaining obvious UI
- centered layouts for information-heavy screens
- generic dashboard metrics
- decorative charts without purpose
- excessive visual embellishment

If the page still looks like it could belong to any random SaaS application, redesign it.

NosVamos should look like a travel product.

---

# 7. Border radius

Use restrained corner rounding.

Follow the existing application values first.

As a general rule:

- buttons: approximately 8–12px
- input controls: approximately 8–12px
- modal sheets: approximately 16–24px on upper corners
- meaningful cards: approximately 12–16px
- small chips: pill radius only when the component is actually a chip

Avoid extreme corner rounding unless already established in the existing design.

---

# 8. Shadows

Use almost no shadows.

Prefer:

- separators
- subtle borders
- background differentiation
- elevation through overlays

If a shadow is necessary, make it extremely subtle.

Never use strong Tailwind-style shadows simply to make a component look more "designed".

---

# 9. Typography

Typography is one of the main tools for hierarchy.

Use an iOS-like restrained scale.

Prefer approximately:

Page title:
- 28–34px
- bold or semibold

Section title:
- 18–22px
- semibold

Primary content:
- 16–17px

Secondary content:
- 14–15px

Metadata:
- 12–13px

Do not use giant headings in application screens.

Prioritize:

- weight
- spacing
- alignment

before using extra containers or colors.

Where possible use system fonts compatible with:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Segoe UI",
  sans-serif;
```

Do not bundle Apple proprietary fonts.

---

# 10. Lists

Lists should resemble native application lists more than web dashboard cards.

Prefer:

```text
Hotel
Hilton Vienna Plaza
8–11 septiembre
────────────────────────

Vuelo
AF1234 · Air France
08:45 → 11:20
────────────────────────

Tren
Wien Hbf → Salzburg Hbf
14:28
```

instead of three giant independent cards.

Use:

- consistent horizontal padding
- separators
- clear primary and secondary labels
- optional trailing actions
- compact spacing

---

# 11. Itineraries

Itinerary views are a central part of NosVamos.

Prefer chronological structures.

Example:

```text
Martes 8 septiembre

09:30
Schönbrunn Palace
Entrada guardada

      │
      │

13:00
Almuerzo
Figlmüller

      │
      │

16:20
Tren a Bratislava
Wien Hbf → Bratislava hl.st.
```

Use timeline indicators only when they improve scanning.

Do not put every itinerary item inside a large card.

The user should be able to visually scan:

- time
- activity
- location
- reservation state
- transport
- important documents

within seconds.

---

# 12. Information density

NosVamos is a practical travel application.

While travelling, users need information quickly.

Optimize for scanning.

Prioritize showing useful information without forcing unnecessary taps.

For example, for a flight show useful information directly:

```text
AF471
Buenos Aires → París

23:00 → 16:20
Terminal EZE A · CDG 2E
Asiento 32G
```

Do not hide essential information behind "View details" unless the screen would otherwise become overloaded.

---

# 13. Bottom sheets

For contextual actions, prefer iOS-style bottom sheets instead of centered desktop-style modals.

Use bottom sheets for:

- choosing an action
- selecting transportation type
- adding an itinerary item
- choosing dates
- attaching documents
- filtering
- contextual options

Bottom sheets should:

- enter from the bottom
- use rounded top corners
- respect safe areas
- support drag-to-close when appropriate
- dim the background subtly

---

# 14. Forms

Forms must remain simple.

Avoid putting an entire form inside a giant card.

Prefer grouped form sections.

Example:

```text
Vuelo

Aerolínea
[ Air France ]

Número de vuelo
[ AF471 ]

Salida
[ Buenos Aires EZE ]

Llegada
[ Paris CDG ]
```

Use familiar iPhone-style grouped form patterns.

Keep labels close to their controls.

Use appropriate keyboard/input types.

---

# 15. Navigation transitions

Screen transitions are part of the NosVamos experience.

Transitions should feel similar to modern iOS navigation.

Use motion to communicate spatial relationships, not decoration.

## Push navigation

When navigating deeper into the hierarchy:

Current screen moves slightly left while the new screen enters from the right.

Recommended duration:

```text
250–350ms
```

Recommended easing:

```css
cubic-bezier(0.32, 0.72, 0, 1)
```

The transition should feel smooth and fast.

---

# 16. Back navigation

When returning:

- destination screen moves toward the right
- previous screen becomes visible from the left
- direction must be the inverse of the push animation

Whenever possible preserve scroll position of the previous screen.

---

# 17. Modal transitions

Modal and sheet views should enter vertically.

Bottom sheet:

```text
translateY(100%)
→
translateY(0)
```

Use subtle background dimming.

Avoid dramatic scaling or bouncing effects.

---

# 18. Tab transitions

When switching primary sections from the main menu:

Do not use dramatic slide transitions.

Prefer:

- immediate content replacement
- subtle fade
- very small horizontal movement

Recommended duration:

```text
150–220ms
```

Primary navigation should feel faster than hierarchical navigation.

---

# 19. Reduced motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Reduce or eliminate transitions when the user requests reduced motion.

Animations should never be required to understand the interface.

---

# 20. Micro-interactions

Use subtle micro-interactions for:

- button press
- list selection
- menu expansion
- adding an item
- completing an action
- deleting
- saving
- opening a sheet

Examples:

Button press:

```text
scale: 1 → 0.97 → 1
```

Keep duration around:

```text
100–160ms
```

Avoid exaggerated animations.

---

# 21. Touch behavior

The application is mobile-first.

Touch targets should generally be at least:

```text
44 × 44px
```

Important actions should be comfortable to use one-handed.

Respect:

- safe-area top
- safe-area bottom
- iPhone home indicator
- keyboard appearance
- notch / Dynamic Island areas

---

# 22. Navigation hierarchy

Do not make every screen look equally important.

Hierarchy should be understandable.

Typical structure:

```text
Main menu
    ↓
Trips
    ↓
Trip
    ↓
Day
    ↓
Reservation / Activity
```

Push transitions should reflect this hierarchy.

---

# 23. Icons

Reuse the existing icon library.

Do not mix multiple icon styles.

Prefer thin or medium weight line icons similar to iOS conventions.

Icons should usually appear without decorative backgrounds.

Bad:

```text
[ 🔴 ]
  Hotel
```

when there is no functional reason for the red container.

Better:

```text
🏨 Hotel
```

or the equivalent existing line icon.

---

# 24. Empty states

Empty states should be useful and minimal.

Example:

```text
Todavía no agregaste actividades.

Organizá qué vas a hacer durante este día.

+ Agregar actividad
```

Avoid:

- giant illustrations
- huge icons
- marketing-style copy
- decorative cards

unless specifically required.

---

# 25. Context-aware screens

Before redesigning a screen determine its purpose.

Ask internally:

- What is the primary task?
- What does the user need to see immediately?
- What is secondary?
- What can be hidden behind an action?
- What information belongs together?
- Is this naturally a list, timeline, sheet, detail page or card?

Choose the structure based on content.

Never start from:

> "I'll create a card grid."

---

# 26. Responsive behavior

The iPhone/mobile experience is the primary design target.

Desktop should adapt from the mobile design instead of becoming a different SaaS dashboard.

On larger screens:

- increase margins
- constrain readable widths when appropriate
- optionally use secondary panes
- preserve the same visual identity

Do not turn desktop layouts into card dashboards unless required.

---

# 27. Existing components first

Before creating any UI component:

1. Search the repository.
2. Identify similar existing components.
3. Reuse them if possible.
4. Extend them if necessary.
5. Only create a new design pattern when no appropriate existing pattern exists.

Particularly search for:

- main menu
- expandable `+` menu
- buttons
- colors
- form fields
- sheets
- headers
- list rows
- reservation components
- typography
- animation utilities

Visual consistency is more important than novelty.

---

# 28. Never change established identity silently

If implementing a feature requires changing:

- primary navigation
- main colors
- expandable `+` menu
- major typography choices
- core spacing system

do not silently redesign them.

Preserve them unless the user explicitly asks for a redesign.

---

# 29. Implementation process

Whenever asked to build or redesign a NosVamos screen:

## Step 1 — Inspect

Inspect existing relevant screens and shared components.

## Step 2 — Identify preserved patterns

Explicitly identify:

- colors
- menu
- `+` menu
- typography
- spacing
- navigation patterns

## Step 3 — Simplify

Look for unnecessary:

- cards
- borders
- containers
- badges
- shadows
- headings
- decorative elements

Remove them when they do not serve a UX purpose.

## Step 4 — Design hierarchy

Organize content using:

- typography
- spacing
- grouping
- separators
- position

before creating additional containers.

## Step 5 — Implement

Use existing components and tokens.

## Step 6 — Add transitions

Ensure screen navigation and contextual UI have polished iPhone-like transitions.

## Step 7 — Review

Perform a UX/UI review before finishing.

---

# 30. Final visual review

Before considering any screen finished, verify:

### Identity

- Does it preserve NosVamos colors?
- Does the main menu remain visually consistent?
- Does the `+` menu remain consistent?

### Minimalism

- Can any container be removed?
- Is any card unnecessary?
- Are there cards inside cards?
- Is information grouped naturally?

### iPhone feeling

- Does it feel comfortable on an iPhone?
- Is typography similar in density to native applications?
- Are touch targets appropriate?
- Are sheets and transitions natural?
- Does navigation communicate hierarchy?

### AI-design check

Ask:

> Does this screen look like something automatically generated by a generic AI frontend tool?

If yes, identify why.

Common reasons:

- too many cards
- excessive rounding
- giant headings
- too much whitespace
- repetitive containers
- unnecessary gradients
- arbitrary colored icons
- generic dashboard structure

Remove those patterns.

### Product specificity

Ask:

> Does this screen feel specifically designed for NosVamos and for someone currently travelling?

If not, refine it.

---

# Core principle

NosVamos should not try to look impressive.

It should feel effortless.

The design should disappear behind the user's trip information.

Preserve the identity that already exists, simplify everything around it, and use restrained iPhone-inspired UX patterns with polished navigation transitions.