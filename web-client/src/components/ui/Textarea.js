import React, { useId } from 'react';
import './ui.css';

export const Textarea = React.forwardRef(function Textarea(
  { label, error, hint, className = '', id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = error || hint ? `${inputId}-description` : undefined;

  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="ui-field__label">{label}</span>}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className="ui-textarea"
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...props}
      />
      {(error || hint) && (
        <span id={descriptionId} className={error ? 'ui-field__error' : 'ui-field__hint'}>
          {error || hint}
        </span>
      )}
    </label>
  );
});
