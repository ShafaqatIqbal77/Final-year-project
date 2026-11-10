import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CashFlowData } from '../../types/finance.types';

interface Props {
  data: CashFlowData[];
}

export const CashFlowChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[350px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Cash Flow (Running Balance)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(val) => {
              const d = new Date(val);
              return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
            }} 
          />
          <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
          />
          <Area 
            type="monotone" 
            dataKey="running_balance" 
            stroke="#3B82F6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
