<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class PurchaseOrder
 * 
 * @property int $po_id
 * @property int|null $requisition_id
 * @property int $supplier_id
 * @property string $status
 * @property string|null $order_date
 */
class PurchaseOrder extends Model
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
    protected $table = 'purchase_order';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'po_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'requisition_id',
        'supplier_id',
        'status',
    ];

    /**
     * Get the supplier for this purchase order.
     *
     * @return BelongsTo
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'supplier_id');
    }

    /**
     * Get the items in this purchase order.
     *
     * @return HasMany
     */
    public function poItems(): HasMany
    {
        return $this->hasMany(PoItem::class, 'po_id', 'po_id');
    }

    /**
     * Get the goods receipts for this purchase order.
     *
     * @return HasMany
     */
    public function goodsReceipts(): HasMany
    {
        return $this->hasMany(GoodsReceipt::class, 'po_id', 'po_id');
    }
}
