<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Platform administrators
    |--------------------------------------------------------------------------
    |
    | Database administrators are marked with users.is_platform_admin. This
    | optional comma-separated list makes the first administrator easy to
    | bootstrap without changing application code.
    |
    */
    'platform_admin_emails' => array_values(array_filter(array_map(
        fn (string $email) => strtolower(trim($email)),
        explode(',', (string) env('CHATBOT_PLATFORM_ADMIN_EMAILS', '')),
    ))),
];
