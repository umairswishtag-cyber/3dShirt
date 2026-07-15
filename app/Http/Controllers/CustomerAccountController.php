<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerAccountController extends Controller
{
    public function login(Request $request): Response
    {
        return Inertia::render('Customer/Auth/Login', [
            'intendedUrl' => $request->session()->get('url.intended', route('configurator')),
        ]);
    }

    public function register(Request $request): Response
    {
        return Inertia::render('Customer/Auth/Register', [
            'intendedUrl' => $request->session()->get('url.intended', route('configurator')),
        ]);
    }

    public function dashboard(): Response
    {
        return Inertia::render('Customer/Dashboard');
    }
}
