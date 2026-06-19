<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Budget extends Model
{
    use HasFactory, SoftDeletes, HasUuids;

    protected $fillable = [
        'name', 'category_id', 'period', 'start_date', 
        'end_date', 'allocated_amount', 'spent_amount', 'alert_threshold_pct'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'allocated_amount' => 'decimal:2',
        'spent_amount' => 'decimal:2',
        'alert_threshold_pct' => 'decimal:2',
    ];

    public function category()
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }

    public function getUtilizationPctAttribute()
    {
        if ($this->allocated_amount == 0) return 0;
        return round(($this->spent_amount / $this->allocated_amount) * 100, 2);
    }

    public function getIsOverBudgetAttribute()
    {
        return $this->spent_amount > $this->allocated_amount;
    }
}
