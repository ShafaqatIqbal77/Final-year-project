import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DateRange {
  startDate: string | null;
  endDate: string | null;
  preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
}

interface FinanceState {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  
  isAddTransactionOpen: boolean;
  setAddTransactionOpen: (isOpen: boolean) => void;
  
  isBudgetModalOpen: boolean;
  setBudgetModalOpen: (isOpen: boolean) => void;
  
  selectedTransactionId: string | null;
  setSelectedTransactionId: (id: string | null) => void;

  // Invoice Builder State
  currentInvoiceDraft: any | null;
  setCurrentInvoiceDraft: (draft: any) => void;
  clearInvoiceDraft: () => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      dateRange: {
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        preset: 'thisMonth'
      },
      setDateRange: (range) => set({ dateRange: range }),

      isAddTransactionOpen: false,
      setAddTransactionOpen: (isOpen) => set({ isAddTransactionOpen: isOpen }),

      isBudgetModalOpen: false,
      setBudgetModalOpen: (isOpen) => set({ isBudgetModalOpen: isOpen }),

      selectedTransactionId: null,
      setSelectedTransactionId: (id) => set({ selectedTransactionId: id }),

      currentInvoiceDraft: null,
      setCurrentInvoiceDraft: (draft) => set({ currentInvoiceDraft: draft }),
      clearInvoiceDraft: () => set({ currentInvoiceDraft: null }),
    }),
    {
      name: 'finance-storage',
      partialize: (state) => ({ dateRange: state.dateRange, currentInvoiceDraft: state.currentInvoiceDraft }),
    }
  )
);
