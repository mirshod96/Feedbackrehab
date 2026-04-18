import React from 'react';

export const GlassContainer = ({ children, className = '' }) => {
  return (
    <div className={`glass glass-panel ${className}`}>
      {children}
    </div>
  );
};
