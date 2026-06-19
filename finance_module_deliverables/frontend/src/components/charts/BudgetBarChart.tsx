import React from 'react';
import { Budget } from '../../types/finance.types';

interface Props {
  budgets: Budget[];
}

export const BudgetBarChart: React.FC<Props> = ({ budgets }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[350px] overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget Utilization</h3>
      
      {budgets.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400">No active budgets</div>
      ) : (
        <div className="space-y-6">
          {budgets.map(budget => {
            const isOver = budget.spent_amount > budget.allocated_amount;
            const isWarning = !isOver && budget.utilization_pct >= budget.alert_threshold_pct;
            
            let barColor = 'bg-blue-500';
            if (isOver) barColor = 'bg-red-500';
            else if (isWarning) barColor = 'bg-orange-500';
            
            const fillWidth = Math.min(budget.utilization_pct, 100);

            return (
              <div key={budget.id} className="relative">
                <div className="flex justify-between items-end mb-1">
                  <span className="font-medium text-gray-800">{budget.name}</span>
                  <span className="text-sm font-semibold text-gray-600">
                    ${budget.spent_amount.toLocaleString()} / ${budget.allocated_amount.toLocaleString()}
                  </span>
                </div>
                
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div 
                    className={`${barColor} h-3 rounded-full transition-all duration-500`} 
                    style={{ width: `${fillWidth}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{budget.utilization_pct}% Used</span>
                  {isOver && <span className="text-red-500 font-medium">Over Budget!</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
