<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Student;
use App\Models\Major;
use App\Models\ClassRoom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StudentController extends Controller
{
    public function index()
    {
        $students = User::role('siswa')
            ->with(['student.classRoom', 'student.major'])
            ->get();

        return response()->json($students);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:users,email',
            'username' => 'required|string|unique:users,username',
            'password' => 'required|string|min:6',
            'nisn' => 'nullable|string|unique:students,nisn',
            'nis' => 'nullable|string|unique:students,nis',
            'class_id' => 'nullable|exists:classes,id',
            'major_id' => 'nullable|exists:majors,id',
        ]);

        $studentUser = DB::transaction(function () use ($request) {
            // Create user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'is_active' => true,
            ]);

            // Assign role
            $user->assignRole('siswa');

            // Create profile
            Student::create([
                'user_id' => $user->id,
                'nisn' => $request->nisn ?? $request->username,
                'nis' => $request->nis,
                'class_id' => $request->class_id,
                'major_id' => $request->major_id,
            ]);

            return $user;
        });

        $studentUser->load(['student.classRoom', 'student.major']);

        return response()->json([
            'message' => 'Siswa berhasil ditambahkan.',
            'data' => $studentUser
        ], 201);
    }

    public function show($id)
    {
        $student = User::role('siswa')
            ->with(['student.classRoom', 'student.major'])
            ->findOrFail($id);

        return response()->json($student);
    }

    public function update(Request $request, $id)
    {
        $user = User::role('siswa')->findOrFail($id);
        $student = $user->student;

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $user->id,
            'username' => 'required|string|unique:users,username,' . $user->id,
            'password' => 'nullable|string|min:6',
            'nisn' => 'nullable|string|unique:students,nisn,' . ($student->id ?? 0),
            'nis' => 'nullable|string|unique:students,nis,' . ($student->id ?? 0),
            'class_id' => 'nullable|exists:classes,id',
            'major_id' => 'nullable|exists:majors,id',
        ]);

        DB::transaction(function () use ($request, $user, $student) {
            // Update user
            $user->name = $request->name;
            $user->email = $request->email;
            $user->username = $request->username;
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }
            $user->save();

            // Ensure profile exists, then update
            if (! $student) {
                Student::create([
                    'user_id' => $user->id,
                    'nisn' => $request->nisn ?? $request->username,
                    'nis' => $request->nis,
                    'class_id' => $request->class_id,
                    'major_id' => $request->major_id,
                ]);
            } else {
                $student->update([
                    'nisn' => $request->nisn ?? $request->username,
                    'nis' => $request->nis,
                    'class_id' => $request->class_id,
                    'major_id' => $request->major_id,
                ]);
            }
        });

        $user->load(['student.classRoom', 'student.major']);

        return response()->json([
            'message' => 'Siswa berhasil diperbarui.',
            'data' => $user
        ]);
    }

    public function destroy($id)
    {
        $user = User::role('siswa')->findOrFail($id);
        
        // Cascades to student profile
        $user->delete();

        return response()->json([
            'message' => 'Siswa berhasil dihapus.'
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:4096',
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();
        
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return response()->json(['message' => 'Gagal membuka file CSV.'], 422);
        }

        // Read and trim headers
        $headers = fgetcsv($handle, 1000, ',');
        if ($headers === false) {
            fclose($handle);
            return response()->json(['message' => 'File CSV kosong.'], 422);
        }

        $headers = array_map(function($h) {
            return strtolower(trim($h));
        }, $headers);

        // Support standard column variations (name, username, password)
        if (!in_array('name', $headers) || !in_array('username', $headers) || !in_array('password', $headers)) {
            fclose($handle);
            return response()->json([
                'message' => 'Format file salah. Kolom yang diwajibkan: name, username, password.'
            ], 422);
        }

        $importedCount = 0;
        $errors = [];
        $rowNum = 1;

        DB::beginTransaction();
        try {
            while (($row = fgetcsv($handle, 1000, ',')) !== false) {
                $rowNum++;
                // Skip empty lines
                if (empty(array_filter($row))) {
                    continue;
                }
                
                $data = array_combine($headers, $row);
                
                $cleanVal = function($val) {
                    $val = trim($val ?? '');
                    if (preg_match('/^[=+\-@\t\r]/', $val)) {
                        $val = ltrim($val, "=+-@\t\r ");
                    }
                    return $val;
                };

                $name = $cleanVal($data['name'] ?? '');
                $email = $cleanVal($data['email'] ?? '');
                $username = $cleanVal($data['username'] ?? '');
                $password = trim($data['password'] ?? '');
                $nisn = $cleanVal($data['nisn'] ?? $username);
                $nis = $cleanVal($data['nis'] ?? '');
                $class_name = $cleanVal($data['class_name'] ?? '');
                $major_code = $cleanVal($data['major_code'] ?? '');

                if (empty($name) || empty($username) || empty($password)) {
                    $errors[] = "Baris {$rowNum}: Nama, username, dan password wajib diisi.";
                    continue;
                }

                if (User::where('username', $username)->exists()) {
                    $errors[] = "Baris {$rowNum}: Username/NISN '{$username}' sudah digunakan.";
                    continue;
                }

                if (!empty($email) && User::where('email', $email)->exists()) {
                    $errors[] = "Baris {$rowNum}: Email '{$email}' sudah digunakan.";
                    continue;
                }

                // Check class and major mapping
                $majorId = null;
                if (!empty($major_code)) {
                    $major = Major::where('code', $major_code)->first();
                    $majorId = $major ? $major->id : null;
                }

                $classId = null;
                if (!empty($class_name)) {
                    $class = ClassRoom::where('name', $class_name)->first();
                    $classId = $class ? $class->id : null;
                }

                // Insert User record
                $user = User::create([
                    'name' => $name,
                    'email' => !empty($email) ? $email : null,
                    'username' => $username,
                    'password' => Hash::make($password),
                    'is_active' => true,
                ]);

                $user->assignRole('siswa');

                // Insert Student Profile
                Student::create([
                    'user_id' => $user->id,
                    'nisn' => !empty($nisn) ? $nisn : $username,
                    'nis' => !empty($nis) ? $nis : null,
                    'class_id' => $classId,
                    'major_id' => $majorId,
                ]);

                $importedCount++;
            }

            fclose($handle);

            if (!empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Gagal mengimpor file karena terdapat kesalahan data.',
                    'errors' => $errors
                ], 422);
            }

            DB::commit();
            return response()->json([
                'message' => "Berhasil mengimpor {$importedCount} data siswa.",
            ]);

        } catch (\Exception $e) {
            fclose($handle);
            DB::rollBack();
            return response()->json([
                'message' => 'Kesalahan memproses CSV: ' . $e->getMessage()
            ], 500);
        }
    }
}
