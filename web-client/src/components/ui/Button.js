import React from 'react';
import './ui.css';

export const Button = React.forwardRef(function Button(
  { children, className = '', variant = 'primary', size = 'md', type = 'button', isLoading = false, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {children}
    </button>
  );
});
