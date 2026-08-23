<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Major;
use Illuminate\Http\Request;

class MajorController extends Controller
{
    public function index()
    {
        return response()->json(Major::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:majors,code',
        ]);

        $major = Major::create($validated);

        return response()->json([
            'message' => 'Jurusan berhasil dibuat.',
            'data' => $major
        ], 201);
    }

    public function show(Major $major)
    {
        return response()->json($major);
    }

    public function update(Request $request, Major $major)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:majors,code,' . $major->id,
        ]);

        $major->update($validated);

        return response()->json([
            'message' => 'Jurusan berhasil diperbarui.',
            'data' => $major
        ]);
    }

    public function destroy(Major $major)
    {
        $major->delete();

        return response()->json([
            'message' => 'Jurusan berhasil dihapus.'
        ]);
    }
}
