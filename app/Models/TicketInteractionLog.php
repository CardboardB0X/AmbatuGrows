<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Class TicketInteractionLog
 * 
 * @property int $log_id
 * @property int $ticket_id
 * @property string $interaction_type
 * @property string $message_body
 * @property string|null $timestamp
 */
class TicketInteractionLog extends Model
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
    protected $table = 'ticket_interaction_log';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'log_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'ticket_id',
        'interaction_type',
        'message_body',
    ];

    /**
     * Get the support ticket associated with this interaction log.
     *
     * @return BelongsTo
     */
    public function supportTicket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id', 'ticket_id');
    }
}
