import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { transactionColumns } from './transactionColumns';
import { useTransactions } from '../../hooks/useFinanceApi';
// If rendering invoices, we would conditionally use useInvoices and invoiceColumns

interface Props {
  type?: 'income' | 'expense' | 'all';
  search?: string;
  dateRange?: any;
}

export const FinanceDataTable: React.FC<Props> = ({ type, search, dateRange }) => {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useTransactions({
    type: type !== 'all' ? type : undefined,
    search,
    start_date: dateRange?.startDate,
    end_date: dateRange?.endDate,
    page: pageIndex,
    per_page: pageSize,
  });

  const table = useReactTable({
    data: data?.data || [],
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.meta?.last_page || -1,
  });

  if (isLoading) {
    return (
      <div className="w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 animate-pulse mb-2 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!data?.data?.length) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-gray-500">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        <p>No records found.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 font-medium text-gray-600">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select 
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 outline-none"
          >
            {[10, 25, 50].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span>entries</span>
        </div>
        
        <div className="flex gap-1">
          <button 
            disabled={pageIndex === 1}
            onClick={() => setPageIndex(p => Math.max(1, p - 1))}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded font-medium">{pageIndex}</span>
          <button 
            disabled={pageIndex >= (data?.meta?.last_page || 1)}
            onClick={() => setPageIndex(p => p + 1)}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
