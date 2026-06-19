import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateBudget } from '../../hooks/useFinanceApi';
import { useFinanceStore } from '../../store/useFinanceStore';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category_id: z.string().min(1, 'Category is required'),
  period: z.enum(['monthly', 'quarterly', 'yearly']),
  start_date: z.string().min(1, 'Start Date is required'),
  end_date: z.string().min(1, 'End Date is required'),
  allocated_amount: z.number().min(1, 'Must allocate at least 1'),
  alert_threshold_pct: z.number().min(1).max(100),
});

type BudgetForm = z.infer<typeof schema>;

export const BudgetFormModal: React.FC = () => {
  const { isBudgetModalOpen, setBudgetModalOpen } = useFinanceStore();
  const createMutation = useCreateBudget();

  const { register, handleSubmit, formState: { errors } } = useForm<BudgetForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      period: 'monthly',
      alert_threshold_pct: 80
    }
  });

  const onSubmit = (data: BudgetForm) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setBudgetModalOpen(false);
      }
    });
  };

  if (!isBudgetModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Create Budget</h2>
          <button onClick={() => setBudgetModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name</label>
            <input {...register('name')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select {...register('category_id')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none">
                <option value="">Select...</option>
                <option value="1">Sales</option>
                <option value="2">Software</option>
              </select>
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select {...register('period')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" {...register('start_date')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" {...register('end_date')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocated Amount</label>
              <input type="number" {...register('allocated_amount', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Threshold (%)</label>
              <input type="number" {...register('alert_threshold_pct', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
            <button type="button" onClick={() => setBudgetModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium shadow-sm transition-colors">
              Save Budget
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
