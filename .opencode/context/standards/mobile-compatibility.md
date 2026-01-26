# Mobile Compatibility Standards

## Required for All UI Components

### Touch Targets
- **Minimum size**: 44x44px for all interactive elements
- **Spacing**: At least 8px between adjacent touch targets
- **Implementation**: Use padding to achieve size, not just visual size

```css
/* Good */
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* Bad */
.button {
  height: 30px;  /* Too small */
}
```

### Responsive Layout
- **Mobile-first**: Base styles for mobile, enhance for larger screens
- **No horizontal scroll**: Content must fit viewport width
- **Flexible containers**: Use relative units and flex/grid

```css
/* Good */
.container {
  width: 100%;
  max-width: 1200px;
  padding: 0 var(--spacing-md);
}

/* Bad */
.container {
  width: 1200px;  /* Will overflow on mobile */
}
```

### Typography
- **Minimum body text**: 16px (prevents iOS zoom on focus)
- **Readable line length**: 45-75 characters
- **Truncation**: Use ellipsis for overflow, never clip text

```css
.body-text {
  font-size: 16px;  /* Minimum for mobile */
  line-height: 1.5;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Inputs
- **Font size**: 16px minimum (prevents iOS zoom)
- **Padding**: Adequate for touch (12px+)
- **Labels**: Always visible, not placeholder-only

```css
input, select, textarea {
  font-size: 16px;
  padding: 12px;
}
```

## Breakpoint Standards

| Breakpoint | Width | Target |
|------------|-------|--------|
| Default | <640px | Mobile phones |
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Small laptops |
| xl | 1280px | Desktops |

### Implementation Pattern
```css
/* Mobile first - no media query */
.component {
  flex-direction: column;
  padding: var(--spacing-sm);
}

/* Tablet */
@media (min-width: 768px) {
  .component {
    flex-direction: row;
    padding: var(--spacing-md);
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .component {
    padding: var(--spacing-lg);
  }
}
```

## Interaction Standards

### Hover vs Touch
- Hover states must have touch equivalents
- Never rely on hover for essential functionality
- Use `:active` for touch feedback

```css
.button:hover {
  background: var(--color-hover);
}

/* Touch equivalent */
.button:active {
  background: var(--color-active);
}
```

### Focus States
- Visible focus indicators for keyboard navigation
- Don't remove outline without replacement

```css
.button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### Scroll Behavior
- Smooth scrolling for anchor links
- Touch-friendly scrolling
- No scroll trapping

```css
.scrollable {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

## Safe Areas

Account for device notches and home indicators:

```css
.fixed-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.fixed-top {
  padding-top: env(safe-area-inset-top, 0);
}
```

## Testing Requirements

Every UI change must be verified:

- [ ] Works at 375px width (iPhone SE)
- [ ] Works at 390px width (iPhone 14)
- [ ] Works at 768px width (tablet)
- [ ] Touch targets are 44px+
- [ ] No horizontal scroll
- [ ] Text is readable (16px+)
- [ ] Inputs don't trigger zoom

## Exceptions

Document any intentional deviations:
- Why the exception is needed
- What the alternative experience is
- When it will be addressed (if temporary)
