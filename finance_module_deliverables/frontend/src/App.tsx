import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { InvoiceBuilder } from './pages/InvoiceBuilder';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { BudgetFormModal } from './components/modals/BudgetFormModal';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
          {/* Simple Nav */}
          <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <h1 className="text-xl font-bold text-blue-600">CMS Finance</h1>
              <div className="flex gap-4 font-medium text-sm text-gray-600">
                <a href="/finance" className="hover:text-blue-600 transition-colors">Dashboard</a>
                <a href="/finance/invoices/new" className="hover:text-blue-600 transition-colors">New Invoice</a>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="py-6">
            <Routes>
              <Route path="/" element={<Navigate to="/finance" replace />} />
              <Route path="/finance" element={<FinanceDashboard />} />
              <Route path="/finance/invoices/new" element={<InvoiceBuilder />} />
            </Routes>
          </main>

          {/* Global Modals */}
          <AddTransactionModal />
          <BudgetFormModal />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
