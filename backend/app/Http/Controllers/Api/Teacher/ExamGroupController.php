<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\ExamGroup;
use App\Models\Exam;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ExamGroupController extends Controller
{
    public function index(Request $request)
    {
        $query = ExamGroup::with(['exam.subject', 'students.user']);

        if ($request->has('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'token' => 'nullable|string|min:4|max:10|unique:exam_groups,token',
            'max_participants' => 'nullable|integer|min:1',
            'class_ids' => 'nullable|array',
            'class_ids.*' => 'exists:classes,id',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'exists:students,id',
        ]);

        $token = $request->token ?: strtoupper(Str::random(6));

        while (ExamGroup::where('token', $token)->exists()) {
            $token = strtoupper(Str::random(6));
        }

        $studentIds = collect($request->input('student_ids', []));

        if ($request->has('class_ids') && !empty($request->class_ids)) {
            $classStudentIds = Student::whereIn('class_id', $request->class_ids)->pluck('id');
            $studentIds = $studentIds->merge($classStudentIds)->unique()->values();
        }

        $examGroup = DB::transaction(function () use ($request, $token, $studentIds) {
            $group = ExamGroup::create([
                'exam_id' => $request->exam_id,
                'name' => $request->name,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'token' => $token,
                'max_participants' => $request->max_participants,
            ]);

            if ($studentIds->isNotEmpty()) {
                $group->students()->sync($studentIds->all());
            }

            return $group;
        });

        $examGroup->load(['exam', 'students.user']);

        return response()->json([
            'message' => 'Gelombang ujian berhasil dibuat.',
            'data' => $examGroup
        ], 201);
    }

    public function show($id)
    {
        $group = ExamGroup::with(['exam.subject', 'students.user', 'students.classRoom', 'students.major'])
            ->findOrFail($id);

        return response()->json($group);
    }

    public function update(Request $request, $id)
    {
        $group = ExamGroup::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'token' => 'nullable|string|min:4|max:10|unique:exam_groups,token,' . $id,
            'max_participants' => 'nullable|integer|min:1',
            'class_ids' => 'nullable|array',
            'class_ids.*' => 'exists:classes,id',
            'student_ids' => 'nullable|array',
            'student_ids.*' => 'exists:students,id',
        ]);

        $studentIds = collect($request->input('student_ids', []));

        if ($request->has('class_ids') && !empty($request->class_ids)) {
            $classStudentIds = Student::whereIn('class_id', $request->class_ids)->pluck('id');
            $studentIds = $studentIds->merge($classStudentIds)->unique()->values();
        }

        DB::transaction(function () use ($request, $group, $studentIds) {
            $token = $request->token ?: $group->token;

            $group->update([
                'name' => $request->name,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'token' => $token,
                'max_participants' => $request->max_participants,
            ]);

            if ($request->has('class_ids') || $request->has('student_ids')) {
                $group->students()->sync($studentIds->all());
            }
        });

        $group->load(['exam', 'students.user']);

        return response()->json([
            'message' => 'Gelombang ujian berhasil diperbarui.',
            'data' => $group
        ]);
    }

    public function destroy($id)
    {
        $group = ExamGroup::findOrFail($id);
        $group->delete();

        return response()->json([
            'message' => 'Gelombang ujian berhasil dihapus.'
        ]);
    }
}
