<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Http\Requests\Finance\TransactionRequest;
use App\Http\Resources\Finance\TransactionResource;
use App\Services\FinanceService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    protected $financeService;

    public function __construct(FinanceService $financeService)
    {
        $this->financeService = $financeService;
    }

    public function index(Request $request)
    {
        try {
            $query = Transaction::with(['category', 'paymentMethod']);

            if ($request->filled('type')) {
                $query->where('type', $request->type);
            }
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }
            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }
            if ($request->filled('start_date') && $request->filled('end_date')) {
                $query->inDateRange($request->start_date, $request->end_date);
            }
            if ($request->filled('search')) {
                $query->where(function($q) use ($request) {
                    $q->where('notes', 'ilike', '%' . $request->search . '%')
                      ->orWhere('reference_no', 'ilike', '%' . $request->search . '%');
                });
            }

            $transactions = $query->latest()->paginate($request->get('per_page', 10));

            return TransactionResource::collection($transactions);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch transactions', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(TransactionRequest $request)
    {
        try {
            $data = $request->validated();
            $data['created_by'] = auth()->id() ?? 1; // Fallback for testing

            if ($request->hasFile('attachment')) {
                $data['attachment_path'] = $request->file('attachment')->store('finance/attachments', 'public');
            }

            $transaction = Transaction::create($data);

            // Auto-update budget spending
            if ($transaction->status === 'completed' && $transaction->type === 'expense') {
                $this->financeService->updateBudgetSpending($transaction);
            }

            return new TransactionResource($transaction->load(['category', 'paymentMethod']));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create transaction', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Transaction $transaction)
    {
        return new TransactionResource($transaction->load(['category', 'paymentMethod', 'creator']));
    }

    public function update(TransactionRequest $request, Transaction $transaction)
    {
        try {
            $data = $request->validated();

            if ($request->hasFile('attachment')) {
                $data['attachment_path'] = $request->file('attachment')->store('finance/attachments', 'public');
            }

            $transaction->update($data);

            return new TransactionResource($transaction->load(['category', 'paymentMethod']));
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update transaction', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Transaction $transaction)
    {
        try {
            $transaction->delete();
            return response()->json(['message' => 'Transaction deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete transaction', 'error' => $e->getMessage()], 500);
        }
    }

    public function summary(Request $request)
    {
        try {
            $startDate = $request->get('start_date');
            $endDate = $request->get('end_date');
            
            $summary = $this->financeService->getBalance(auth()->id(), $startDate, $endDate);
            
            return response()->json(['data' => $summary]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to generate summary', 'error' => $e->getMessage()], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $filters = $request->only(['type', 'status', 'category_id', 'start_date', 'end_date']);
            $format = $request->get('format', 'csv');
            
            return $this->financeService->exportTransactions($filters, $format);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Export failed', 'error' => $e->getMessage()], 500);
        }
    }
}
