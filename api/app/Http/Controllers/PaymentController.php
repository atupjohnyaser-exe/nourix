<?php
namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    const PRODUCT = 'NouriX Pro (1 month)';
    const PRICE = 14900; // PHP 149.00 in centavos

    private function pm()
    {
        $key = config('services.paymongo.secret');
        // Refuse to run with anything except a TEST key.
        abort_unless($key && str_starts_with($key, 'sk_test_'), 500, 'PayMongo TEST secret key (sk_test_...) is not set.');
        return Http::withBasicAuth($key, '')->acceptJson()->baseUrl('https://api.paymongo.com/v1');
    }

    // Creates a PayMongo Checkout Session and returns the hosted payment page URL.
    public function checkout(Request $r)
    {
        $order = Order::create(['user_id' => $r->user()->id, 'reference' => (string) Str::uuid(),
            'description' => self::PRODUCT, 'amount' => self::PRICE, 'status' => 'pending']);
        $front = rtrim(config('services.paymongo.frontend_url'), '/');

        $res = $this->pm()->post('/checkout_sessions', ['data' => ['attributes' => [
            'line_items' => [['currency' => 'PHP', 'amount' => self::PRICE, 'name' => self::PRODUCT, 'quantity' => 1]],
            'payment_method_types' => ['card'], // add 'gcash' here once your account supports it
            'description' => self::PRODUCT,
            'reference_number' => $order->reference,
            'success_url' => "$front/?ref={$order->reference}#billing",
            'cancel_url' => "$front/?ref={$order->reference}&cancelled=1#billing",
        ]]]);

        if ($res->failed()) {
            $order->update(['status' => 'failed']);
            return response()->json(['message' => 'Could not start checkout. Try again.'], 502);
        }
        $order->update(['checkout_session_id' => $res->json('data.id')]);
        return ['checkout_url' => $res->json('data.attributes.checkout_url'), 'reference' => $order->reference];
    }

    public function orders(Request $r)
    {
        return Order::where('user_id', $r->user()->id)->latest()->get();
    }

    // Status polling: asks PayMongo what happened to the session, then updates our order.
    public function show(Request $r, string $reference)
    {
        $o = Order::where('reference', $reference)->where('user_id', $r->user()->id)->firstOrFail();
        if (in_array($o->status, ['pending', 'failed']) && $o->checkout_session_id) {
            $res = $this->pm()->get("/checkout_sessions/{$o->checkout_session_id}");
            if ($res->successful()) {
                $st = collect($res->json('data.attributes.payments') ?? [])->pluck('attributes.status');
                if ($st->contains('paid')) $o->update(['status' => 'paid', 'paid_at' => now()]);
                elseif ($res->json('data.attributes.status') === 'expired') $o->update(['status' => 'expired']);
                elseif ($st->contains('failed')) $o->update(['status' => 'failed']);
            }
        }
        return $o;
    }

    // PayMongo calls this by itself after a payment. Needs a public URL (e.g. ngrok) while testing.
    public function webhook(Request $r)
    {
        $secret = (string) config('services.paymongo.webhook_secret');
        parse_str(str_replace(',', '&', (string) $r->header('Paymongo-Signature', '')), $p);
        $calc = hash_hmac('sha256', ($p['t'] ?? '') . '.' . $r->getContent(), $secret);
        abort_unless($secret !== '' && hash_equals($calc, (string) ($p['te'] ?? '')), 401);

        if ($r->json('data.attributes.type') === 'checkout_session.payment.paid') {
            $ref = $r->json('data.attributes.data.attributes.reference_number');
            Order::where('reference', $ref)->update(['status' => 'paid', 'paid_at' => now()]);
        }
        return response()->noContent();
    }
}
