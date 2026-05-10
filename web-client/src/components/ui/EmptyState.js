import React from 'react';
import './ui.css';

export function EmptyState({ title, description, action }) {
  return (
    <section className="ui-state ui-state--empty">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="ui-state__action">{action}</div>}
    </section>
  );
}
