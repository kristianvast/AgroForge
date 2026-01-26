# Code Quality Standards

## TypeScript Standards

### Type Safety
- Prefer explicit types over `any`
- Use type inference when type is obvious
- Define interfaces for component props
- Use discriminated unions for complex state

```typescript
// Good
interface Props {
  title: string;
  onAction: () => void;
  variant?: 'primary' | 'secondary';
}

// Bad
interface Props {
  title: any;
  onAction: Function;
}
```

### Null Handling
- Use optional chaining (`?.`)
- Use nullish coalescing (`??`)
- Avoid non-null assertions (`!`) unless certain

```typescript
// Good
const name = user?.profile?.name ?? 'Unknown';

// Bad
const name = user!.profile!.name;
```

## SolidJS Standards

### Component Structure
```typescript
import { Component, createSignal, Show } from 'solid-js';

interface Props {
  title: string;
  children?: JSX.Element;
}

export const MyComponent: Component<Props> = (props) => {
  const [state, setState] = createSignal(false);
  
  return (
    <div class="my-component">
      <Show when={state()}>
        {props.children}
      </Show>
    </div>
  );
};
```

### Reactivity Rules
- Access signals in JSX or effects, not in setup
- Use `createMemo` for derived values
- Use `createEffect` for side effects
- Don't destructure props (breaks reactivity)

```typescript
// Good - props accessed in JSX
<div>{props.title}</div>

// Bad - destructured props lose reactivity
const { title } = props;
<div>{title}</div>
```

### Conditional Rendering
- Use `<Show>` for conditional content
- Use `<For>` for lists
- Use `<Switch>/<Match>` for multiple conditions

```typescript
// Good
<Show when={isLoading()} fallback={<Content />}>
  <Spinner />
</Show>

<For each={items()}>{(item) => <Item data={item} />}</For>
```

## CSS Standards

### Organization
- One component per CSS file (~150 lines max)
- Use tokens for values
- Follow BEM-like naming

```css
/* Component scope */
.message-block { }
.message-block__header { }
.message-block--highlighted { }
```

### Values
- Use tokens from `tokens.css`
- Use relative units (rem, em, %)
- Avoid magic numbers

```css
/* Good */
.component {
  padding: var(--spacing-md);
  color: var(--color-text);
}

/* Bad */
.component {
  padding: 13px;  /* Magic number */
  color: #333;    /* Hardcoded */
}
```

## File Organization

### Imports
Order imports consistently:
1. External libraries
2. Internal modules
3. Types
4. Styles

```typescript
// External
import { Component, createSignal } from 'solid-js';
import { Button } from '@kobalte/core';

// Internal
import { useSession } from '../stores/session';
import { formatDate } from '../lib/utils';

// Types
import type { Message } from '../types';

// Styles
import './message.css';
```

### Exports
- Prefer named exports
- One component per file
- Co-locate related code

## Error Handling

### Try-Catch
- Catch specific errors when possible
- Provide meaningful error messages
- Don't swallow errors silently

```typescript
// Good
try {
  await saveFile(data);
} catch (error) {
  if (error instanceof PermissionError) {
    showNotification('Permission denied');
  } else {
    console.error('Save failed:', error);
    showNotification('Failed to save file');
  }
}

// Bad
try {
  await saveFile(data);
} catch {
  // Silent failure
}
```

## Comments

### When to Comment
- Complex business logic
- Non-obvious workarounds
- TODO/FIXME with context

### When Not to Comment
- Obvious code
- Every function/variable
- Outdated information

```typescript
// Good - explains why
// Using RAF to ensure DOM is updated before measuring
requestAnimationFrame(() => measureHeight());

// Bad - explains what (obvious from code)
// Set the count to zero
setCount(0);
```

## Testing Checklist

Before committing:
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] No console errors in browser
- [ ] Responsive layout works
- [ ] Component handles edge cases
- [ ] No unused imports/variables
