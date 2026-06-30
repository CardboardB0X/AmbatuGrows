<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class PurchaseRequisition
 * 
 * @property int $requisition_id
 * @property string $requesting_department
 * @property string $status
 */
class PurchaseRequisition extends Model
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
    protected $table = 'purchase_requisition';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'requisition_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'requesting_department',
        'status',
    ];

    /**
     * Get the purchase orders associated with this purchase requisition.
     *
     * @return HasMany
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'requisition_id', 'requisition_id');
    }
}
