# NouriX

NouriX is a meal planner that grades how healthy each dish is. You find a recipe, plan up to three meals a day, and get a health grade, nutrition numbers, a processing level and a grocery list. You can also track what you spend on groceries. Users register and log in, and can upgrade to a Pro plan through PayMongo (test mode).

**Stack:** React (Vite) frontend, Laravel 11 API, MySQL, Laravel Sanctum for login tokens, Chart.js for charts.

## External APIs and why we used them

| API | What it gives us | Where it shows up |
|---|---|---|
| TheMealDB | Recipes, photos, ingredients, cooking steps, video links, categories | Recipes page, recipe details, weekly picks, add-meal search |
| Open Food Facts | Nutrition per product, Nutri-Score, NOVA processing group | Health grades, nutrition bars, processing meter, Smart Swap, grocery grams |
| PayMongo | Payments | Pro page checkout |

Neither food API can do the grading alone. TheMealDB knows the recipe but has no nutrition data. Open Food Facts has nutrition data but no recipes. The app matches each ingredient of a recipe to a product and adds everything up.

The React app never calls these APIs directly. It only calls our Laravel API. That keeps the PayMongo secret key away from the browser, and Laravel caches every lookup so each ingredient and category is only requested once.

## Features
- **Intro page** for visitors, explaining what the app does.
- **Registration and login** with validation, hashed passwords and **forgot password**.
- **Recipes** with search, categories, a "Surprise me" button, **This week's picks** and **People's choice**.
- **Recipe details** with ingredients, numbered steps, video link and the best time of day for the dish.
- **Planner** with morning, lunch and dinner for each day. Each dish has its own grade, and each day has a day grade (the average of its meals).
- **Dashboard** with weekly grade, daily nutrition totals and charts (Pro).
- **Grocery and spending** with a merged shopping list, estimated prices (Pro), and totals for today, this week and this month, with daily, weekly and monthly charts.
- **Favorites** with select all and remove selected.
- **Pantry**, **dark and light mode**, and a layout that works on phones with a dropdown menu.
- **Free and Pro plans.**

## Setup

### Requirements
PHP 8.2+, Composer, Node 18+, MySQL.

### Backend (Laravel)
1. Create the project and install API support:
   ```
   composer create-project laravel/laravel api
   cd api
   php artisan install:api
   ```
2. Create a MySQL database, for example `nourix`.
3. Copy the files from the `backend` folder into the project (same paths):
   - Controllers: `AuthController`, `MealController`, `PasswordController`, `PaymentController`, `PurchaseController`, `FavoriteController`
   - Service: `app/Services/MealAnalyzer.php`
   - Models: `Order`, `Purchase`, `FavoriteMeal`
   - Migrations: orders and contact number, purchases, favorite meals
   - `routes/api.php`
4. In `app/Models/User.php`, add `HasApiTokens` and `'contact_number'` to the fillable list.
5. In `config/services.php`, add:
   ```php
   'paymongo' => [
       'secret' => env('PAYMONGO_SECRET_KEY'),
       'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
       'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
   ],
   ```
6. Set these in `.env`:
   ```
   APP_TIMEZONE=Asia/Manila
   DB_CONNECTION=mysql
   DB_DATABASE=nourix
   DB_USERNAME=root
   DB_PASSWORD=your_password
   FRONTEND_URL=http://localhost:5173
   PAYMONGO_SECRET_KEY=sk_test_xxxxxxxx
   PAYMONGO_WEBHOOK_SECRET=
   ```
7. Run:
   ```
   php artisan config:clear
   php artisan migrate
   php artisan serve
   ```

### Frontend (React)
```
npm install
npm install chart.js
npm run dev
```
Open `http://localhost:5173`. In development, Vite sends `/api` requests to Laravel on port 8000. For a deployed site, set `VITE_API_URL` to the API address and allow the site's address in Laravel's `config/cors.php`.

## API routes

