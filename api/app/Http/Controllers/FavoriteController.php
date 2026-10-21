<?php
namespace App\Http\Controllers;

use App\Models\FavoriteMeal;
use Illuminate\Http\Request;

// Saves are copied here so "People's choice" can count what users like most.
class FavoriteController extends Controller
{
    public function store(Request $r)
    {
        $d = $r->validate([
            'id' => 'required|string|max:20', 'name' => 'required|string|max:255',
            'thumb' => 'nullable|string|max:255', 'area' => 'nullable|string|max:60',
        ]);
        FavoriteMeal::updateOrCreate(
            ['user_id' => $r->user()->id, 'meal_id' => $d['id']],
            ['name' => strip_tags($d['name']), 'thumb' => $d['thumb'] ?? null, 'area' => $d['area'] ?? null]
        );
        return response()->json(['ok' => true], 201);
    }

    // Removes one or many (used by "Remove selected").
    public function destroy(Request $r)
    {
        $d = $r->validate(['ids' => 'required|array|max:500', 'ids.*' => 'string|max:20']);
        FavoriteMeal::where('user_id', $r->user()->id)->whereIn('meal_id', $d['ids'])->delete();
        return response()->noContent();
    }
}
