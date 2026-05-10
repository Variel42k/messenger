import React, { useRef } from 'react';
import { Button } from './Button';
import { useFocusTrap } from './focusTrap';
import './ui.css';

export function Drawer({
  open,
  title,
  side = 'right',
  children,
  footer,
  onClose,
  closeLabel = 'Close',
}) {
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, { enabled: open, onEscape: onClose });

  if (!open) {
    return null;
  }

  return (
    <div className="ui-drawer-layer" role="presentation">
      <aside
        ref={drawerRef}
        className={`ui-drawer ui-drawer--${side}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-drawer-title"
        tabIndex="-1"
      >
        <header className="ui-drawer__header">
          <h2 id="ui-drawer-title">{title}</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={closeLabel}>
              X
            </Button>
          )}
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer && <footer className="ui-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  );
}
