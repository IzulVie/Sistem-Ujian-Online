<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TeacherController extends Controller
{
    public function index()
    {
        $teachers = User::role('guru')
            ->with(['teacher.subjects'])
            ->get();

        return response()->json($teachers);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'nip' => 'nullable|string|unique:teachers,nip',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
        ]);

        $teacherUser = DB::transaction(function () use ($request) {
            // Create user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'is_active' => true,
            ]);

            // Assign role
            $user->assignRole('guru');

            // Create profile
            $teacher = Teacher::create([
                'user_id' => $user->id,
                'nip' => $request->nip,
            ]);

            // Sync subjects
            if ($request->has('subject_ids')) {
                $teacher->subjects()->sync($request->subject_ids);
            }

            return $user;
        });

        $teacherUser->load(['teacher.subjects']);

        return response()->json([
            'message' => 'Guru berhasil ditambahkan.',
            'data' => $teacherUser
        ], 201);
    }

    public function show($id)
    {
        $teacher = User::role('guru')
            ->with(['teacher.subjects'])
            ->findOrFail($id);

        return response()->json($teacher);
    }

    public function update(Request $request, $id)
    {
        $user = User::role('guru')->findOrFail($id);
        $teacher = $user->teacher;

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'nip' => 'nullable|string|unique:teachers,nip,' . ($teacher->id ?? 0),
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
        ]);

        DB::transaction(function () use ($request, $user, $teacher) {
            // Update User fields
            $user->name = $request->name;
            $user->email = $request->email;
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }
            $user->save();

            // Ensure profile exists, then update NIP
            if (! $teacher) {
                $teacher = Teacher::create([
                    'user_id' => $user->id,
                    'nip' => $request->nip,
                ]);
            } else {
                $teacher->update(['nip' => $request->nip]);
            }

            // Sync subjects
            if ($request->has('subject_ids')) {
                $teacher->subjects()->sync($request->subject_ids);
            }
        });

        $user->load(['teacher.subjects']);

        return response()->json([
            'message' => 'Guru berhasil diperbarui.',
            'data' => $user
        ]);
    }

    public function destroy($id)
    {
        $user = User::role('guru')->findOrFail($id);

        // Delete user (cascades to profile)
        $user->delete();

        return response()->json([
            'message' => 'Guru berhasil dihapus.'
        ]);
    }
}
