<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'period' => $this->period,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'category' => $this->whenLoaded('category', function() {
                return [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                ];
            }),
            'allocated_amount' => (float) $this->allocated_amount,
            'spent_amount' => (float) $this->spent_amount,
            'remaining_amount' => (float) ($this->allocated_amount - $this->spent_amount),
            'utilization_pct' => $this->utilization_pct,
            'alert_threshold_pct' => (float) $this->alert_threshold_pct,
            'is_over_budget' => $this->is_over_budget,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
