<?php
namespace App\Http\Controllers;

use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class PasswordController extends Controller
{
    // Step 1: email a reset link. The answer is the same whether or not the email exists.
    public function forgot(Request $r)
    {
        $data = $r->validate(['email' => 'required|email']);
        $front = rtrim(config('services.paymongo.frontend_url'), '/');
        ResetPassword::createUrlUsing(fn ($user, string $token) =>
            $front . '/?token=' . $token . '&email=' . urlencode($user->getEmailForPasswordReset()) . '#reset');
        try {
            Password::sendResetLink(['email' => strtolower($data['email'])]);
        } catch (\Throwable $e) {
            report($e); // mail problems go to the log, not to the visitor
        }
        return ['message' => 'If that email is registered, we sent a password reset link. It expires in 60 minutes.'];
    }

    // Step 2: set a new password using the token from the emailed link.
    public function reset(Request $r)
    {
        $data = $r->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
        ]);
        $status = Password::reset(
            ['email' => strtolower($data['email']), 'password' => $data['password'],
             'password_confirmation' => $r->input('password_confirmation'), 'token' => $data['token']],
            function ($user, $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete(); // log the user out everywhere
                event(new PasswordReset($user));
            }
        );
        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'This reset link is invalid or has expired. Please request a new one.']);
        }
        return ['message' => 'Password updated. You can log in now.'];
    }
}
