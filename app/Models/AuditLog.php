<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Class AuditLog
 * 
 * @property int $audit_id
 * @property string $timestamp
 * @property string $user_role
 * @property string $action
 * @property string $description
 * @property string|null $table_name
 * @property int|null $record_id
 */
class AuditLog extends Model
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
    protected $table = 'audit_log';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'audit_id';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_role',
        'action',
        'description',
        'table_name',
        'record_id',
    ];
}
