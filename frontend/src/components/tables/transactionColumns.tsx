import { createColumnHelper } from '@tanstack/react-table';
import { Transaction } from '../../types/finance.types';

const columnHelper = createColumnHelper<Transaction>();

export const transactionColumns = [
  columnHelper.accessor('created_at', {
    header: 'Date',
    cell: info => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('reference_no', {
    header: 'Reference',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('notes', {
    header: 'Description',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('category.name', {
    header: 'Category',
    cell: info => {
      const name = info.getValue();
      const row = info.row.original;
      return (
        <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium" style={{ color: row.category?.color || '#374151' }}>
          {name || 'Uncategorized'}
        </span>
      );
    },
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => (
      <span className="capitalize text-sm font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    cell: info => {
      const type = info.row.original.type;
      const amount = info.getValue().toLocaleString(undefined, { minimumFractionDigits: 2 });
      return (
        <span className={`font-semibold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
          {type === 'income' ? '+' : '-'}${amount}
        </span>
      );
    },
  }),
  columnHelper.accessor('payment_method.name', {
    header: 'Method',
    cell: info => info.getValue() || '-',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const s = info.getValue();
      const colors = {
        completed: 'bg-green-100 text-green-700',
        pending: 'bg-orange-100 text-orange-700',
        failed: 'bg-red-100 text-red-700',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[s] || 'bg-gray-100'}`}>
          {s}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: () => (
      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
    )
  })
];
