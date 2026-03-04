'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface PublisherChartProps {
  data: { name: string; count: number }[];
}

export function PublisherChart({ data }: PublisherChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="w-full" style={{ height: `${Math.max(data.length * 36, 120)}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 12, fill: '#c0c8b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0d1410',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number | undefined) => [`${value ?? 0} issues`, 'Count']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.name === 'Other'
                  ? 'rgba(160,180,145,0.2)'
                  : 'rgba(160,180,145,0.4)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
