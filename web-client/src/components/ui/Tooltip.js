import React, { useId, useState } from 'react';
import './ui.css';

export function Tooltip({ content, children }) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="ui-tooltip"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(children, { 'aria-describedby': visible ? id : undefined })}
      {visible && (
        <span id={id} role="tooltip" className="ui-tooltip__content">
          {content}
        </span>
      )}
    </span>
  );
}
