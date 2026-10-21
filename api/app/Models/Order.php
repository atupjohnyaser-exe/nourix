<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = ['user_id', 'reference', 'checkout_session_id', 'description', 'amount', 'status', 'paid_at'];
    protected $casts = ['paid_at' => 'datetime'];
}
