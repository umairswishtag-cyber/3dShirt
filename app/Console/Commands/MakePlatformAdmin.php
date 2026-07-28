<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class MakePlatformAdmin extends Command
{
    protected $signature = 'app:make-platform-admin
        {email : Email address used to sign in}
        {--name=Platform Super Admin : Name used when creating a new account}
        {--password= : Optional password; a strong random password is generated when omitted}';

    protected $description = 'Create or promote a platform administrator account';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $providedPassword = $this->option('password');
        $password = $providedPassword ?: Str::random(16).'aA1!';

        $validator = Validator::make([
            'email' => $email,
            'name' => $this->option('name'),
            'password' => $password,
        ], [
            'email' => ['required', 'email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', Password::min(12)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::query()->where('email', $email)->first();
        $created = ! $user;

        if ($created) {
            $user = new User([
                'name' => (string) $this->option('name'),
                'email' => $email,
                'password' => Hash::make($password),
            ]);
        } elseif ($providedPassword) {
            $user->password = Hash::make($password);
        }

        $user->is_platform_admin = true;
        $user->save();

        $this->info($created
            ? 'Platform administrator created.'
            : 'Existing user promoted to platform administrator.');
        $this->line("Email: {$user->email}");

        if ($created || $providedPassword) {
            $this->warn("Password: {$password}");
            $this->warn('Store this password securely; it will not be shown again.');
        } else {
            $this->line('Password: unchanged');
        }

        return self::SUCCESS;
    }
}
