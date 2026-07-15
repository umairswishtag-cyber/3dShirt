<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateCustomer
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::guard('customer')->guest()) {
            $request->session()->put('url.intended', $request->fullUrl());

            return redirect()->route('customer.login');
        }

        return $next($request);
    }
}
