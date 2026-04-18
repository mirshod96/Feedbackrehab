import React from 'react';
import './ui.css';

export const TextInput = ({ label, id, error, className = '', ...props }) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <input id={id} className={`text-input ${error ? 'input-error' : ''}`} {...props} />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export const DatePicker = ({ label, id, error, className = '', ...props }) => {
  return (
    <div className={`input-wrapper ${className}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <input type="date" id={id} className={`text-input ${error ? 'input-error' : ''}`} {...props} />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};
