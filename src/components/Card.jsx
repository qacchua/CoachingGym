import React from 'react';

const Card = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick} 
    className={`bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-6 md:p-10 transition-all duration-500 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
  >
    {children}
  </div>
);

export default Card;