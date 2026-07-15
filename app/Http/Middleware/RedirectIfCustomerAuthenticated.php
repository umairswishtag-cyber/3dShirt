<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RedirectIfCustomerAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('customer')->check()) {
            return redirect()->route('customer.dashboard');
        }

        return $next($request);
    }
}
