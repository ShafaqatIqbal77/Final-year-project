<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Services\FinanceService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    protected $financeService;

    public function __construct(FinanceService $financeService)
    {
        $this->financeService = $financeService;
    }

    public function profitLoss(Request $request)
    {
        try {
            $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
            $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

            $data = $this->financeService->getProfitLoss($startDate, $endDate);
            return response()->json(['data' => $data]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to generate P&L report', 'error' => $e->getMessage()], 500);
        }
    }

    public function cashflow(Request $request)
    {
        try {
            $year = $request->get('year', date('Y'));
            $month = $request->get('month', date('m'));

            $data = $this->financeService->getCashFlow($year, $month);
            return response()->json(['data' => $data]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to generate cashflow report', 'error' => $e->getMessage()], 500);
        }
    }

    public function byCategory(Request $request)
    {
        try {
            // Reusing getProfitLoss logic since it contains category split or can make a specialized service call
            $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
            $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

            $data = $this->financeService->getProfitLoss($startDate, $endDate);
            // Assuming getProfitLoss returns categories breakdown
            return response()->json(['data' => $data['categories'] ?? []]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to generate category report', 'error' => $e->getMessage()], 500);
        }
    }
}
