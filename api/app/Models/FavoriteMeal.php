<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FavoriteMeal extends Model
{
    protected $fillable = ['user_id', 'meal_id', 'name', 'thumb', 'area'];
}
