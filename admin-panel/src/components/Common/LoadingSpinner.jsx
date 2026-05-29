import React from 'react';

export default function LoadingSpinner({ message = 'Loading live data...' }) {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
}
