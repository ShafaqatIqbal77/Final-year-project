<?php

namespace App\Http\Resources\Finance;

use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'category' => $this->whenLoaded('category', function() {
                return [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                    'color' => $this->category->color,
                ];
            }),
            'payment_method' => $this->whenLoaded('paymentMethod', function() {
                return [
                    'id' => $this->paymentMethod->id,
                    'name' => $this->paymentMethod->name,
                ];
            }),
            'reference_no' => $this->reference_no,
            'status' => $this->status,
            'notes' => $this->notes,
            'attachment_url' => $this->attachment_path ? asset('storage/' . $this->attachment_path) : null,
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
