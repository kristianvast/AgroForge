# Visual Design Standards

## Design Principles

### Consistency
- Use established patterns
- Reuse components
- Follow token system

### Clarity
- Clear visual hierarchy
- Readable typography
- Obvious interactions

### Efficiency
- Minimal steps for tasks
- Clear feedback
- Fast interactions

## Color System

### Usage Guidelines
| Purpose | Token | Use For |
|---------|-------|---------|
| Primary | `--color-primary` | Actions, links, focus |
| Background | `--color-bg` | Main surfaces |
| Background Alt | `--color-bg-secondary` | Cards, panels |
| Text | `--color-text` | Primary content |
| Text Muted | `--color-text-muted` | Secondary content |
| Border | `--color-border` | Dividers, outlines |
| Success | `--color-success` | Confirmations |
| Error | `--color-error` | Errors, destructive |
| Warning | `--color-warning` | Cautions |

### Contrast Requirements
- Body text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

## Typography

### Scale
| Name | Size | Use For |
|------|------|---------|
| xs | 0.75rem (12px) | Labels, captions |
| sm | 0.875rem (14px) | Secondary text |
| base | 1rem (16px) | Body text |
| lg | 1.125rem (18px) | Subheadings |
| xl | 1.25rem (20px) | Headings |
| 2xl | 1.5rem (24px) | Page titles |

### Line Height
- Headings: 1.2-1.3
- Body: 1.5-1.6
- UI elements: 1.25

### Font Weight
- Normal (400): Body text
- Medium (500): Emphasis, labels
- Semibold (600): Headings
- Bold (700): Strong emphasis

## Spacing

### Scale
| Token | Value | Use For |
|-------|-------|---------|
| xs | 0.25rem (4px) | Tight grouping |
| sm | 0.5rem (8px) | Related items |
| md | 1rem (16px) | Component padding |
| lg | 1.5rem (24px) | Section spacing |
| xl | 2rem (32px) | Large gaps |
| 2xl | 3rem (48px) | Page sections |

### Application
- **Within components**: xs-sm
- **Component padding**: sm-md
- **Between components**: md-lg
- **Between sections**: lg-xl

## Components

### Buttons
| Variant | Use For |
|---------|---------|
| Primary | Main actions |
| Secondary | Alternative actions |
| Ghost | Subtle actions |
| Destructive | Delete, remove |

**Sizing**:
- Small: 32px height
- Medium: 40px height
- Large: 48px height

### Cards & Panels
- Background: `--color-bg-secondary`
- Border radius: 8px
- Padding: `--spacing-md`
- Shadow: subtle for elevation

### Inputs
- Height: 40px (44px on mobile)
- Border: 1px solid `--color-border`
- Focus: `--color-primary` border
- Error: `--color-error` border

### Icons
- Standard size: 20px
- Touch target size: 44px (with padding)
- Color: inherit from text or explicit

## Layout

### Grid
- Max width: 1200px
- Gutter: 16px (mobile), 24px (desktop)
- Columns: 12 (desktop), 4 (mobile)

### Stacking (z-index)
| Level | Value | Use For |
|-------|-------|---------|
| Base | 0 | Normal content |
| Elevated | 10 | Cards, dropdowns |
| Sticky | 100 | Fixed headers |
| Modal | 1000 | Modals, overlays |
| Toast | 1100 | Notifications |

## Animation

### Timing
- Instant: 0ms (focus states)
- Fast: 150ms (hover, micro-interactions)
- Normal: 250ms (transitions)
- Slow: 400ms (large movements)

### Easing
- Enter: `ease-out`
- Exit: `ease-in`
- Move: `ease-in-out`

### What to Animate
- Color changes
- Opacity
- Transform (scale, translate)
- Shadow/elevation

### What Not to Animate
- Width/height (use scale)
- Position (use transform)
- Layout properties

## Accessibility

### Focus Indicators
- Visible outline on all interactive elements
- 2px solid `--color-primary`
- Don't remove without replacement

### Color Independence
- Don't rely on color alone
- Use icons, text, or patterns as well

### Motion Sensitivity
- Respect `prefers-reduced-motion`
- Provide static alternatives
