<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Purchase extends Model
{
    protected $fillable = ['user_id', 'name', 'aisle', 'grams', 'price', 'bought_on'];
    protected $casts = ['bought_on' => 'date:Y-m-d', 'price' => 'float'];
}
