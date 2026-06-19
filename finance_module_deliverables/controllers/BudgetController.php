<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Http\Requests\Finance\BudgetRequest;
use App\Http\Resources\Finance\BudgetResource;
use App\Services\FinanceService;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    protected $financeService;

    public function __construct(FinanceService $financeService)
    {
        $this->financeService = $financeService;
    }

    public function index(Request $request)
    {
        try {
            $budgets = Budget::with('category')->latest()->paginate($request->get('per_page', 10));
            return BudgetResource::collection($budgets);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch budgets', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(BudgetRequest $request)
    {
        try {
            $budget = Budget::create($request->validated());
            return new BudgetResource($budget->load('category'));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create budget', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Budget $budget)
    {
        return new BudgetResource($budget->load('category'));
    }

    public function update(BudgetRequest $request, Budget $budget)
    {
        try {
            $budget->update($request->validated());
            return new BudgetResource($budget->load('category'));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update budget', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Budget $budget)
    {
        try {
            $budget->delete();
            return response()->json(['message' => 'Budget deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete budget', 'error' => $e->getMessage()], 500);
        }
    }

    public function status(Budget $budget)
    {
        try {
            $status = $this->financeService->getBudgetStatus($budget->id);
            return response()->json(['data' => $status]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to get budget status', 'error' => $e->getMessage()], 500);
        }
    }
}
