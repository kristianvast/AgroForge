# Component Template

## Basic Component

```tsx
// packages/ui/src/components/my-component.tsx

import { Component, createSignal, Show } from 'solid-js';
import './my-component.css';

interface MyComponentProps {
  /** Main title displayed in the component */
  title: string;
  /** Optional description text */
  description?: string;
  /** Callback when action is triggered */
  onAction?: () => void;
  /** Child elements */
  children?: JSX.Element;
}

export const MyComponent: Component<MyComponentProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(false);
  
  const handleClick = () => {
    setIsExpanded(!isExpanded());
    props.onAction?.();
  };
  
  return (
    <div class="my-component">
      <div class="my-component__header">
        <h3 class="my-component__title">{props.title}</h3>
        <Show when={props.description}>
          <p class="my-component__description">{props.description}</p>
        </Show>
      </div>
      
      <Show when={isExpanded()}>
        <div class="my-component__content">
          {props.children}
        </div>
      </Show>
      
      <button 
        class="my-component__toggle"
        onClick={handleClick}
      >
        {isExpanded() ? 'Collapse' : 'Expand'}
      </button>
    </div>
  );
};
```

## Component Styles

```css
/* packages/ui/src/styles/components/my-component.css */

.my-component {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: var(--spacing-md);
}

.my-component__header {
  margin-bottom: var(--spacing-sm);
}

.my-component__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.my-component__description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin: var(--spacing-xs) 0 0;
}

.my-component__content {
  padding: var(--spacing-sm) 0;
  border-top: 1px solid var(--color-border);
  margin-top: var(--spacing-sm);
}

.my-component__toggle {
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.my-component__toggle:hover {
  opacity: 0.9;
}

.my-component__toggle:active {
  opacity: 0.8;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .my-component {
    padding: var(--spacing-sm);
  }
  
  .my-component__toggle {
    width: 100%;
  }
}
```

## With Kobalte (Accessible Dialog)

```tsx
import { Component } from 'solid-js';
import { Dialog } from '@kobalte/core';
import './my-dialog.css';

interface MyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
}

export const MyDialog: Component<MyDialogProps> = (props) => {
  return (
    <Dialog.Root open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog-overlay" />
        <Dialog.Content class="dialog-content">
          <Dialog.Title class="dialog-title">{props.title}</Dialog.Title>
          <Dialog.Description class="dialog-body">
            {props.children}
          </Dialog.Description>
          <Dialog.CloseButton class="dialog-close">
            Close
          </Dialog.CloseButton>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
```

## With Store Integration

```tsx
import { Component, createEffect } from 'solid-js';
import { useSession } from '../stores/session';

export const SessionStatus: Component = () => {
  const session = useSession();
  
  createEffect(() => {
    // React to session changes
    console.log('Session updated:', session.current());
  });
  
  return (
    <div class="session-status">
      <Show when={session.isLoading()}>
        <Spinner />
      </Show>
      <Show when={session.current()}>
        <span>{session.current()?.name}</span>
      </Show>
    </div>
  );
};
```

## Checklist

When creating a new component:

- [ ] Props interface defined with JSDoc
- [ ] Follows SolidJS patterns (signals, Show/For)
- [ ] CSS in separate file with BEM naming
- [ ] Uses design tokens for values
- [ ] Mobile responsive (44px touch targets)
- [ ] Accessible (keyboard, screen reader)
- [ ] TypeScript compiles cleanly
- [ ] Exported from appropriate index
