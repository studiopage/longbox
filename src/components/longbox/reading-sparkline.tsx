'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface ReadingSparklineProps {
  data: { week: string; count: number }[];
}

export function ReadingSparkline({ data }: ReadingSparklineProps) {
  if (data.length === 0) return null;

  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgba(160,180,145,0.5)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="rgba(160,180,145,0.5)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" hide />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0d1410',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            labelFormatter={(label) => {
              const d = new Date(label);
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            formatter={(value: number | undefined) => [`${value ?? 0} books`, 'Completed']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="rgba(160,180,145,0.5)"
            fill="url(#sparkGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
