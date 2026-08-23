<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();
        
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
}
