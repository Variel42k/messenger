import React, { useState } from 'react';
import { Button } from './Button';
import './ui.css';

export function ErrorState({ title = 'Something went wrong', message, details, onRetry }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <section className="ui-state ui-state--error" role="alert">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      <div className="ui-state__actions">
        {onRetry && <Button onClick={onRetry}>Retry</Button>}
        {details && (
          <Button variant="ghost" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? 'Hide details' : 'Show details'}
          </Button>
        )}
      </div>
      {details && showDetails && <pre className="ui-state__details">{String(details)}</pre>}
    </section>
  );
}
