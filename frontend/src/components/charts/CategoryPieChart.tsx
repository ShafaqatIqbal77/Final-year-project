import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategoryData {
  id: number | null;
  name: string;
  total: number;
  color: string;
}

interface Props {
  data: CategoryData[];
  title?: string;
}

export const CategoryPieChart: React.FC<Props> = ({ data, title = "Expenses by Category" }) => {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.total / total) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100">
          <p className="font-medium text-gray-800 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></span>
            {data.name}
          </p>
          <p className="text-gray-600 mt-1">Amount: <span className="font-semibold">${data.total.toLocaleString()}</span></p>
          <p className="text-gray-500 text-sm">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[350px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="total"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#9CA3AF'} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
