import React from 'react';

export default function UrgencyBadge({ urgency }) {
  const getUrgencyStyles = (val) => {
    const u = String(val).toLowerCase();
    switch (u) {
      case 'emergency':
        return { text: '🚨 EMERGENCY', className: 'urgency-emergency' };
      case 'high_priority':
        return { text: '⚡ HIGH PRIORITY', className: 'urgency-high' };
      case 'normal':
      default:
        return { text: '✓ Normal', className: 'urgency-normal' };
    }
  };

  const { text, className } = getUrgencyStyles(urgency);

  return (
    <span className={`urgency-badge ${className}`}>
      {text}
    </span>
  );
}
