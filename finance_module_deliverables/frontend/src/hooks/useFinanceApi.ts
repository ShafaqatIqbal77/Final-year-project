import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { 
  Transaction, Invoice, Budget, FinanceSummary, 
  ProfitLossData, CashFlowData 
} from '../types/finance.types';

const api = axios.create({
  baseURL: '/api/v1/finance',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Configure auth token interceptor assuming it exists
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------------------------------------------------------------------
// TRANSACTIONS
// ------------------------------------------------------------------
export const useTransactions = (params?: any) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const { data } = await api.get('/transactions', { params });
      return data;
    }
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      // If there's an attachment, we need multipart/form-data
      if (payload.attachment instanceof File) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => formData.append(key, payload[key]));
        return await api.post('/transactions', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return await api.post('/transactions', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
    }
  });
};

// ------------------------------------------------------------------
// INVOICES
// ------------------------------------------------------------------
export const useInvoices = (params?: any) => {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const { data } = await api.get('/invoices', { params });
      return data;
    }
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => await api.post('/invoices', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
  });
};

// ------------------------------------------------------------------
// BUDGETS
// ------------------------------------------------------------------
export const useBudgets = (params?: any) => {
  return useQuery({
    queryKey: ['budgets', params],
    queryFn: async () => {
      const { data } = await api.get('/budgets', { params });
      return data;
    }
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => await api.post('/budgets', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] })
  });
};

// ------------------------------------------------------------------
// REPORTS & DASHBOARD
// ------------------------------------------------------------------
export const useFinanceSummary = (params: { start_date: string, end_date: string }) => {
  return useQuery({
    queryKey: ['financeSummary', params],
    queryFn: async () => {
      const { data } = await api.get('/transactions/summary', { params });
      return data.data as FinanceSummary;
    }
  });
};

export const useProfitLoss = (params: { start_date: string, end_date: string }) => {
  return useQuery({
    queryKey: ['profitLoss', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/profit-loss', { params });
      return data.data as ProfitLossData;
    }
  });
};

export const useCashFlow = (params: { year: number, month: number }) => {
  return useQuery({
    queryKey: ['cashFlow', params],
    queryFn: async () => {
      const { data } = await api.get('/reports/cashflow', { params });
      return data.data as CashFlowData[];
    }
  });
};
