<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Invoice;
use App\Models\Budget;
use App\Models\ExpenseCategory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Events\BudgetThresholdReached;
use Barryvdh\DomPDF\Facade\Pdf; // Or Snappy

class FinanceService
{
    public function getBalance($userId = null, $startDate = null, $endDate = null)
    {
        $cacheKey = "finance_balance_{$userId}_{$startDate}_{$endDate}";
        
        return Cache::remember($cacheKey, 600, function () use ($userId, $startDate, $endDate) {
            $query = Transaction::completed();
            
            if ($userId) $query->where('created_by', $userId);
            if ($startDate && $endDate) $query->inDateRange($startDate, $endDate);

            $income = (clone $query)->income()->sum('amount');
            $expense = (clone $query)->expense()->sum('amount');

            return [
                'total_income' => $income,
                'total_expense' => $expense,
                'net_balance' => $income - $expense,
            ];
        });
    }

    public function getProfitLoss($startDate, $endDate)
    {
        return Cache::remember("finance_pl_{$startDate}_{$endDate}", 600, function () use ($startDate, $endDate) {
            $transactions = Transaction::with('category')
                ->completed()
                ->inDateRange($startDate, $endDate)
                ->get();

            $income = $transactions->where('type', 'income')->sum('amount');
            $expense = $transactions->where('type', 'expense')->sum('amount');

            $categories = $transactions->groupBy('category_id')->map(function ($group) {
                $category = $group->first()->category;
                $total = $group->sum('amount');
                return [
                    'id' => $category ? $category->id : null,
                    'name' => $category ? $category->name : 'Uncategorized',
                    'type' => $category ? $category->type : $group->first()->type,
                    'color' => $category ? $category->color : '#9ca3af',
                    'total' => $total
                ];
            })->values();

            return [
                'summary' => [
                    'income' => $income,
                    'expense' => $expense,
                    'net' => $income - $expense
                ],
                'categories' => $categories
            ];
        });
    }

    public function getCashFlow($year, $month)
    {
        $cacheKey = "finance_cashflow_{$year}_{$month}";

        return Cache::remember($cacheKey, 600, function () use ($year, $month) {
            $transactions = Transaction::completed()
                ->whereYear('created_at', $year)
                ->whereMonth('created_at', $month)
                ->orderBy('created_at')
                ->get();

            $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
            $dailyFlow = [];
            
            // Get opening balance up to start of this month
            $openingBalance = Transaction::completed()
                ->where('created_at', '<', "$year-$month-01 00:00:00")
                ->selectRaw("SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as balance")
                ->value('balance') ?? 0;

            $runningBalance = $openingBalance;

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $dateStr = sprintf("%04d-%02d-%02d", $year, $month, $d);
                $dayTransactions = $transactions->filter(function($t) use ($dateStr) {
                    return $t->created_at->format('Y-m-d') === $dateStr;
                });

                $income = $dayTransactions->where('type', 'income')->sum('amount');
                $expense = $dayTransactions->where('type', 'expense')->sum('amount');
                
                $runningBalance += ($income - $expense);

                $dailyFlow[] = [
                    'date' => $dateStr,
                    'income' => $income,
                    'expense' => $expense,
                    'running_balance' => $runningBalance
                ];
            }

            return $dailyFlow;
        });
    }

    public function getBudgetStatus($budgetId)
    {
        $budget = Budget::findOrFail($budgetId);
        
        $forecastSpent = 0; // simplistic forecast: current spend / days passed * total days
        $daysTotal = now()->parse($budget->start_date)->diffInDays($budget->end_date) ?: 1;
        $daysPassed = now()->parse($budget->start_date)->diffInDays(now()) ?: 1;
        
        if ($daysPassed > 0 && $daysPassed <= $daysTotal) {
            $forecastSpent = ($budget->spent_amount / $daysPassed) * $daysTotal;
        }

        return [
            'allocated' => $budget->allocated_amount,
            'spent' => $budget->spent_amount,
            'remaining' => $budget->allocated_amount - $budget->spent_amount,
            'utilization_pct' => $budget->utilization_pct,
            'is_over_budget' => $budget->is_over_budget,
            'forecast_spent' => round($forecastSpent, 2),
            'forecast_overspend' => $forecastSpent > $budget->allocated_amount
        ];
    }

    public function detectAnomalies($userId)
    {
        // simplistic anomaly detection: > 3x category average
        $averages = Transaction::expense()
            ->where('created_by', $userId)
            ->where('created_at', '>=', now()->subMonths(3))
            ->select('category_id', DB::raw('AVG(amount) as avg_amount'))
            ->groupBy('category_id')
            ->get()->keyBy('category_id');

        $recentTransactions = Transaction::expense()
            ->where('created_by', $userId)
            ->where('created_at', '>=', now()->subDays(7))
            ->get();

        $anomalies = [];
        foreach ($recentTransactions as $tx) {
            $avg = $averages[$tx->category_id]->avg_amount ?? null;
            if ($avg && $tx->amount > ($avg * 3)) {
                $anomalies[] = [
                    'transaction_id' => $tx->id,
                    'amount' => $tx->amount,
                    'category_average' => $avg,
                    'reason' => 'Amount exceeds 3x the category average'
                ];
            }
        }
        
        return $anomalies;
    }

    public function applyTax($amount, $taxConfig)
    {
        $taxAmount = 0;
        if (isset($taxConfig['type']) && $taxConfig['type'] === 'percentage') {
            $taxAmount = ($amount * $taxConfig['rate']) / 100;
        } elseif (isset($taxConfig['type']) && $taxConfig['type'] === 'fixed') {
            $taxAmount = $taxConfig['amount'];
        }
        
        return [
            'subtotal' => $amount,
            'tax' => $taxAmount,
            'total' => $amount + $taxAmount
        ];
    }

    public function generateInvoicePDF($invoiceId)
    {
        $invoice = Invoice::findOrFail($invoiceId);
        
        // Ensure you have barryvdh/laravel-dompdf installed
        $pdf = Pdf::loadView('finance.invoice', ['invoice' => $invoice]);
        return $pdf->output();
    }

    public function exportTransactions($filters, $format)
    {
        // For simplicity, returning a mock response. In a real app, use Maatwebsite/Laravel-Excel
        // return Excel::download(new TransactionsExport($filters), 'transactions.'.$format);
        
        // Mocked CSV generation
        $transactions = Transaction::with(['category', 'paymentMethod'])->get();
        $csv = "ID,Type,Amount,Category,Payment Method,Status,Date\n";
        foreach ($transactions as $t) {
            $cat = $t->category ? $t->category->name : 'N/A';
            $pm = $t->paymentMethod ? $t->paymentMethod->name : 'N/A';
            $csv .= "{$t->id},{$t->type},{$t->amount},{$cat},{$pm},{$t->status},{$t->created_at}\n";
        }
        
        return response($csv)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="transactions.csv"');
    }

    public function scheduleRecurringTransactions()
    {
        // Typically called by a console command scheduled daily
        // Find active recurring templates and create transactions
    }

    public function updateBudgetSpending(Transaction $transaction)
    {
        if ($transaction->type !== 'expense' || !$transaction->category_id) return;

        $budgets = Budget::where('category_id', $transaction->category_id)
            ->where('start_date', '<=', $transaction->created_at)
            ->where('end_date', '>=', $transaction->created_at)
            ->get();

        foreach ($budgets as $budget) {
            $budget->spent_amount += $transaction->amount;
            $budget->save();

            if ($budget->utilization_pct >= $budget->alert_threshold_pct) {
                event(new BudgetThresholdReached($budget));
            }
        }
    }
}
