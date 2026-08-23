<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSingleSession
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $clientToken = $request->header('X-Session-Token');

            if ($user->active_session_token && $user->active_session_token !== $clientToken) {
                if ($user->hasRole('siswa')) {
                    // Revoke current Sanctum token to force logout
                    $request->user()->currentAccessToken()->delete();

                    return response()->json([
                        'message' => 'Sesi Anda telah aktif di perangkat lain. Anda telah dikeluarkan otomatis.',
                        'code' => 'SESSION_OVERWRITE'
                    ], 401);
                }
            }
        }

        return $next($request);
    }
}
