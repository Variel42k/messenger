import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(containerRef, { enabled = true, onEscape } = {}) {
  useEffect(() => {
    if (!enabled || !containerRef.current) {
      return undefined;
    }

    const container = containerRef.current;
    const previousActiveElement = document.activeElement;
    const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
    const first = focusable[0] || container;
    first.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape(event);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const activeFocusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
      if (activeFocusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = activeFocusable[0];
      const lastElement = activeFocusable[activeFocusable.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement?.focus) {
        previousActiveElement.focus();
      }
    };
  }, [containerRef, enabled, onEscape]);
}
