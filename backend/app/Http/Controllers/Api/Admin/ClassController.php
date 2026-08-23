<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassRoom;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function index()
    {
        return response()->json(ClassRoom::with('major')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'level' => 'required|integer',
            'major_id' => 'nullable|exists:majors,id',
        ]);

        $classRoom = ClassRoom::create($validated);
        $classRoom->load('major');

        return response()->json([
            'message' => 'Kelas berhasil dibuat.',
            'data' => $classRoom
        ], 201);
    }

    public function show(ClassRoom $classRoom)
    {
        $classRoom->load('major');
        return response()->json($classRoom);
    }

    public function update(Request $request, ClassRoom $classRoom)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'level' => 'required|integer',
            'major_id' => 'nullable|exists:majors,id',
        ]);

        $classRoom->update($validated);
        $classRoom->load('major');

        return response()->json([
            'message' => 'Kelas berhasil diperbarui.',
            'data' => $classRoom
        ]);
    }

    public function destroy(ClassRoom $classRoom)
    {
        $classRoom->delete();

        return response()->json([
            'message' => 'Kelas berhasil dihapus.'
        ]);
    }
}
