# UI Components Catalog

## Component Organization

```
packages/ui/src/components/
├── session/              # Session-related views
├── tool-call/            # Tool call rendering
│   └── renderers/        # Specific tool renderers
├── instance/             # Instance management
└── [root]                # Core components
```

## Core Components

### Layout & Navigation
| Component | Purpose | File |
|-----------|---------|------|
| App | Root application component | `App.tsx` |
| session-view | Main session display | `session/session-view.tsx` |
| instance-tabs | Tab navigation for instances | `instance-tabs.tsx` |
| instance-tab | Individual tab | `instance-tab.tsx` |
| session-list | List of sessions | `session-list.tsx` |
| command-palette | Command search/execute | `command-palette.tsx` |

### Messaging
| Component | Purpose | File |
|-----------|---------|------|
| message-block | Container for message | `message-block.tsx` |
| message-block-list | List of message blocks | `message-block-list.tsx` |
| message-item | Individual message | `message-item.tsx` |
| message-part | Message content part | `message-part.tsx` |
| message-section | Section within message | `message-section.tsx` |
| message-preview | Preview of message | `message-preview.tsx` |
| prompt-input | User input field | `prompt-input.tsx` |

### Tool Call Renderers
| Renderer | Purpose | File |
|----------|---------|------|
| bash | Terminal command output | `renderers/bash.tsx` |
| edit | File edit display | `renderers/edit.tsx` |
| read | File read display | `renderers/read.tsx` |
| write | File write display | `renderers/write.tsx` |
| task | Task status display | `renderers/task.tsx` |
| todo | Todo list display | `renderers/todo.tsx` |
| question | Interactive question | `renderers/question.tsx` |

### Selectors & Controls
| Component | Purpose | File |
|-----------|---------|------|
| model-selector | AI model selection | `model-selector.tsx` |
| agent-selector | Agent selection | `agent-selector.tsx` |
| unified-picker | Generic picker component | `unified-picker.tsx` |

### Dialogs & Modals
| Component | Purpose | File |
|-----------|---------|------|
| permission-approval-modal | Permission requests | `permission-approval-modal.tsx` |
| advanced-settings-modal | Settings dialog | `advanced-settings-modal.tsx` |
| filesystem-browser-dialog | File browser | `filesystem-browser-dialog.tsx` |
| session-rename-dialog | Rename session | `session-rename-dialog.tsx` |
| alert-dialog | Alert messages | `alert-dialog.tsx` |

## Component Patterns

### Basic Component Structure
```tsx
import { Component, createSignal, Show } from 'solid-js';

interface Props {
  title: string;
  onAction?: () => void;
}

export const MyComponent: Component<Props> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  
  return (
    <div class="my-component">
      <Show when={isOpen()}>
        <div class="content">{props.title}</div>
      </Show>
    </div>
  );
};
```

### With Kobalte
```tsx
import { Dialog } from '@kobalte/core';

export const MyDialog: Component<Props> = (props) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="dialog-overlay" />
        <Dialog.Content class="dialog-content">
          {props.children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
```

### With SUID Material
```tsx
import { Button, TextField } from '@suid/material';

export const MyForm: Component = () => {
  return (
    <div>
      <TextField label="Name" variant="outlined" />
      <Button variant="contained">Submit</Button>
    </div>
  );
};
```

## Mobile Considerations

### Touch-Friendly Components
- Buttons: min 44x44px touch target
- Lists: adequate row height for tapping
- Inputs: proper focus states, no zoom on focus

### Responsive Patterns
- Use Show/Match for viewport-conditional rendering
- Adjust spacing with responsive utilities
- Consider drawer vs inline for navigation
