import React, { useEffect, useRef } from 'react';
import { Button } from '../components/ui';
import { useFocusTrap } from '../components/ui/focusTrap';

function useBodyScrollLock(enabled) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [enabled]);
}

export function MobileBottomSheet({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel = 'Close',
}) {
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, { enabled: open, onEscape: onClose });
  useBodyScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <div className="mobile-sheet-layer" role="presentation" data-testid="mobile-bottom-sheet">
      <section
        ref={sheetRef}
        className="mobile-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-bottom-sheet-title"
        tabIndex="-1"
      >
        <div className="mobile-bottom-sheet__handle" aria-hidden="true" />
        <header className="mobile-bottom-sheet__header">
          <div>
            <h2 id="mobile-bottom-sheet-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="mobile-icon-button" onClick={onClose} aria-label={closeLabel}>
            X
          </button>
        </header>
        <div className="mobile-bottom-sheet__body">{children}</div>
        {footer && <footer className="mobile-bottom-sheet__footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function MobileFullscreenDialog({ open, title, children, footer, onClose, closeLabel = 'Close' }) {
  const dialogRef = useRef(null);
  useFocusTrap(dialogRef, { enabled: open, onEscape: onClose });
  useBodyScrollLock(open);

  if (!open) {
    return null;
  }

  return (
    <div className="mobile-fullscreen-dialog" role="presentation">
      <section
        ref={dialogRef}
        className="mobile-fullscreen-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-fullscreen-dialog-title"
        tabIndex="-1"
      >
        <header className="mobile-fullscreen-dialog__header">
          <button type="button" className="mobile-back-button" onClick={onClose} aria-label={closeLabel}>
            Back
          </button>
          <h2 id="mobile-fullscreen-dialog-title">{title}</h2>
        </header>
        <div className="mobile-fullscreen-dialog__body">{children}</div>
        {footer && <footer className="mobile-fullscreen-dialog__footer">{footer}</footer>}
      </section>
    </div>
  );
}

export function MobileActionMenu({ actions = [] }) {
  return (
    <div className="mobile-action-menu" role="menu">
      {actions.map((action) => (
        <button
          key={action.key || action.label}
          type="button"
          role="menuitem"
          className={`mobile-action-menu__item ${action.danger ? 'mobile-action-menu__item--danger' : ''}`}
          disabled={action.disabled}
          onClick={action.onSelect}
        >
          <span>{action.label}</span>
          {action.description && <small>{action.description}</small>}
        </button>
      ))}
    </div>
  );
}

export function MobileConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  return (
    <MobileBottomSheet
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      {children}
    </MobileBottomSheet>
  );
}
