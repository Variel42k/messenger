import React from 'react';
import { Button } from './Button';
import './ui.css';

export function ToastRegion({ toasts = [], onDismiss }) {
  return (
    <div className="ui-toast-region" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ui-toast ui-toast--${toast.status || 'info'}`} role="status">
          <div>
            <strong>{toast.title}</strong>
            {toast.message && <p>{toast.message}</p>}
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
              X
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
