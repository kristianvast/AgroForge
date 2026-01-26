# CodeNomad Styling System

## File Organization

```
packages/ui/src/styles/
├── tokens.css           # Design tokens (colors, spacing, etc.)
├── utilities.css        # Utility classes
├── controls.css         # Aggregator: imports from components/
├── messaging.css        # Aggregator: imports from messaging/
├── panels.css           # Aggregator: imports from panels/
├── markdown.css         # Markdown rendering styles
├── components/          # Component-specific styles
│   ├── buttons.css
│   ├── badges.css
│   ├── dropdown.css
│   ├── selector.css
│   └── ...
├── messaging/           # Messaging-related styles
│   ├── message-base.css
│   ├── message-block-list.css
│   ├── prompt-input.css
│   ├── tool-call.css
│   └── tool-call/       # Tool-specific styles
│       ├── task.css
│       └── todo.css
└── panels/              # Panel and layout styles
    ├── session-layout.css
    ├── panel-shell.css
    ├── tabs.css
    └── modal.css
```

## Design Tokens (tokens.css)

### Colors
```css
:root {
  /* Primary palette */
  --color-primary: ...;
  --color-primary-hover: ...;
  
  /* Backgrounds */
  --color-bg: ...;
  --color-bg-secondary: ...;
  
  /* Text */
  --color-text: ...;
  --color-text-muted: ...;
  
  /* Borders */
  --color-border: ...;
}
```

### Spacing
```css
:root {
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```

### Typography
```css
:root {
  --font-family: ...;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
}
```

## Utility Classes (utilities.css)

Common utilities available:
- `.flex`, `.flex-col`, `.flex-row`
- `.items-center`, `.justify-between`
- `.gap-*` for spacing
- `.text-*` for typography
- `.truncate` for text overflow

## Adding New Styles

### 1. Check Existing
Before adding new styles, check:
- `tokens.css` for design tokens
- `utilities.css` for utility classes
- Existing component files for patterns

### 2. Choose Location
- **General utility**: `utilities.css`
- **New token**: `tokens.css`
- **Component style**: `components/[component].css`
- **Messaging feature**: `messaging/[feature].css`
- **Panel/layout**: `panels/[feature].css`

### 3. Follow Conventions
```css
/* Component scoping */
.my-component {
  /* Base styles */
}

.my-component__element {
  /* Child element */
}

.my-component--variant {
  /* Modifier */
}
```

### 4. Update Aggregator
If adding new file, import in aggregator:
```css
/* In controls.css, messaging.css, or panels.css */
@import './components/my-new-component.css';
```

## Tailwind Integration

Tailwind is available for utility classes. Use for:
- Quick prototyping
- One-off styles
- Responsive utilities

```tsx
<div class="flex items-center gap-2 p-4 md:p-6">
  <span class="text-sm text-gray-500">Label</span>
</div>
```

## Responsive Breakpoints

```css
/* Mobile first approach */
.component { /* mobile styles */ }

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## Best Practices

1. **Reuse tokens** before creating new values
2. **Keep files small** (~150 lines max)
3. **One concern per file** - don't mix unrelated styles
4. **Use aggregators** for imports only
5. **Mobile first** - base styles for mobile, enhance for larger
6. **Document deviations** from patterns
