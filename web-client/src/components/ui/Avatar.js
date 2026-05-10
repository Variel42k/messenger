import React from 'react';
import './ui.css';

function initialsFor(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

export function Avatar({ src, name, size = 'md', status, className = '' }) {
  return (
    <span className={`ui-avatar ui-avatar--${size} ${className}`.trim()} aria-label={name}>
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initialsFor(name)}</span>}
      {status && <span className={`ui-avatar__status ui-avatar__status--${status}`} aria-label={status} />}
    </span>
  );
}
