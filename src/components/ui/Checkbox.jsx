import React from 'react';
import './ui.css';

export const Checkbox = ({ id, label, checked, onChange }) => {
  return (
    <label htmlFor={id} className="checkbox-wrapper">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
      />
      <span className="checkbox-custom"></span>
      <span className="checkbox-label">{label}</span>
    </label>
  );
};
