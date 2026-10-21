<?php
namespace App\Http\Controllers;

use App\Services\MealAnalyzer;
use Illuminate\Http\Request;
use App\Models\FavoriteMeal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class MealController extends Controller
{
    public function search(Request $r)
    {
        $q = trim($r->query('q', ''));
        if ($q === '') return response()->json([]);
        $meals = Cache::remember('search.' . md5(strtolower($q)), 3600, fn () =>
            Http::get('https://www.themealdb.com/api/json/v1/1/search.php', ['s' => $q])->json('meals') ?? []);
        return collect($meals)->map(fn ($m) => [
            'id' => $m['idMeal'], 'name' => $m['strMeal'],
            'thumb' => $m['strMealThumb'], 'area' => $m['strArea'],
        ])->values();
    }

    // Full recipe details for the Recipe page: steps, tags, video, ingredients.
    public function show(string $id)
    {
        $m = Cache::remember("detail.$id", 86400, fn () =>
            Http::get('https://www.themealdb.com/api/json/v1/1/lookup.php', ['i' => $id])->json('meals.0'));
        abort_if(!$m, 404, 'Recipe not found.');

        $ings = [];
        for ($i = 1; $i <= 20; $i++) {
            $name = trim($m["strIngredient$i"] ?? '');
            if ($name !== '') $ings[] = ['name' => $name, 'measure' => trim($m["strMeasure$i"] ?? '')];
        }
        return response()->json([
            'id' => $m['idMeal'], 'name' => $m['strMeal'], 'thumb' => $m['strMealThumb'],
            'category' => $m['strCategory'] ?? null, 'area' => $m['strArea'] ?? null,
            'instructions' => $m['strInstructions'] ?? '',
            'youtube' => ($m['strYoutube'] ?? '') ?: null,
            'source' => ($m['strSource'] ?? '') ?: null,
            'tags' => array_values(array_filter(array_map('trim', explode(',', (string) ($m['strTags'] ?? ''))))),
            'ingredients' => $ings,
        ]);
    }

    private const THEMES = ['Chicken', 'Beef', 'Seafood', 'Vegetarian', 'Pasta', 'Pork', 'Lamb', 'Breakfast', 'Dessert', 'Side'];

    // TheMealDB returns id, name and photo for a category.
    private function byCategory(string $c): array
    {
        $key = "cat.$c";
        $rows = Cache::get($key);
        if (!$rows) {
            $rows = Http::get('https://www.themealdb.com/api/json/v1/1/filter.php', ['c' => $c])->json('meals') ?? [];
            if ($rows) Cache::put($key, $rows, 21600); // never cache an empty answer
        }
        return collect($rows)->map(fn ($m) => ['id' => $m['idMeal'], 'name' => $m['strMeal'], 'thumb' => $m['strMealThumb'], 'area' => null])->values()->all();
    }

    public function category(string $c)
    {
        abort_unless(in_array($c, self::THEMES, true), 404);
        return $this->byCategory($c);
    }

    // "This week's picks" rotates every Monday. "People's choice" is what NouriX users save most.
    public function suggestions()
    {
        $week = (int) now()->format('W');
        $theme = self::THEMES[$week % count(self::THEMES)];
        $weekly = $this->byCategory($theme);
        usort($weekly, fn ($a, $b) => crc32($week . $a['id']) <=> crc32($week . $b['id']));

        $saved = FavoriteMeal::select('meal_id', 'name', 'thumb', 'area', DB::raw('count(*) as saves'))
            ->groupBy('meal_id', 'name', 'thumb', 'area')->orderByDesc('saves')->limit(6)->get()
            ->map(fn ($m) => ['id' => $m->meal_id, 'name' => $m->name, 'thumb' => $m->thumb, 'area' => $m->area])->all();
        $popular = $saved;
        if (count($popular) < 6) { // not enough saves yet, so fill with classics
            $a = $this->byCategory('Chicken'); $b = $this->byCategory('Seafood');
            $have = array_column($popular, 'id');
            for ($i = 0; $i < 6 && count($popular) < 6; $i++) {
                foreach ([$a[$i] ?? null, $b[$i] ?? null] as $m) {
                    if ($m && count($popular) < 6 && !in_array($m['id'], $have)) { $popular[] = $m; $have[] = $m['id']; }
                }
            }
        }
        return ['weekly' => ['theme' => $theme, 'meals' => array_slice($weekly, 0, 6)],
                'popular' => ['meals' => $popular, 'from_users' => count($saved)]];
    }

    public function random()
    {
        $m = Http::get('https://www.themealdb.com/api/json/v1/1/random.php')->json('meals.0');
        abort_if(!$m, 502, 'Could not get a recipe right now.');
        return ['id' => $m['idMeal'], 'name' => $m['strMeal']];
    }

    // overrides = ingredient name => search term (used by "Fix this" and Smart swap)
    public function analysis(Request $r, string $id, MealAnalyzer $analyzer)
    {
        $overrides = (array) $r->query('overrides', []);
        // Smart Swap is a Pro feature, so only Pro users get the extra lookups.
        $isPro = \App\Models\Order::where('user_id', $r->user()->id)->where('status', 'paid')->exists();
        return response()->json($analyzer->analyze($id, $overrides, $isPro));
    }
}
