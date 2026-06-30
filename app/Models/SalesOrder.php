<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class SalesOrder
 * 
 * @property int $order_id
 * @property int $customer_id
 * @property string|null $order_date
 * @property string $status
 * @property float $total_amount
 * @property float $tax_amount
 * @property float $discount_amount
 */
class SalesOrder extends Model
{
    /**
     * Disable Laravel automatic timestamps.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'sales_order';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'order_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'customer_id',
        'status',
        'total_amount',
        'tax_amount',
        'discount_amount',
    ];

    /**
     * Get the customer that placed this sales order.
     *
     * @return BelongsTo
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'customer_id');
    }

    /**
     * Get the order items associated with this sales order.
     *
     * @return HasMany
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id', 'order_id');
    }

    /**
     * Get the payments associated with this sales order.
     *
     * @return HasMany
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'order_id', 'order_id');
    }
}
