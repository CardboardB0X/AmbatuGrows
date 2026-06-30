<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Class SupportTicket
 * 
 * @property int $ticket_id
 * @property int $customer_id
 * @property int|null $agent_id
 * @property string $status
 * @property string $priority
 * @property string|null $sla_due_date
 */
class SupportTicket extends Model
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
    protected $table = 'support_ticket';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'ticket_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'customer_id',
        'agent_id',
        'status',
        'priority',
        'sla_due_date',
    ];

    /**
     * Get the customer that raised this support ticket.
     *
     * @return BelongsTo
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'customer_id');
    }

    /**
     * Get the support agent assigned to this support ticket.
     *
     * @return BelongsTo
     */
    public function supportAgent(): BelongsTo
    {
        return $this->belongsTo(SupportAgent::class, 'agent_id', 'agent_id');
    }

    /**
     * Get the interaction logs associated with this support ticket.
     *
     * @return HasMany
     */
    public function interactionLogs(): HasMany
    {
        return $this->hasMany(TicketInteractionLog::class, 'ticket_id', 'ticket_id');
    }
}
