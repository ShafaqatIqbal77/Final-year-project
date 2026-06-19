import { createColumnHelper } from '@tanstack/react-table';
import { Invoice } from '../../types/finance.types';

const columnHelper = createColumnHelper<Invoice>();

export const invoiceColumns = [
  columnHelper.accessor('invoice_no', {
    header: 'Invoice#',
    cell: info => <span className="font-medium text-gray-800">{info.getValue()}</span>,
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('issue_date', {
    header: 'Issue Date',
    cell: info => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('due_date', {
    header: 'Due Date',
    cell: info => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('total', {
    header: 'Amount',
    cell: info => (
      <span className="font-semibold text-gray-800">
        ${info.getValue().toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const s = info.getValue();
      const colors = {
        paid: 'bg-green-100 text-green-700',
        sent: 'bg-blue-100 text-blue-700',
        draft: 'bg-gray-100 text-gray-700',
        overdue: 'bg-red-100 text-red-700',
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
      <div className="flex gap-2 text-sm">
        <button className="text-blue-600 hover:text-blue-800">Edit</button>
        <button className="text-gray-500 hover:text-gray-700">PDF</button>
      </div>
    )
  })
];
