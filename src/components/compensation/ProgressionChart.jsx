import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProgressionChart = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const rankData = [
    { name: 'Hero', volume: 0, rebate: 6 },
    { name: 'Expert', volume: 10000, rebate: 9 },
    { name: 'Specialist', volume: 20000, rebate: 12 },
    { name: 'Ambassador', volume: 50000, rebate: 15 },
    { name: 'Royal Ambassador', volume: 70000, rebate: 18 },
    { name: 'Imperial', volume: 100000, rebate: 20 }
  ];

  useEffect(() => {
    const initChart = () => {
      if (typeof window !== 'undefined' && window.Chart && chartRef.current) {
        // Destroy existing chart if it exists
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        
        chartInstanceRef.current = new window.Chart(ctx, {
          type: 'bar',
          data: {
            labels: rankData.map(r => r.name),
            datasets: [
              {
                label: 'Rebate per Lot ($)',
                data: rankData.map(r => r.rebate),
                backgroundColor: 'rgba(16, 185, 129, 0.85)', // Green bars
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2,
                borderRadius: 5,
                yAxisID: 'yRebates',
              },
              {
                label: 'Monthly Volume ($)',
                data: rankData.map(r => r.volume),
                backgroundColor: 'rgba(192, 154, 88, 0.85)', // Gold bars
                borderColor: 'rgb(192, 154, 88)',
                borderWidth: 2,
                borderRadius: 5,
                yAxisID: 'yVolume',
              }
            ]
          },
          options: {
            animation: { duration: 1500, easing: 'easeOutQuart' },
            maintainAspectRatio: false,
            responsive: true,
            interaction: {
              mode: 'index',
              intersect: false,
            },
            plugins: {
              legend: { 
                position: 'top',
                labels: {
                  color: '#f9fafb',
                  font: { weight: 'bold' }
                }
              },
              tooltip: { 
                backgroundColor: '#1f293b',
                titleColor: '#f9fafb',
                bodyColor: '#f9fafb',
                titleFont: { size: 16, weight: 'bold' },
                bodyFont: { size: 14 },
                padding: 12,
                cornerRadius: 6,
                borderColor: '#374151',
                borderWidth: 1
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { 
                  color: '#9ca3af', 
                  font: { weight: '600' } 
                }
              },
              yRebates: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                grid: { color: '#374151' },
                ticks: { 
                  color: '#10b981', 
                  font: { weight: 'bold' },
                  callback: value => '$' + value
                },
                title: {
                  display: true,
                  text: 'Rebate per Lot ($)',
                  color: '#10b981',
                  font: { size: 14, weight: 'bold' }
                }
              },
              yVolume: {
                type: 'linear',
                position: 'right',
                beginAtZero: true,
                grid: { drawOnChartArea: false },
                ticks: { 
                  color: '#c09a58', 
                  font: { weight: 'bold' },
                  callback: value => value > 0 ? '$' + (value / 1000) + 'K' : '$0'
                },
                title: {
                  display: true,
                  text: 'Monthly Volume ($)',
                  color: '#c09a58',
                  font: { size: 14, weight: 'bold' }
                }
              }
            }
          }
        });
      }
    };

    // Load Chart.js dynamically
    if (typeof window !== 'undefined' && !window.Chart) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = initChart;
      document.head.appendChild(script);
    } else if (window.Chart) {
      initChart();
    }

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <Card className="glass-effect border-default">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          <span className="gold-text-gradient">The IB Progression Path</span>
        </CardTitle>
        <p className="text-secondary text-center max-w-3xl mx-auto">
          This chart is the core of your rebate compensation plan. It directly compares the monthly volume required (gold bars) with the rebate per lot you'll earn (green bars) at each rank.
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96">
          <canvas ref={chartRef}></canvas>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressionChart;