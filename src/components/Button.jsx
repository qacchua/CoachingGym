import React from 'react';

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-lg transition-transform duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-stone-700 text-white hover:bg-stone-800 active:scale-95 shadow-lg shadow-stone-500/30',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:scale-95',
  };
  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;