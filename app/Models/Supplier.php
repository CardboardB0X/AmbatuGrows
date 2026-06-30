<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Supplier
 * 
 * @property int $supplier_id
 * @property string $supplier_name
 * @property string|null $contact_info
 * @property float|null $performance_rating
 */
class Supplier extends Model
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
    protected $table = 'supplier';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'supplier_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'supplier_name',
        'contact_info',
        'performance_rating',
    ];

    /**
     * Get the purchase orders placed with this supplier.
     *
     * @return HasMany
     */
    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(PurchaseOrder::class, 'supplier_id', 'supplier_id');
    }
}
