<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('favorite_meals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->string('meal_id', 20);
            $t->string('name');
            $t->string('thumb')->nullable();
            $t->string('area', 60)->nullable();
            $t->timestamps();
            $t->unique(['user_id', 'meal_id']);
            $t->index('meal_id');
        });
    }
    public function down(): void { Schema::dropIfExists('favorite_meals'); }
};
