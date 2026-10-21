<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->string('contact_number', 20)->nullable());
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->uuid('reference')->unique();
            $t->string('checkout_session_id')->nullable();
            $t->string('description');
            $t->unsignedInteger('amount'); // centavos
            $t->string('status')->default('pending'); // pending, paid, failed, expired
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('orders');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('contact_number'));
    }
};
