import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function LineChart({ data, title }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: "'Outfit', 'Plus Jakarta Sans', sans-serif",
            size: 12,
          },
          color: '#4B5563',
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
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: "'Outfit', 'Plus Jakarta Sans', sans-serif",
          },
          color: '#4B5563',
        }
      },
      y: {
        grid: {
          color: '#F3F4F6',
        },
        ticks: {
          font: {
            family: "'Outfit', 'Plus Jakarta Sans', sans-serif",
          },
          color: '#4B5563',
        }
      }
    }
  };

  return (
    <div className="chart-container-inner" style={{ position: 'relative', height: '300px', width: '100%' }}>
      <Line options={options} data={data} />
    </div>
  );
}
