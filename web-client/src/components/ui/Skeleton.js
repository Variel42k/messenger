import React from 'react';
import './ui.css';

export function Skeleton({ width = '100%', height = '1rem', className = '', label = 'Loading' }) {
  return (
    <span
      className={`ui-skeleton ${className}`.trim()}
      style={{ width, height }}
      role="status"
      aria-label={label}
    />
  );
}
