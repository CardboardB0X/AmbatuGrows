<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class Customer
 * 
 * @property int $customer_id
 * @property string $first_name
 * @property string $last_name
 * @property string $email
 * @property string|null $phone
 */
class Customer extends Model
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
    protected $table = 'customer';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'customer_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
    ];

    /**
     * Get the sales orders placed by this customer.
     *
     * @return HasMany
     */
    public function salesOrders(): HasMany
    {
        return $this->hasMany(SalesOrder::class, 'customer_id', 'customer_id');
    }

    /**
     * Get the support tickets raised by this customer.
     *
     * @return HasMany
     */
    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class, 'customer_id', 'customer_id');
    }
}
