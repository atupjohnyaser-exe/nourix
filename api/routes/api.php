<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\MealController;
use App\Http\Controllers\PasswordController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PurchaseController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:5,1');
Route::post('/paymongo/webhook', [PaymentController::class, 'webhook']);
Route::get('/meals/search', [MealController::class, 'search']); // public
Route::get('/meals/suggestions', [MealController::class, 'suggestions']); // public
Route::get('/meals/random', [MealController::class, 'random']); // public
Route::get('/meals/category/{c}', [MealController::class, 'category']); // public
Route::get('/meals/{id}', [MealController::class, 'show'])->whereNumber('id'); // public: recipe details

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/meals/{id}/analysis', [MealController::class, 'analysis']); // protected
    Route::post('/checkout', [PaymentController::class, 'checkout']);
    Route::get('/orders', [PaymentController::class, 'orders']);
    Route::get('/orders/{reference}', [PaymentController::class, 'show']);
    Route::post('/favorites', [FavoriteController::class, 'store']);
    Route::delete('/favorites', [FavoriteController::class, 'destroy']);
    Route::get('/purchases', [PurchaseController::class, 'index']);
    Route::get('/purchases/summary', [PurchaseController::class, 'summary']);
    Route::post('/purchases', [PurchaseController::class, 'store']);
    Route::delete('/purchases/{id}', [PurchaseController::class, 'destroy'])->whereNumber('id');
});
