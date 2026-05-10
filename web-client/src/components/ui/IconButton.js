import React from 'react';
import { Button } from './Button';

export const IconButton = React.forwardRef(function IconButton(
  { icon, label, children, className = '', variant = 'ghost', ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      className={`ui-icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {icon || children}
    </Button>
  );
});
