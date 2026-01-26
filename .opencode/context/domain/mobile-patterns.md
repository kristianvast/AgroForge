# Mobile Design Patterns

## Responsive Breakpoints

| Name | Width | Use Case |
|------|-------|----------|
| Default | <640px | Mobile phones (portrait) |
| sm | 640px+ | Large phones, small tablets |
| md | 768px+ | Tablets (portrait) |
| lg | 1024px+ | Tablets (landscape), small laptops |
| xl | 1280px+ | Desktops |

## Mobile-First Approach

Always start with mobile styles, then enhance:

```css
/* Mobile (default) */
.component {
  padding: var(--spacing-sm);
  flex-direction: column;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    padding: var(--spacing-md);
    flex-direction: row;
  }
}
```

## Touch Targets

### Minimum Sizes
- **Buttons**: 44x44px minimum
- **List items**: 48px row height
- **Icons**: 24px icon + 10px padding each side

### Implementation
```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 10px;
}
```

## Common Mobile Patterns

### Collapsible Navigation
On mobile, navigation should collapse to hamburger menu:

```tsx
<Show when={isMobile()} fallback={<DesktopNav />}>
  <MobileNav />
</Show>
```

### Bottom Navigation
For primary actions on mobile:
- Fixed to bottom
- Large touch targets
- 3-5 items max

### Pull-to-Refresh
For list views that need refreshing.

### Swipe Gestures
- Swipe to dismiss
- Swipe to reveal actions
- Swipe between views

## Input Handling

### Preventing Zoom on Focus
```css
input, select, textarea {
  font-size: 16px; /* Prevents iOS zoom */
}
```

### Keyboard Considerations
- Input fields should not be obscured by keyboard
- Use `inputmode` for appropriate keyboard
- Handle keyboard dismiss

```tsx
<input 
  inputmode="numeric"  // Numeric keyboard
  enterkeyhint="send"  // Enter key label
/>
```

## Viewport Considerations

### Safe Areas
Account for notches and home indicators:

```css
.bottom-bar {
  padding-bottom: env(safe-area-inset-bottom);
}

.top-bar {
  padding-top: env(safe-area-inset-top);
}
```

### Viewport Meta
Ensure proper viewport in HTML:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

## Performance on Mobile

### Scroll Performance
```css
.scrollable {
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
}
```

### Animation Performance
- Use `transform` and `opacity` for animations
- Avoid animating `width`, `height`, `top`, `left`
- Use `will-change` sparingly

### Image Optimization
- Use responsive images with srcset
- Lazy load below-fold images
- Use appropriate formats (WebP)

## Testing Checklist

### Viewport Testing
- [ ] Portrait phone (375x667)
- [ ] Landscape phone (667x375)
- [ ] Portrait tablet (768x1024)
- [ ] Landscape tablet (1024x768)

### Interaction Testing
- [ ] All buttons tappable
- [ ] Forms usable with keyboard
- [ ] Scroll works smoothly
- [ ] No accidental taps (targets not too close)

### Device Testing
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Different screen densities
