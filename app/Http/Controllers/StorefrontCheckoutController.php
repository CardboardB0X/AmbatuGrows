<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientStockException;
use App\Models\Customer;
use App\Models\InventoryLocation;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\StockTransaction;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class StorefrontCheckoutController extends Controller
{
    /**
     * Process storefront checkout by creating a sales order, decrementing stock,
     * and logging stock-out transactions under a secure database transaction.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function checkout(Request $request): JsonResponse
    {
        // 1. Validate the incoming request payload.
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer|exists:customers,customer_id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,product_id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $validated = $validator->validated();
        $customerId = $validated['customer_id'];
        $items = $validated['items'];
        $discountAmount = $validated['discount_amount'] ?? 0.00;
        $taxAmount = $validated['tax_amount'] ?? 0.00;

        // Group ordered items by product_id to correctly validate stock for orders 
        // that might contain duplicate line items for the same product.
        $requestedQuantities = [];
        foreach ($items as $item) {
            $prodId = $item['product_id'];
            if (!isset($requestedQuantities[$prodId])) {
                $requestedQuantities[$prodId] = 0;
            }
            $requestedQuantities[$prodId] += $item['quantity'];
        }

        // 2. Start a database transaction to ensure atomicity across all operations.
        DB::beginTransaction();

        try {
            // Lock the Customer record for reading/updating to ensure customer state consistency.
            $customer = Customer::where('customer_id', $customerId)->lockForUpdate()->firstOrFail();

            // 3. Inventory Check & Lock Phase (Pessimistic Locking to prevent race conditions).
            // We lock all inventory locations matching the ordered products upfront.
            $inventoryMatches = [];
            foreach ($requestedQuantities as $productId => $totalQtyRequested) {
                // Retrieve all inventory locations for this product and lock them for update.
                // We order by expiration_date (ascending) so that items nearing expiration are allocated first (FEFO).
                // Null expiration dates are sorted to the end.
                $locations = InventoryLocation::where('product_id', $productId)
                    ->orderByRaw('expiration_date IS NULL ASC')
                    ->orderBy('expiration_date', 'asc')
                    ->orderBy('inventory_id', 'asc')
                    ->lockForUpdate()
                    ->get();

                $totalAvailableQty = $locations->sum('quantity');

                // If total stock across all locations/warehouses is insufficient, abort early.
                if ($totalAvailableQty < $totalQtyRequested) {
                    $product = Product::find($productId);
                    $productName = $product ? $product->name : "ID: {$productId}";
                    throw new InsufficientStockException($productName, $totalQtyRequested, $totalAvailableQty);
                }

                // Cache locked locations for use during the decrement phase.
                $inventoryMatches[$productId] = $locations;
            }

            // 4. Calculate total amounts.
            $subtotal = 0.00;
            foreach ($items as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }
            $totalAmount = max(0.00, $subtotal + $taxAmount - $discountAmount);

            // 5. Create the SalesOrder record.
            $salesOrder = SalesOrder::create([
                'customer_id' => $customerId,
                'status' => 'pending', // Default status for checkout
                'total_amount' => $totalAmount,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
            ]);

            // 6. Process items: Decrement stock, create OrderItems, and log StockTransactions.
            foreach ($items as $item) {
                $productId = $item['product_id'];
                $qtyToDeduct = $item['quantity'];

                // Create OrderItem associated with the SalesOrder.
                OrderItem::create([
                    'order_id' => $salesOrder->order_id,
                    'product_id' => $productId,
                    'quantity' => $qtyToDeduct,
                    'unit_price' => $item['unit_price'],
                ]);

                // Log a single 'stock-out' stock transaction event for this product.
                StockTransaction::create([
                    'product_id' => $productId,
                    'transaction_type' => 'stock-out',
                    'quantity' => $qtyToDeduct,
                ]);

                // Decrement inventory sequentially from available locations (FIFO/FEFO).
                $locations = $inventoryMatches[$productId];
                foreach ($locations as $location) {
                    if ($qtyToDeduct <= 0) {
                        break;
                    }

                    if ($location->quantity > 0) {
                        if ($location->quantity >= $qtyToDeduct) {
                            // Current location has enough stock to cover all remaining requested quantity.
                            $location->quantity -= $qtyToDeduct;
                            $location->save();
                            $qtyToDeduct = 0;
                        } else {
                            // Current location has some stock, but not enough. Drain it and move to next location.
                            $qtyToDeduct -= $location->quantity;
                            $location->quantity = 0;
                            $location->save();
                        }
                    }
                }
            }

            // 7. Everything succeeded, commit the transaction.
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Order placed successfully',
                'data' => [
                    'order_id' => $salesOrder->order_id,
                    'total_amount' => $salesOrder->total_amount,
                    'status' => $salesOrder->status,
                    'items_count' => count($items),
                ]
            ], 210); // Standard HTTP 201 Created can be used, or 200. We will use 201.

        } catch (InsufficientStockException $e) {
            // Roll back all changes if any product lacks sufficient stock.
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Insufficient stock for one or more items',
                'error' => $e->getMessage(),
                'details' => [
                    'product' => $e->getProductIdentifier(),
                    'requested' => $e->getRequestedQuantity(),
                    'available' => $e->getAvailableQuantity()
                ]
            ], 400);

        } catch (Exception $e) {
            // General catch-all error handling. Roll back and return a generic error.
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while processing the checkout',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
