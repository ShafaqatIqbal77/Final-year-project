<?php

namespace App\Http\Requests\Finance;

use Illuminate\Foundation\Http\FormRequest;

class TransactionRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'type' => 'required|in:income,expense',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|size:3',
            'category_id' => 'required|exists:expense_categories,id',
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'reference_no' => 'nullable|string|max:255',
            'status' => 'nullable|in:pending,completed,failed',
            'notes' => 'nullable|string',
            'attachment' => 'nullable|file|mimes:jpeg,png,pdf|max:5120',
        ];
    }
}
