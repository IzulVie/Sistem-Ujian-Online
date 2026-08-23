<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AcademicYearController extends Controller
{
    public function index()
    {
        return response()->json(AcademicYear::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'semester' => 'required|in:odd,even',
            'is_active' => 'boolean',
        ]);

        $academicYear = DB::transaction(function () use ($validated) {
            $is_active = $validated['is_active'] ?? false;

            if ($is_active) {
                AcademicYear::query()->update(['is_active' => false]);
            }

            return AcademicYear::create($validated);
        });

        return response()->json([
            'message' => 'Tahun ajaran berhasil dibuat.',
            'data' => $academicYear
        ], 201);
    }

    public function show(AcademicYear $academicYear)
    {
        return response()->json($academicYear);
    }

    public function update(Request $request, AcademicYear $academicYear)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'semester' => 'required|in:odd,even',
            'is_active' => 'boolean',
        ]);

        $academicYear = DB::transaction(function () use ($validated, $academicYear) {
            $is_active = $validated['is_active'] ?? false;

            if ($is_active) {
                AcademicYear::query()->where('id', '!=', $academicYear->id)->update(['is_active' => false]);
            }

            $academicYear->update($validated);
            return $academicYear;
        });

        return response()->json([
            'message' => 'Tahun ajaran berhasil diperbarui.',
            'data' => $academicYear
        ]);
    }

    public function destroy(AcademicYear $academicYear)
    {
        if ($academicYear->is_active) {
            return response()->json([
                'message' => 'Tidak dapat menghapus tahun ajaran yang sedang aktif.'
            ], 422);
        }

        $academicYear->delete();

        return response()->json([
            'message' => 'Tahun ajaran berhasil dihapus.'
        ]);
    }

    public function activate(AcademicYear $academicYear)
    {
        DB::transaction(function () use ($academicYear) {
            AcademicYear::query()->update(['is_active' => false]);
            $academicYear->update(['is_active' => true]);
        });

        return response()->json([
            'message' => "Tahun ajaran {$academicYear->name} ({$academicYear->semester}) berhasil diaktifkan.",
            'data' => $academicYear
        ]);
    }
}
