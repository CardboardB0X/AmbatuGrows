<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class ShipmentTracking
 * 
 * @property int $shipment_id
 * @property string $reference_type
 * @property int $reference_id
 * @property string $status
 * @property string|null $route_details
 */
class ShipmentTracking extends Model
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
    protected $table = 'shipment_tracking';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'shipment_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'reference_type',
        'reference_id',
        'status',
        'route_details',
    ];
}
