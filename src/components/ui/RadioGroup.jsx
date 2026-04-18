import React from 'react';
import './ui.css';

export const RadioGroup = ({ label, options, name, value, onChange, error }) => {
  return (
    <div className="radio-group-wrapper">
      <div className="radio-group-label">{label}</div>
      <div className="radio-options">
        {options.map((opt) => (
          <label key={opt.value} className={`radio-option ${value === opt.value ? 'selected' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};
