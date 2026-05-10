import React, { useRef } from 'react';
import { Button } from './Button';
import { useFocusTrap } from './focusTrap';
import './ui.css';

export function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel = 'Close',
  labelledBy,
  describedBy,
}) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { enabled: open, onEscape: onClose });

  if (!open) {
    return null;
  }

  const titleId = labelledBy || 'ui-dialog-title';
  const descriptionId = describedBy || (description ? 'ui-dialog-description' : undefined);

  return (
    <div className="ui-modal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex="-1"
      >
        <header className="ui-dialog__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={closeLabel}>
              X
            </Button>
          )}
        </header>
        <div className="ui-dialog__body">{children}</div>
        {footer && <footer className="ui-dialog__footer">{footer}</footer>}
      </section>
    </div>
  );
}
