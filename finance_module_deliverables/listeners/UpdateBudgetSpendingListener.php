<?php

namespace App\Listeners;

use App\Events\TransactionCreated;
use App\Services\FinanceService;

class UpdateBudgetSpendingListener
{
    protected $financeService;

    public function __construct(FinanceService $financeService)
    {
        $this->financeService = $financeService;
    }

    public function handle(TransactionCreated $event)
    {
        $this->financeService->updateBudgetSpending($event->transaction);
    }
}
