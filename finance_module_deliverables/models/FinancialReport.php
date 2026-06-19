<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_type', 'period_start', 'period_end', 
        'generated_by', 'file_path', 'summary_data'
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'summary_data' => 'array',
    ];

    public function generator()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
