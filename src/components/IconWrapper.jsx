import React from 'react';

const IconWrapper = ({ children, className = '' }) => (
  <div className={`bg-stone-200 text-stone-700 rounded-lg p-3 inline-flex ${className}`}>
    {children}
  </div>
);

export default IconWrapper;