# Accessibility / Доступность

## Русский

### Keyboard Navigation
Все интерактивные элементы должны быть достижимы через Tab. Dropdown menu, dialogs and drawers must preserve logical focus order.

### Focus Management
`Dialog` и `Drawer` используют focus trap, возвращают фокус на предыдущий элемент и поддерживают Escape close, если действие безопасно.

### ARIA Patterns
- `IconButton` требует `label`.
- Inputs, Textarea and Select link validation errors via `aria-describedby`.
- `ToastRegion` uses `aria-live="polite"`.
- Active nav items should use `aria-current`.
- Drawers and dialogs use `role="dialog"` and `aria-modal="true"`.

### Reduced Motion
`tokens.css` disables long transitions and animations when `prefers-reduced-motion: reduce`.

### Known Limitations
Existing `ChatWindow` and `AdminPanel` still need a full WCAG 2.2 AA pass during screen migration.

## English

### Keyboard Navigation
All interactive elements must be reachable through Tab. Dropdown menus, dialogs and drawers must preserve logical focus order.

### Focus Management
`Dialog` and `Drawer` use a focus trap, restore focus to the previous element and support Escape close when the action is safe.

### ARIA Patterns
- `IconButton` requires `label`.
- Inputs, Textarea and Select link validation errors through `aria-describedby`.
- `ToastRegion` uses `aria-live="polite"`.
- Active nav items should use `aria-current`.
- Drawers and dialogs use `role="dialog"` and `aria-modal="true"`.

### Reduced Motion
`tokens.css` disables long transitions and animations when `prefers-reduced-motion: reduce`.

### Known Limitations
Existing `ChatWindow` and `AdminPanel` still need a full WCAG 2.2 AA pass during screen migration.
