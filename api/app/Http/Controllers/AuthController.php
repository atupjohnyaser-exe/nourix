<?php
namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function payload(User $u): array
    {
        return ['id' => $u->id, 'name' => $u->name, 'email' => $u->email,
            'contact_number' => $u->contact_number,
            'is_pro' => Order::where('user_id', $u->id)->where('status', 'paid')->exists()];
    }

    public function register(Request $r)
    {
        // Server-side validation. The client checks too, but we never trust it.
        $data = $r->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email:rfc', 'max:150', 'unique:users,email'], // blocks duplicates
            'contact_number' => ['required', 'regex:/^(09|\+639)\d{9}$/'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
        ], ['email.unique' => 'That email is already registered.',
            'contact_number.regex' => 'Use a PH mobile number like 09171234567.']);

        $user = User::create([
            'name' => strip_tags($data['name']),
            'email' => strtolower($data['email']),
            'contact_number' => $data['contact_number'],
            'password' => Hash::make($data['password']), // bcrypt, never plaintext
        ]);
        return response()->json(['token' => $user->createToken('web')->plainTextToken, 'user' => $this->payload($user)], 201);
    }

    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', strtolower($data['email']))->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Wrong email or password.']);
        }
        return ['token' => $user->createToken('web')->plainTextToken, 'user' => $this->payload($user)];
    }

    public function me(Request $r) { return $this->payload($r->user()); }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
        return response()->noContent();
    }
}
