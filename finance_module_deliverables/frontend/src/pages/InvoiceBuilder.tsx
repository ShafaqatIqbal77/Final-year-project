import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateInvoice } from '../hooks/useFinanceApi';

const invoiceSchema = z.object({
  client_name: z.string().min(1, 'Client Name is required'),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  issue_date: z.string().min(1, 'Issue Date is required'),
  due_date: z.string().min(1, 'Due Date is required'),
  items: z.array(z.object({
    desc: z.string().min(1, 'Description required'),
    qty: z.number().min(1),
    price: z.number().min(0)
  })).min(1, 'At least one item is required'),
  tax_rate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional()
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export const InvoiceBuilder: React.FC = () => {
  const createMutation = useCreateInvoice();

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      items: [{ desc: '', qty: 1, price: 0 }],
      tax_rate: 0,
      discount: 0
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchItems = watch('items');
  const watchTaxRate = watch('tax_rate') || 0;
  const watchDiscount = watch('discount') || 0;

  const subtotal = watchItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const taxAmount = (subtotal * watchTaxRate) / 100;
  const total = subtotal + taxAmount - watchDiscount;

  const onSubmit = (data: InvoiceForm) => {
    createMutation.mutate({ ...data, status: 'draft' }, {
      onSuccess: () => {
        alert('Invoice Draft Saved!');
      }
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6">
      
      {/* LEFT: FORM BUILDER */}
      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Invoice</h2>
        
        <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input {...register('client_name')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
              {errors.client_name && <p className="text-xs text-red-500 mt-1">{errors.client_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
              <input type="email" {...register('client_email')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input type="date" {...register('issue_date')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" {...register('due_date')} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3 border-b pb-2">Line Items</h3>
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input placeholder="Description" {...register(`items.${index}.desc`)} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
                    {errors.items?.[index]?.desc && <p className="text-xs text-red-500 mt-1">{errors.items[index]?.desc?.message}</p>}
                  </div>
                  <div className="w-24">
                    <input type="number" placeholder="Qty" {...register(`items.${index}.qty`, { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="w-32">
                    <input type="number" placeholder="Price" {...register(`items.${index}.price`, { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="w-32 py-2 text-right font-medium text-gray-700">
                    ${((watchItems[index]?.qty || 0) * (watchItems[index]?.price || 0)).toLocaleString()}
                  </div>
                  <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => append({ desc: '', qty: 1, price: 0 })} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
              + Add Line Item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Terms</label>
              <textarea {...register('notes')} rows={3} className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 outline-none resize-none" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-600 whitespace-nowrap">Tax (%)</span>
                <input type="number" {...register('tax_rate', { valueAsNumber: true })} className="w-24 text-right border border-gray-300 rounded-lg py-1 px-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-600 whitespace-nowrap">Discount ($)</span>
                <input type="number" {...register('discount', { valueAsNumber: true })} className="w-24 text-right border border-gray-300 rounded-lg py-1 px-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-xl font-bold text-blue-600">${total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* RIGHT: LIVE PREVIEW & ACTIONS */}
      <div className="w-full md:w-[400px] flex flex-col gap-4">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex-1 overflow-y-auto">
          <div className="bg-white p-6 shadow-sm min-h-full">
            <h1 className="text-3xl font-bold text-gray-200 mb-8 uppercase tracking-widest text-right">Invoice</h1>
            <div className="mb-8">
              <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">Billed To</p>
              <p className="text-lg font-bold text-gray-800">{watch('client_name') || 'Client Name'}</p>
              <p className="text-gray-600">{watch('client_email')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
              <div>
                <p className="text-gray-500 font-medium">Issue Date</p>
                <p className="text-gray-800">{watch('issue_date')}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Due Date</p>
                <p className="text-gray-800">{watch('due_date')}</p>
              </div>
            </div>
            
            <div className="mb-8 border-t border-b border-gray-100 py-4">
              {watchItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span className="text-gray-800">{item.qty}x {item.desc || 'Item'}</span>
                  <span className="font-medium text-gray-800">${(item.qty * item.price).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end text-sm">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax ({watchTaxRate}%)</span>
                    <span>${taxAmount.toLocaleString()}</span>
                  </div>
                )}
                {watchDiscount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span>-${watchDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-800 mt-2">
                  <span>Total</span>
                  <span>${total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <button 
            type="submit" 
            form="invoice-form"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Save Draft
          </button>
          <button 
            type="button"
            className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-colors"
          >
            Send to Client
          </button>
        </div>
      </div>
    </div>
  );
};