| Route | Access | What it does |
|---|---|---|
| `POST /api/register`, `POST /api/login` | Public | Create an account, log in |
| `POST /api/forgot-password`, `POST /api/reset-password` | Public | Password reset |
| `GET /api/meals/search`, `/meals/{id}`, `/meals/suggestions`, `/meals/random`, `/meals/category/{c}` | Public | Recipes |
| `GET /api/meals/{id}/analysis` | Login | Health grade and nutrition |
| `GET /api/me`, `POST /api/logout` | Login | Current user, log out |
| `POST /api/checkout`, `GET /api/orders`, `GET /api/orders/{ref}` | Login | PayMongo checkout and order status |
| `GET/POST/DELETE /api/purchases`, `GET /api/purchases/summary` | Login | Spending tracker |
| `POST/DELETE /api/favorites` | Login | Saved recipes (used for People's choice) |
| `POST /api/paymongo/webhook` | PayMongo | Payment confirmation |

## Login and registration
- Registration asks for name, email, PH contact number and password. Everything is checked in the browser and again in Laravel.
- Passwords are hashed with bcrypt. Duplicate emails are rejected.
- Login, registration and password reset are rate limited.
- Sanctum gives the browser a token after login. Every page except Recipes and the intro page needs a login, and so does the nutrition endpoint.

## Password reset
1. On the login page, "Forgot password?" asks for an email.
2. Laravel sends a reset link. The answer is the same whether or not the email exists, so nobody can check which emails have accounts.
3. The link opens the reset page. It expires after 60 minutes and works once.
4. After a reset, all old login tokens are deleted.

By default `MAIL_MAILER=log`, so the email is not really sent. The link is written to `storage/logs/laravel.log`. To send real emails, put SMTP details (for example Mailtrap or Gmail) in `.env`.

## Spending tracker
On the Grocery page, ticking an item records a purchase for today (name, grams, price). Laravel stores it per user and returns totals for today, this week and this month, plus daily, weekly and monthly breakdowns. Prices are rough Philippine estimates, and users can edit them.

## Free and Pro
- **Free:** 1 meal a day, health grades and nutrition, recipes, favorites, pantry, grocery list and spending tracker (type your own prices), dashboard summary.
- **Pro (PHP 149):** 3 meals a day, Smart Swap, automatic grocery prices, dashboard charts and weekly alerts.

Pro stays on once an order is paid. It does not expire yet. The Free plan's 1-meal limit is checked in the React app, and Smart Swap is also checked in Laravel.

## PayMongo test payment flow
1. The user clicks **Pay with PayMongo** on the Pro page.
2. Laravel saves a pending order, then creates a PayMongo Checkout Session for PHP 149.00 and returns its URL.
3. The user pays on PayMongo's hosted page. Test card: `4343 4343 4343 4345`, any future expiry, any CVC.
4. PayMongo sends the user back to the app. The app asks Laravel for the order status, and Laravel asks PayMongo whether the session was paid, then updates the order (`paid`, `failed` or `expired`).
5. If the user cancels, the app shows "Payment was cancelled or declined" and nothing is marked as paid.
6. Optional webhook: `POST /api/paymongo/webhook` also marks orders as paid. It checks PayMongo's signature first. It needs a public URL such as ngrok, so for local testing we use the status check in step 4.

The server only accepts keys that start with `sk_test_`, so a live key can't be used by mistake.

## Security
- Secrets (database password, PayMongo keys) are only in `.env`, which is not committed. `.env.example` has placeholders.
- Passwords are hashed. Eloquent uses bound parameters, which protects against SQL injection. React escapes output, and names are stripped of HTML tags.
- Users can only read or delete their own purchases and orders.
- Set `APP_DEBUG=false` before deploying so visitors do not see error details.
- The login token is stored in localStorage to keep the project simple. A production app would use httpOnly cookies.

## Known limits
- Nutrition values are estimates. Amounts like "2 cups" or "a pinch" are converted to grams by guess, so each dish shows a confidence label and a "Fix this" button for wrong ingredient matches.
- Grocery prices are estimates, not live store prices.
- People's choice fills with classic dishes until enough users have saved recipes.
- Favorites are kept in the browser, and a copy goes to the server for counting.

## Environment variables
All secrets live in `.env` files that are ignored by Git. The repository only has `api/.env.example` and `sia_pt/.env.example`, with no real values.

| Variable | Where | What it is for |
|---|---|---|
| `APP_KEY` | Laravel | Encryption key. Make one with `php artisan key:generate` |
| `DB_*` or `DB_URL` | Laravel | Database connection (MySQL locally, PostgreSQL on Render) |
| `FRONTEND_URL` | Laravel | Website address, used for CORS and for the PayMongo and reset-password links |
| `PAYMONGO_SECRET_KEY` | Laravel | PayMongo test secret key (`sk_test_...`) |
| `PAYMONGO_WEBHOOK_SECRET` | Laravel | Optional, only for the webhook |
| `APP_TIMEZONE` | Laravel | Makes "today" in the spending tracker match local time |
| `VITE_API_URL` | React | API address when it is not on the same site (empty in development) |

TheMealDB and Open Food Facts need no API keys.

## Live deployment
- **Repository:** https://github.com/atupjohnyaser-exe/nourix
- **API (live):** https://nourix-api-zvj4.onrender.com (try `/api/meals/search?q=chicken`)
- **Website (live):** (add your Vercel address here)

The website runs on Vercel (root directory `sia_pt`, with `VITE_API_URL` set). The API runs on Render from `api/Dockerfile`, with a Render PostgreSQL database. On Render's free plan the API goes to sleep after 15 minutes without traffic, so the first request after a pause takes about a minute.

## Demo
The project is presented live: registration, the recipe and grading feature, and a full PayMongo test checkout (a cancelled payment first, then a successful one).

## Troubleshooting

**cURL error 60: SSL certificate problem.** PHP on Windows has no list of trusted certificates.
1. Download `https://curl.se/ca/cacert.pem` and save it, for example in `C:\php\extras\ssl\cacert.pem`.
2. Run `php --ini` and open the file shown as "Loaded Configuration File".
3. Add these lines (or remove the `;` in front of them):
   ```
   curl.cainfo = "C:\php\extras\ssl\cacert.pem"
   openssl.cafile = "C:\php\extras\ssl\cacert.pem"
   ```
4. Restart `php artisan serve`.

**Access denied for user 'root'.** The `DB_PASSWORD` in `.env` does not match your MySQL password. Fix it and run `php artisan config:clear`.

**Could not find driver.** Turn on `extension=pdo_mysql` in `php.ini`.

**ECONNREFUSED 127.0.0.1:8000 in the React terminal.** The Laravel server is not running. Start it with `php artisan serve`.

**Pay button shows an error.** Check that `PAYMONGO_SECRET_KEY` is a test key (`sk_test_...`), then run `php artisan config:clear` and restart the server.

**Reset email never arrives.** With the default `MAIL_MAILER=log`, open `storage/logs/laravel.log` and use the newest link at the bottom.
