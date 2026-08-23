<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        // Attempt to find user by email or username (NISN)
        $user = User::where('email', $request->login)
            ->orWhere('username', $request->login)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Kredensial yang Anda masukkan salah.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Akun Anda dinonaktifkan. Silakan hubungi admin.',
            ], 403);
        }

        // Generate a new session lock token
        $sessionToken = Str::random(40);

        // Update database with new session token and last login
        $user->update([
            'active_session_token' => $sessionToken,
            'last_login_at' => now(),
        ]);

        // Revoke all previous tokens for this user (Single Session Lock)
        $user->tokens()->delete();

        // Create new Sanctum API token
        $apiToken = $user->createToken('cbt_auth_token')->plainTextToken;

        // Retrieve user roles and profile details
        $role = $user->getRoleNames()->first();
        
        $profile = null;
        if ($role === 'siswa') {
            $user->load('student.classRoom', 'student.major');
            $profile = $user->student;
        } elseif ($role === 'guru') {
            $user->load('teacher');
            $profile = $user->teacher;
        }

        return response()->json([
            'token' => $apiToken,
            'session_token' => $sessionToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $role,
                'profile' => $profile
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        
        if ($user) {
            // Clear the active session token in DB
            $user->update(['active_session_token' => null]);
            
            // Revoke current token
            $user->currentAccessToken()->delete();
        }

        return response()->json([
            'message' => 'Berhasil keluar.'
        ]);
    }
}
