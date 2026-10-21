<?php
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class MealAnalyzer
{
    const UNITS = ['g' => 1, 'kg' => 1000, 'ml' => 1, 'l' => 1000, 'cup' => 240, 'cups' => 240,
        'tbsp' => 15, 'tblsp' => 15, 'tsp' => 5, 'oz' => 28, 'lb' => 454, 'clove' => 5,
        'cloves' => 5, 'pinch' => 0.5, 'dash' => 0.5, 'slice' => 30, 'slices' => 30];

    const SWAPS = ['soy sauce' => 'low sodium soy sauce', 'brown sugar' => 'honey',
        'sugar' => 'honey', 'butter' => 'olive oil', 'white rice' => 'brown rice',
        'cream' => 'greek yogurt'];

    const SERVINGS = 4;

    public function meal(string $id): ?array
    {
        return Cache::remember("meal.$id", 86400, function () use ($id) {
            $m = Http::get('https://www.themealdb.com/api/json/v1/1/lookup.php', ['i' => $id])->json('meals.0');
            if (!$m) return null;
            $ings = [];
            for ($i = 1; $i <= 20; $i++) {
                $name = trim($m["strIngredient$i"] ?? '');
                if ($name !== '') $ings[] = ['name' => $name, 'measure' => trim($m["strMeasure$i"] ?? '')];
            }
            return ['id' => $m['idMeal'], 'name' => $m['strMeal'], 'thumb' => $m['strMealThumb'],
    'category' => $m['strCategory'], 'area' => $m['strArea'],
    'instructions' => $m['strInstructions'], 'youtube' => $m['strYoutube'],
    'ingredients' => $ings];
        });
    }

    // "2 cups", "1/2 tsp", "600g" -> [grams, unitWasKnown]. Unknown units are guessed at 100 g each.
    public function grams(string $measure): array
    {
        if (!preg_match('/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)?\s*([a-zA-Z]+)?/', $measure, $m)) return [100, false];
        $qty = 1;
        if (!empty($m[1])) {
            $qty = 0;
            foreach (preg_split('/\s+/', trim($m[1])) as $part) {
                if (str_contains($part, '/')) {
                    [$a, $b] = explode('/', $part);
                    $qty += (float) $a / max(1, (float) $b);
                } else $qty += (float) $part;
            }
        }
        $unit = strtolower($m[2] ?? '');
        return isset(self::UNITS[$unit]) ? [$qty * self::UNITS[$unit], true] : [$qty * 100, false];
    }

    // One Open Food Facts lookup per search term, cached so we stay inside their rate limits.
    public function product(string $term): array
    {
        return Cache::rememberForever('off.' . md5(strtolower($term)), function () use ($term) {
            $res = Http::withHeaders(['User-Agent' => 'HealthyScorePlanner/1.0 (destroroof@gmail.com)'])
                ->timeout(10)
                ->get('https://world.openfoodfacts.org/cgi/search.pl', [
                    'search_terms' => $term, 'search_simple' => 1, 'action' => 'process', 'json' => 1,
                    'page_size' => 8, 'fields' => 'product_name,nutriments,nutriscore_grade,nova_group',
                ])->json('products') ?? [];
            foreach ($res as $p) {
                if (isset($p['nutriments']['proteins_100g'], $p['nutriments']['energy-kcal_100g'])) return $p;
            }
            return [];
        });
    }

    private function aisle(string $n): string
    {
        $n = strtolower($n);
        foreach (['chicken', 'beef', 'pork', 'salmon', 'fish', 'egg', 'lamb', 'shrimp', 'prawn', 'tofu'] as $w)
            if (str_contains($n, $w)) return 'Protein';
        foreach (['broccoli', 'onion', 'garlic', 'tomato', 'carrot', 'pepper', 'spinach', 'potato', 'lemon', 'greens', 'ginger'] as $w)
            if (str_contains($n, $w)) return 'Produce';
        return 'Pantry';
    }

    public static function letter(int $s): string
    {
        return $s >= 85 ? 'A' : ($s >= 70 ? 'B' : ($s >= 55 ? 'C' : 'D'));
    }

    public function analyze(string $id, array $overrides = [], bool $withSwap = false): ?array
    {
        $meal = $this->meal($id);
        if (!$meal) return null;

        $t = ['protein' => 0, 'sodium' => 0, 'sugar' => 0, 'fiber' => 0, 'kcal' => 0];
        $nova = ['whole' => 0, 'processed' => 0, 'ultra' => 0];
        $rows = [];
        $known = 0;

        foreach ($meal['ingredients'] as $ing) {
            $term = $overrides[$ing['name']] ?? $ing['name'];
            $p = $this->product($term);
            [$g, $unitOk] = $this->grams($ing['measure']);
            $n = $p['nutriments'] ?? [];
            $k = $g / 100;

            // salt (g) to sodium (mg): x 400
            $sodium = isset($n['salt_100g']) ? $n['salt_100g'] * 400 * $k : ($n['sodium_100g'] ?? 0) * 1000 * $k;
            $t['protein'] += ($n['proteins_100g'] ?? 0) * $k;
            $t['sugar'] += ($n['sugars_100g'] ?? 0) * $k;
            $t['fiber'] += ($n['fiber_100g'] ?? 0) * $k;
            $t['kcal'] += ($n['energy-kcal_100g'] ?? 0) * $k;
            $t['sodium'] += $sodium;

            $group = (int) ($p['nova_group'] ?? 1);
            $nova[$group >= 4 ? 'ultra' : ($group == 3 ? 'processed' : 'whole')] += $g;

            $ns = strtolower($p['nutriscore_grade'] ?? '');
            $grade = in_array($ns, ['a', 'b']) ? 'A' : ($ns === 'c' ? 'B' : (in_array($ns, ['d', 'e']) ? 'C' : null));
            $weak = empty($p) || !str_contains(strtolower($p['product_name'] ?? ''), strtolower(explode(' ', $term)[0]));
            if (!$weak && $unitOk) $known++;

            $rows[] = ['name' => $ing['name'], 'measure' => $ing['measure'], 'grams' => round($g),
                'aisle' => $this->aisle($ing['name']), 'grade' => $grade, 'weak' => $weak,
                'matched' => $p['product_name'] ?? null, 'sodium' => $sodium];
        }

        $per = array_map(fn ($v) => round($v / self::SERVINGS), $t);
        $totalG = max(1, array_sum($nova));
        $pct = array_map(fn ($v) => round($v / $totalG * 100), $nova);

        $score = 100
            - min(40, max(0, ($per['sodium'] - 600) / 1000 * 25))
            - min(20, max(0, ($per['sugar'] - 10) * 1.5))
            - $pct['ultra'] * 0.3
            + min(10, $per['protein'] / 5)
            + min(8, $per['fiber']);
        $score = (int) max(0, min(100, round($score)));

        $tags = [];
        if ($per['protein'] >= 25) $tags[] = 'High protein';
        if ($per['sodium'] >= 1000) $tags[] = 'High sodium';
        if ($per['sugar'] >= 15) $tags[] = 'High sugar';
        if ($per['fiber'] >= 8) $tags[] = 'High fiber';

        $ratio = $known / max(1, count($rows));
        $out = ['id' => $meal['id'], 'name' => $meal['name'], 'thumb' => $meal['thumb'],
            'category' => $meal['category'] ?? null, 'area' => $meal['area'] ?? null,
            'instructions' => $meal['instructions'] ?? null, 'youtube' => $meal['youtube'] ?? null,
            'score' => $score, 'grade' => self::letter($score), 'tags' => $tags,
            'nutrition' => $per, 'processing' => $pct,
            'confidence' => $ratio > 0.7 ? 'high' : ($ratio > 0.4 ? 'medium' : 'low'),
            'ingredients' => array_map(fn ($r) => array_diff_key($r, ['sodium' => 1]), $rows),
            'swap' => null];

        if ($withSwap && $t['sodium'] > 0) {
            usort($rows, fn ($a, $b) => $b['sodium'] <=> $a['sodium']);
            $top = $rows[0];
            if ($top['sodium'] / $t['sodium'] > 0.4) {
                $term = self::SWAPS[strtolower($top['name'])] ?? 'low sodium ' . strtolower($top['name']);
                $after = $this->analyze($id, $overrides + [$top['name'] => $term]);
                if ($after && $after['score'] > $score) {
                    $out['swap'] = ['ingredient' => $top['name'], 'term' => $term,
                        'from' => $top['grade'], 'to' => collect($after['ingredients'])->firstWhere('name', $top['name'])['grade'] ?? null,
                        'meal_to' => $after['grade']];
                }
            }
        }
        return $out;
    }
}
