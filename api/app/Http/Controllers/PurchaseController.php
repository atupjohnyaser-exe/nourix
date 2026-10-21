<?php
namespace App\Http\Controllers;

use App\Models\Purchase;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    private const COLS = ['id', 'name', 'aisle', 'grams', 'price', 'bought_on'];

    // Recent purchases for the history list.
    public function index(Request $r)
    {
        return Purchase::where('user_id', $r->user()->id)
            ->orderByDesc('bought_on')->orderByDesc('id')->limit(30)->get(self::COLS);
    }

    // Called when the user ticks an item as bought.
    public function store(Request $r)
    {
        $d = $r->validate([
            'name' => 'required|string|max:100',
            'aisle' => 'required|in:Produce,Protein,Pantry',
            'grams' => 'required|integer|min:0|max:100000',
            'price' => 'required|numeric|min:0|max:1000000',
        ]);
        $p = Purchase::create([
            'user_id' => $r->user()->id, 'name' => strip_tags($d['name']), 'aisle' => $d['aisle'],
            'grams' => $d['grams'], 'price' => $d['price'], 'bought_on' => now()->toDateString(),
        ]);
        return response()->json($p->only(self::COLS), 201);
    }

    // Users can only delete their own purchases.
    public function destroy(Request $r, int $id)
    {
        Purchase::where('user_id', $r->user()->id)->where('id', $id)->firstOrFail()->delete();
        return response()->noContent();
    }

    // Totals for today, this week, this month, plus daily, weekly and monthly breakdowns.
    public function summary(Request $r)
    {
        $now = now();
        $rows = Purchase::where('user_id', $r->user()->id)
            ->where('bought_on', '>=', $now->copy()->startOfMonth()->subMonths(5)->toDateString())
            ->get(['price', 'bought_on']);
        $between = fn ($a, $b) => round($rows->filter(fn ($p) => $p->bought_on->between($a, $b))->sum('price'), 2);
        $day = fn ($d) => round($rows->filter(fn ($p) => $p->bought_on->isSameDay($d))->sum('price'), 2);

        $days = collect(range(6, 0))->map(fn ($i) => ['label' => $now->copy()->subDays($i)->format('D'), 'total' => $day($now->copy()->subDays($i))])->values();
        $weeks = collect(range(3, 0))->map(function ($i) use ($now, $between) {
            $s = $now->copy()->startOfWeek()->subWeeks($i);
            return ['label' => $s->format('M j'), 'total' => $between($s, $s->copy()->endOfWeek())];
        })->values();
        $months = collect(range(5, 0))->map(function ($i) use ($now, $between) {
            $s = $now->copy()->startOfMonth()->subMonths($i);
            return ['label' => $s->format('M'), 'total' => $between($s, $s->copy()->endOfMonth())];
        })->values();

        $week = $between($now->copy()->startOfWeek(), $now->copy()->endOfWeek());
        $month = $between($now->copy()->startOfMonth(), $now->copy()->endOfMonth());
        return [
            'today' => $day($now), 'week' => $week, 'month' => $month,
            'avg_day_week' => round($week / max(1, $now->dayOfWeekIso), 2),
            'avg_day_month' => round($month / max(1, $now->day), 2),
            'days' => $days, 'weeks' => $weeks, 'months' => $months,
        ];
    }
}
