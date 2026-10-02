<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyPaystackSignature
{
    public function handle(Request $request, Closure $next): Response
    {
        $signature = $request->header('x-paystack-signature');
        $secret = config('hookledger.paystack.secret_key');

        if (!$signature || !$secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $computed = hash_hmac('sha512', $request->getContent(), $secret);

        if (!hash_equals($computed, $signature)) {
            return response()->json(['message' => 'Invalid signature'], 401);
        }

        return $next($request);
    }
}
