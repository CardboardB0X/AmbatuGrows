<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Product
 * 
 * @property int $product_id
 * @property string $sku
 * @property string $name
 * @property string|null $description
 * @property int|null $category_id
 * @property int $min_quantity_threshold
 */
class Product extends Model
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
    protected $table = 'product';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'product_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'sku',
        'name',
        'description',
        'category_id',
        'min_quantity_threshold',
        'max_quantity_threshold',
    ];

    /**
     * Get the category that this product belongs to.
     *
     * @return BelongsTo
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id', 'category_id');
    }

    /**
     * Get the inventory locations for this product.
     *
     * @return HasMany
     */
    public function inventoryLocations(): HasMany
    {
        return $this->hasMany(InventoryLocation::class, 'product_id', 'product_id');
    }

    /**
     * Get the stock transactions for this product.
     *
     * @return HasMany
     */
    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class, 'product_id', 'product_id');
    }

    /**
     * Get the order items representing sales of this product.
     *
     * @return HasMany
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'product_id', 'product_id');
    }

    /**
     * Get the purchase order items for this product.
     *
     * @return HasMany
     */
    public function poItems(): HasMany
    {
        return $this->hasMany(PoItem::class, 'product_id', 'product_id');
    }
}
