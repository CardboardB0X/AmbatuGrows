<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class GoodsReceipt
 * 
 * @property int $receipt_id
 * @property int $po_id
 * @property string|null $receipt_date
 * @property string $three_way_match_status
 */
class GoodsReceipt extends Model
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
    protected $table = 'goods_receipt';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'receipt_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'po_id',
        'three_way_match_status',
    ];

    /**
     * Get the purchase order associated with this goods receipt.
     *
     * @return BelongsTo
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class, 'po_id', 'po_id');
    }
}
