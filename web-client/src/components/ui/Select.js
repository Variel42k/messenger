import React, { useId } from 'react';
import './ui.css';

export const Select = React.forwardRef(function Select(
  { label, error, hint, className = '', id, options = [], children, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = error || hint ? `${inputId}-description` : undefined;

  return (
    <label className={`ui-field ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="ui-field__label">{label}</span>}
      <select
        ref={ref}
        id={inputId}
        className="ui-select"
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        {...props}
      >
        {children || options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || hint) && (
        <span id={descriptionId} className={error ? 'ui-field__error' : 'ui-field__hint'}>
          {error || hint}
        </span>
      )}
    </label>
  );
});
