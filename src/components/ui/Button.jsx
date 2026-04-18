import React from 'react';
import { Loader2 } from 'lucide-react';
import './ui.css';

export const Button = ({ children, isLoading, variant = 'primary', className = '', ...props }) => {
  return (
    <button 
      className={`btn btn-${variant} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="btn-spinner" size={18} />}
      {children}
    </button>
  );
};
