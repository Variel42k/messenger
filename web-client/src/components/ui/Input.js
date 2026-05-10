import React, { useId } from 'react';
import './ui.css';

export const Input = React.forwardRef(function Input(
  { label, error, hint, className = '', id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = error || hint ? `${inputId}-description` : undefined;

  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="ui-field__label">{label}</span>}
      <input
        ref={ref}
        id={inputId}
        className="ui-input"
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
