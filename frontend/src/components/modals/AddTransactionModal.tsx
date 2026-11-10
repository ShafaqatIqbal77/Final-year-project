import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTransaction } from '../../hooks/useFinanceApi';
import { useFinanceStore } from '../../store/useFinanceStore';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  category_id: z.string().min(1, 'Category is required'),
  payment_method_id: z.string().optional(),
  reference_no: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionForm = z.infer<typeof schema>;

export const AddTransactionModal: React.FC = () => {
  const { isAddTransactionOpen, setAddTransactionOpen } = useFinanceStore();
  const createMutation = useCreateTransaction();
  
  const [file, setFile] = useState<File | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TransactionForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
    }
  });

  const type = watch('type');

  const onSubmit = (data: TransactionForm) => {
    const payload: any = { ...data, status: 'completed' };
    if (file) payload.attachment = file;

    createMutation.mutate(payload, {
      onSuccess: () => {
        // Show success toast here
        setAddTransactionOpen(false);
      },
      onError: (err) => {
        // Show error toast here
        console.error(err);
      }
    });
  };

  if (!isAddTransactionOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Add Transaction</h2>
          <button onClick={() => setAddTransactionOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setValue('type', 'income')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'expense')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}
            >
              Expense
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PKR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rs</span>
                <input 
                  type="number" 
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className="pl-8 w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input 
                type="date" 
                {...register('date')}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select {...register('category_id')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select...</option>
                <option value="1">{type === 'income' ? 'Sales' : 'Software Subscriptions'}</option>
                {/* Populate from API */}
              </select>
              {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select {...register('payment_method_id')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select...</option>
                <option value="1">Meezan Bank</option>
                <option value="2">Stripe</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
            <textarea 
              {...register('notes')}
              rows={2}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Attachment</label>
            <input 
              type="file" 
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={() => setAddTransactionOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium shadow-sm transition-colors"
            >
              {createMutation.isPending ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
