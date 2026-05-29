import React from 'react';

export default function CapacityBar({ current = 0, max = 100 }) {
  const curNum = Number(current) || 0;
  const maxNum = Number(max) || 100;
  const percentage = Math.min(100, Math.max(0, Math.round((curNum / maxNum) * 100)));

  const getColorClass = (pct) => {
    if (pct < 60) return 'capacity-green';
    if (pct <= 85) return 'capacity-yellow';
    return 'capacity-red';
  };

  return (
    <div className="capacity-container">
      <div className="capacity-text">
        <span className="capacity-numbers">{curNum} / {maxNum} items</span>
        <span className="capacity-percentage">{percentage}%</span>
      </div>
      <div className="capacity-bar-bg">
        <div 
          className={`capacity-bar-fill ${getColorClass(percentage)}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
