<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Finance\TransactionController;
use App\Http\Controllers\Finance\InvoiceController;
use App\Http\Controllers\Finance\BudgetController;
use App\Http\Controllers\Finance\ReportController;

Route::middleware('auth:sanctum')->prefix('v1/finance')->group(function () {
    
    // Transactions
    Route::prefix('transactions')->group(function () {
        Route::get('/', [TransactionController::class, 'index']);
        Route::post('/', [TransactionController::class, 'store']);
        Route::get('/summary', [TransactionController::class, 'summary']);
        Route::get('/export', [TransactionController::class, 'export']);
        Route::get('/{transaction}', [TransactionController::class, 'show']);
        Route::put('/{transaction}', [TransactionController::class, 'update']);
        Route::delete('/{transaction}', [TransactionController::class, 'destroy']);
    });

    // Invoices
    Route::prefix('invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::post('/', [InvoiceController::class, 'store']);
        Route::get('/{invoice}', [InvoiceController::class, 'show']);
        Route::put('/{invoice}', [InvoiceController::class, 'update']);
        Route::delete('/{invoice}', [InvoiceController::class, 'destroy']);
        
        Route::post('/{invoice}/send', [InvoiceController::class, 'send']);
        Route::post('/{invoice}/mark-paid', [InvoiceController::class, 'markPaid']);
        Route::get('/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    });

    // Budgets
    Route::prefix('budgets')->group(function () {
        Route::get('/', [BudgetController::class, 'index']);
        Route::post('/', [BudgetController::class, 'store']);
        Route::get('/{budget}', [BudgetController::class, 'show']);
        Route::put('/{budget}', [BudgetController::class, 'update']);
        Route::delete('/{budget}', [BudgetController::class, 'destroy']);
        
        Route::get('/{budget}/status', [BudgetController::class, 'status']);
    });

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/profit-loss', [ReportController::class, 'profitLoss']);
        Route::get('/cashflow', [ReportController::class, 'cashflow']);
        Route::get('/by-category', [ReportController::class, 'byCategory']);
    });

});
