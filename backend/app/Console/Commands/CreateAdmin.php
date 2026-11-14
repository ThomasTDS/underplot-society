<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

use function Laravel\Prompts\password;
use function Laravel\Prompts\text;

/**
 * Creates the administrator, checking the password against the site's password
 * policy (Filament's make:filament-user accepts any password). Two-factor
 * authentication is set up at the first sign-in.
 */
class CreateAdmin extends Command
{
    protected $signature = 'admin:create';

    protected $description = 'Create an administrator for the admin panel';

    public function handle(): int
    {
        $name = text(label: 'Name', required: true, validate: fn (string $value) => $this->check('name', $value, ['string', 'max:255']));

        $email = text(label: 'Email address', required: true, validate: fn (string $value) => $this->check('email', $value, ['email', 'max:255', 'unique:users,email']));

        $password = password(
            label: 'Password',
            required: true,
            hint: 'At least 12 characters.',
            validate: fn (string $value) => $this->check('password', $value, [Password::defaults()]),
        );

        User::create(['name' => $name, 'email' => $email, 'password' => $password]);

        $this->components->info("Administrator {$email} created. Set up two-factor authentication at the first sign-in.");

        return self::SUCCESS;
    }

    /**
     * @param  array<int, mixed>  $rules
     */
    private function check(string $field, string $value, array $rules): ?string
    {
        $validator = Validator::make([$field => $value], [$field => ['required', ...$rules]]);

        return $validator->fails() ? $validator->errors()->first($field) : null;
    }
}
