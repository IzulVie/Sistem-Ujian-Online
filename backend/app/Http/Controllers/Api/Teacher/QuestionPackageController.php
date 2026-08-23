<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\QuestionPackage;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class QuestionPackageController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $teacher = $user->teacher;

        $query = QuestionPackage::with(['subject', 'teacher.user'])
            ->withCount('questions');

        // If teacher role, show only teacher's packages (or all if admin)
        if ($teacher && !$user->hasRole(['super_admin', 'admin'])) {
            $query->where('teacher_id', $teacher->id);
        }

        if ($request->has('subject_id') && !empty($request->subject_id)) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'subject_name' => 'nullable|string|max:255',
            'subject_id' => 'nullable|exists:subjects,id',
            'description' => 'nullable|string',
            'code' => 'nullable|string|max:50|unique:question_packages,code',
        ]);

        $user = $request->user();
        $teacher = $user->teacher;
        $teacherId = $teacher ? $teacher->id : Teacher::first()?->id;

        if (!$teacherId) {
            return response()->json(['message' => 'Profil guru tidak ditemukan.'], 422);
        }

        // Resolve subject: from manual subject_name or subject_id
        $subject = null;
        if ($request->filled('subject_name')) {
            $subjName = trim($request->subject_name);
            $subject = Subject::where('name', $subjName)->first();
            if (!$subject) {
                $cleanCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $subjName), 0, 6));
                if (empty($cleanCode)) {
                    $cleanCode = 'MAPEL';
                }
                $finalCode = $cleanCode;
                $suffix = 1;
                while (Subject::where('code', $finalCode)->exists()) {
                    $finalCode = $cleanCode . $suffix;
                    $suffix++;
                }
                $subject = Subject::create([
                    'name' => $subjName,
                    'code' => $finalCode,
                ]);
            }
        } elseif ($request->filled('subject_id')) {
            $subject = Subject::find($request->subject_id);
        }

        if (!$subject) {
            $subject = Subject::firstOrCreate(
                ['name' => 'Umum'],
                ['code' => 'UMUM']
            );
        }

        $code = $request->code ?: 'PKT-' . ($subject->code ?: 'GEN') . '-' . strtoupper(Str::random(4));

        // Ensure unique code
        while (QuestionPackage::where('code', $code)->exists()) {
            $code = 'PKT-' . ($subject->code ?: 'GEN') . '-' . strtoupper(Str::random(4));
        }

        $package = QuestionPackage::create([
            'teacher_id' => $teacherId,
            'subject_id' => $subject->id,
            'code' => $code,
            'title' => $request->title,
            'description' => $request->description,
            'total_questions' => 0,
        ]);

        $package->load(['subject', 'teacher.user']);

        return response()->json([
            'message' => 'Berkas paket soal berhasil dibuat.',
            'data' => $package
        ], 201);
    }

    public function show(QuestionPackage $package)
    {
        $package->load([
            'subject',
            'teacher.user',
            'questions' => function ($q) {
                $q->with(['options', 'matchingPairs'])->latest();
            }
        ]);

        return response()->json($package);
    }

    public function update(Request $request, QuestionPackage $package)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'subject_name' => 'nullable|string|max:255',
            'subject_id' => 'nullable|exists:subjects,id',
            'description' => 'nullable|string',
            'code' => 'nullable|string|max:50|unique:question_packages,code,' . $package->id,
        ]);

        $subject = null;
        if ($request->filled('subject_name')) {
            $subjName = trim($request->subject_name);
            $subject = Subject::where('name', $subjName)->first();
            if (!$subject) {
                $cleanCode = strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $subjName), 0, 6));
                if (empty($cleanCode)) {
                    $cleanCode = 'MAPEL';
                }
                $finalCode = $cleanCode;
                $suffix = 1;
                while (Subject::where('code', $finalCode)->exists()) {
                    $finalCode = $cleanCode . $suffix;
                    $suffix++;
                }
                $subject = Subject::create([
                    'name' => $subjName,
                    'code' => $finalCode,
                ]);
            }
        } elseif ($request->filled('subject_id')) {
            $subject = Subject::find($request->subject_id);
        }

        $subjectId = $subject ? $subject->id : $package->subject_id;

        $package->update([
            'title' => $request->title,
            'subject_id' => $subjectId,
            'description' => $request->description,
            'code' => $request->code ?: $package->code,
        ]);

        $package->syncTotalQuestions();
        $package->load(['subject', 'teacher.user']);

        return response()->json([
            'message' => 'Berkas paket soal berhasil diperbarui.',
            'data' => $package
        ]);
    }

    public function destroy(QuestionPackage $package)
    {
        $package->delete();

        return response()->json([
            'message' => 'Berkas paket soal beserta butir soal di dalamnya berhasil dihapus.'
        ]);
    }

    public function duplicate(QuestionPackage $package)
    {
        $newPackage = DB::transaction(function () use ($package) {
            $subject = $package->subject;
            $code = 'PKT-' . ($subject ? $subject->code : 'GEN') . '-' . strtoupper(Str::random(4));
            while (QuestionPackage::where('code', $code)->exists()) {
                $code = 'PKT-' . ($subject ? $subject->code : 'GEN') . '-' . strtoupper(Str::random(4));
            }

            $clone = QuestionPackage::create([
                'teacher_id' => $package->teacher_id,
                'subject_id' => $package->subject_id,
                'code' => $code,
                'title' => '[Salinan] ' . $package->title,
                'description' => $package->description,
                'total_questions' => 0,
            ]);

            // Clone all questions, options, and matching pairs
            $questions = $package->questions()->with(['options', 'matchingPairs'])->get();
            foreach ($questions as $q) {
                $newQuestion = $q->replicate();
                $newQuestion->package_id = $clone->id;
                $newQuestion->save();

                foreach ($q->options as $opt) {
                    $newOpt = $opt->replicate();
                    $newOpt->question_bank_id = $newQuestion->id;
                    $newOpt->save();
                }

                foreach ($q->matchingPairs as $mp) {
                    $newMp = $mp->replicate();
                    $newMp->question_bank_id = $newQuestion->id;
                    $newMp->save();
                }
            }

            $clone->syncTotalQuestions();
            return $clone;
        });

        $newPackage->load(['subject', 'teacher.user']);

        return response()->json([
            'message' => 'Berkas paket soal berhasil diduplikasi.',
            'data' => $newPackage
        ], 201);
    }
}
