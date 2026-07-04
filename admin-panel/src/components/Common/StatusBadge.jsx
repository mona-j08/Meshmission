import React from 'react';

export default function StatusBadge({ status }) {
  const getStatusStyles = (statusVal) => {
    const s = String(statusVal).toLowerCase();
    switch (s) {
      // Donation & Delivery Statuses
      case 'uploaded':
        return { text: 'Uploaded', className: 'badge-uploaded' };
      case 'pending':
        return { text: 'Pending', className: 'badge-pending' };
      case 'approved':
      case 'delivered':
      case 'completed':
        return { text: statusVal.replace('_', ' '), className: 'badge-success' };
      case 'rejected':
      case 'declined':
        return { text: statusVal, className: 'badge-danger' };
      case 'assigned':
      case 'scheduled':
        return { text: statusVal, className: 'badge-info' };
      case 'accepted':
      case 'in_transit':
      case 'picked_up':
        return { text: 'Picked Up', className: 'badge-info' };
      case 'needs_review':
        return { text: 'Needs Review', className: 'badge-review' };
      default:
        return { text: statusVal || 'Unknown', className: 'badge-muted' };
    }
  };

  const { text, className } = getStatusStyles(status);

  return (
    <span className={`status-badge ${className}`}>
      {text}
    </span>
  );
}
