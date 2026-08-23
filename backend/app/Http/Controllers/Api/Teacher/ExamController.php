<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamController extends Controller
{
    public function index(Request $request)
    {
        $query = Exam::with(['subject', 'academicYear', 'package', 'questions']);

        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'package_id' => 'nullable|exists:question_packages,id',
            'subject_id' => 'required|exists:subjects,id',
            'duration_minutes' => 'required|integer|min:1',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'kkm_score' => 'required|integer|min:0|max:100',
            'status' => 'required|in:draft,published,closed',
            
            // Settings JSON
            'settings' => 'nullable|array',
            'settings.allow_backtrack' => 'nullable|boolean',
            'settings.allow_flag' => 'nullable|boolean',
            'settings.shuffle_questions' => 'nullable|boolean',
            'settings.shuffle_options' => 'nullable|boolean',
            'settings.show_result_immediately' => 'nullable|boolean',

            // Questions mapping
            'questions' => 'nullable|array',
            'questions.*.id' => 'required|exists:question_banks,id',
            'questions.*.weight' => 'required|integer|min:1',
        ]);

        $activeYear = AcademicYear::where('is_active', true)->first();
        if (!$activeYear) {
            return response()->json([
                'message' => 'Tidak ada Tahun Ajaran aktif saat ini. Aktifkan tahun ajaran terlebih dahulu.'
            ], 422);
        }

        $exam = DB::transaction(function () use ($request, $activeYear) {
            $exam = Exam::create([
                'title' => $request->title,
                'package_id' => $request->package_id,
                'subject_id' => $request->subject_id,
                'academic_year_id' => $activeYear->id,
                'duration_minutes' => $request->duration_minutes,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'settings' => $request->settings ?? [
                    'allow_backtrack' => true,
                    'allow_flag' => true,
                    'shuffle_questions' => false,
                    'shuffle_options' => false,
                    'show_result_immediately' => false,
                ],
                'kkm_score' => $request->kkm_score,
                'status' => $request->status,
            ]);

            // Sync questions: either from explicit questions array or auto-pull from package
            if ($request->has('questions') && !empty($request->questions)) {
                $syncData = [];
                foreach ($request->questions as $index => $q) {
                    $syncData[$q['id']] = [
                        'weight' => $q['weight'],
                        'order' => $index
                    ];
                }
                $exam->questions()->sync($syncData);
            } elseif ($request->filled('package_id')) {
                $packageQuestions = \App\Models\QuestionBank::where('package_id', $request->package_id)->get();
                $syncData = [];
                foreach ($packageQuestions as $index => $q) {
                    $syncData[$q->id] = [
                        'weight' => 2,
                        'order' => $index
                    ];
                }
                $exam->questions()->sync($syncData);
            }

            return $exam;
        });

        $exam->load(['subject', 'academicYear', 'package', 'questions']);

        return response()->json([
            'message' => 'Ujian berhasil dibuat.',
            'data' => $exam
        ], 201);
    }

    public function show($id)
    {
        $exam = Exam::with(['subject', 'academicYear', 'package', 'questions.options', 'questions.matchingPairs'])
            ->findOrFail($id);

        return response()->json($exam);
    }

    public function update(Request $request, $id)
    {
        $exam = Exam::findOrFail($id);

        $request->validate([
            'title' => 'required|string|max:255',
            'package_id' => 'nullable|exists:question_packages,id',
            'subject_id' => 'required|exists:subjects,id',
            'duration_minutes' => 'required|integer|min:1',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'kkm_score' => 'required|integer|min:0|max:100',
            'status' => 'required|in:draft,published,closed',
            
            'settings' => 'nullable|array',
            'settings.allow_backtrack' => 'required|boolean',
            'settings.allow_flag' => 'required|boolean',
            'settings.shuffle_questions' => 'required|boolean',
            'settings.shuffle_options' => 'required|boolean',
            'settings.show_result_immediately' => 'required|boolean',

            'questions' => 'nullable|array',
            'questions.*.id' => 'required|exists:question_banks,id',
            'questions.*.weight' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($request, $exam) {
            $exam->update([
                'title' => $request->title,
                'package_id' => $request->has('package_id') ? $request->package_id : $exam->package_id,
                'subject_id' => $request->subject_id,
                'duration_minutes' => $request->duration_minutes,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'settings' => $request->settings,
                'kkm_score' => $request->kkm_score,
                'status' => $request->status,
            ]);

            if ($request->has('questions') && !empty($request->questions)) {
                $syncData = [];
                foreach ($request->questions as $index => $q) {
                    $syncData[$q['id']] = [
                        'weight' => $q['weight'],
                        'order' => $index
                    ];
                }
                $exam->questions()->sync($syncData);
            } elseif ($request->filled('package_id') && $request->package_id != $exam->getOriginal('package_id')) {
                $packageQuestions = \App\Models\QuestionBank::where('package_id', $request->package_id)->get();
                $syncData = [];
                foreach ($packageQuestions as $index => $q) {
                    $syncData[$q->id] = [
                        'weight' => 2,
                        'order' => $index
                    ];
                }
                $exam->questions()->sync($syncData);
            }
        });

        $exam->load(['subject', 'academicYear', 'package', 'questions']);

        return response()->json([
            'message' => 'Ujian berhasil diperbarui.',
            'data' => $exam
        ]);
    }

    public function destroy($id)
    {
        $exam = Exam::findOrFail($id);
        $exam->delete();

        return response()->json([
            'message' => 'Ujian berhasil dihapus.'
        ]);
    }
}
