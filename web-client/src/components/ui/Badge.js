import React from 'react';
import './ui.css';

export function Badge({ children, status = 'neutral', className = '', ...props }) {
  return (
    <span className={`ui-badge ui-badge--${status} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
}
