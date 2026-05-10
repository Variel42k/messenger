import React, { useId, useRef, useState } from 'react';
import { Button } from './Button';
import './ui.css';

export function DropdownMenu({ label, items = [], align = 'start' }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef(null);

  return (
    <div className="ui-dropdown">
      <Button
        ref={buttonRef}
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </Button>
      {open && (
        <div id={menuId} className={`ui-dropdown__menu ui-dropdown__menu--${align}`} role="menu">
          {items.map((item) => (
            <button
              key={item.key || item.label}
              type="button"
              role="menuitem"
              className="ui-dropdown__item"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect?.();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
