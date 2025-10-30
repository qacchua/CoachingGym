import React from 'react';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 md:p-8 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

export default Card;