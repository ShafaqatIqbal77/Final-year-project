<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Http\Requests\Finance\InvoiceRequest;
use App\Http\Resources\Finance\InvoiceResource;
use App\Services\FinanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InvoiceController extends Controller
{
    protected $financeService;

    public function __construct(FinanceService $financeService)
    {
        $this->financeService = $financeService;
    }

    public function index(Request $request)
    {
        try {
            $query = Invoice::query();
            
            if ($request->filled('status')) {
                $query->status($request->status);
            }
            if ($request->filled('search')) {
                $query->where('client_name', 'ilike', '%' . $request->search . '%')
                      ->orWhere('invoice_no', 'ilike', '%' . $request->search . '%');
            }

            $invoices = $query->latest('issue_date')->paginate($request->get('per_page', 10));

            return InvoiceResource::collection($invoices);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to fetch invoices', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(InvoiceRequest $request)
    {
        try {
            $data = $request->validated();
            $data['invoice_no'] = 'INV-' . date('Y') . '-' . strtoupper(Str::random(5));
            
            // Recalculate totals server-side to ensure accuracy
            $subtotal = 0;
            foreach($data['items'] as $item) {
                $subtotal += ($item['qty'] * $item['price']);
            }
            
            $data['subtotal'] = $subtotal;
            $data['tax_amount'] = ($subtotal * ($data['tax_rate'] ?? 0)) / 100;
            $data['total'] = $subtotal + $data['tax_amount'] - ($data['discount'] ?? 0);
            
            $data['created_by'] = auth()->id() ?? 1;

            $invoice = Invoice::create($data);

            return new InvoiceResource($invoice);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create invoice', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Invoice $invoice)
    {
        return new InvoiceResource($invoice);
    }

    public function update(InvoiceRequest $request, Invoice $invoice)
    {
        try {
            $data = $request->validated();
            
            $subtotal = 0;
            foreach($data['items'] as $item) {
                $subtotal += ($item['qty'] * $item['price']);
            }
            
            $data['subtotal'] = $subtotal;
            $data['tax_amount'] = ($subtotal * ($data['tax_rate'] ?? 0)) / 100;
            $data['total'] = $subtotal + $data['tax_amount'] - ($data['discount'] ?? 0);

            $invoice->update($data);

            return new InvoiceResource($invoice);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update invoice', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Invoice $invoice)
    {
        try {
            $invoice->delete();
            return response()->json(['message' => 'Invoice deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete invoice', 'error' => $e->getMessage()], 500);
        }
    }

    public function send(Invoice $invoice)
    {
        try {
            $invoice->update(['status' => 'sent']);
            // TODO: Fire InvoiceSentEvent or trigger Mailer
            return response()->json(['message' => 'Invoice sent to client']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send invoice', 'error' => $e->getMessage()], 500);
        }
    }

    public function markPaid(Invoice $invoice)
    {
        try {
            $invoice->update([
                'status' => 'paid',
                'payment_date' => now()
            ]);
            return new InvoiceResource($invoice);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to mark as paid', 'error' => $e->getMessage()], 500);
        }
    }

    public function pdf(Invoice $invoice)
    {
        try {
            $pdfContent = $this->financeService->generateInvoicePDF($invoice->id);
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $invoice->invoice_no . '.pdf"');
        } catch (\Exception $e) {
            return response()->json(['message' => 'PDF generation failed', 'error' => $e->getMessage()], 500);
        }
    }
}
