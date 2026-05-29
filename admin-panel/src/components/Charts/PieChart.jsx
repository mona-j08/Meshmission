import React from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PieChart({ data, title }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            family: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            size: 11,
          },
          color: '#4B5563',
          boxWidth: 15,
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          family: "'Outfit', 'Plus Jakarta Sans', sans-serif",
          size: 16,
          weight: '600',
        },
        color: '#1F2937',
      },
    }
  };

  return (
    <div className="chart-container-inner" style={{ position: 'relative', height: '260px', width: '100%' }}>
      <Pie options={options} data={data} />
    </div>
  );
}
