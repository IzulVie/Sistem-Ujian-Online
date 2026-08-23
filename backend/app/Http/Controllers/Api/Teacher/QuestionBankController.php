<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\QuestionMatchingPair;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class QuestionBankController extends Controller
{
    public function index(Request $request)
    {
        $query = QuestionBank::with(['subject', 'teacher.user', 'options', 'matchingPairs', 'package']);

        if ($request->has('package_id') && !empty($request->package_id)) {
            $query->where('package_id', $request->package_id);
        }

        if ($request->has('subject_id') && !empty($request->subject_id)) {
            $query->where('subject_id', $request->subject_id);
        }

        if ($request->has('difficulty') && !empty($request->difficulty)) {
            $query->where('difficulty', $request->difficulty);
        }

        $user = $request->user();
        if ($user->hasRole('guru') && $user->teacher) {
            $query->where('teacher_id', $user->teacher->id);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'package_id' => 'nullable|exists:question_packages,id',
            'subject_id' => 'required|exists:subjects,id',
            'topic' => 'required|string|max:255',
            'difficulty' => 'required|in:easy,medium,hard',
            'type' => 'required|in:multiple_choice_single,multiple_choice_multi,essay,true_false,matching',
            'content' => 'required|string',
            'media' => 'nullable|image|max:2048',
            'explanation' => 'nullable|string',
            
            'options' => 'nullable|array',
            'options.*.content' => 'required|string',
            'options.*.is_correct' => 'required|boolean',
            'options.*.order' => 'nullable|integer',
            'options.*.media' => 'nullable|image|max:2048',

            'matching_pairs' => 'nullable|array',
            'matching_pairs.*.left_item' => 'required|string',
            'matching_pairs.*.right_item' => 'required|string',
        ]);

        $user = $request->user();
        $teacher = $user->teacher;
        $teacherId = $teacher ? $teacher->id : $request->input('teacher_id', Teacher::first()?->id);

        if (!$teacherId) {
            return response()->json([
                'message' => 'Profile guru tidak ditemukan untuk menautkan soal ini.'
            ], 422);
        }

        $question = DB::transaction(function () use ($request, $teacherId) {
            $mediaUrl = null;
            if ($request->hasFile('media')) {
                $path = $request->file('media')->store('questions', 'public');
                $mediaUrl = asset('storage/' . $path);
            }

            $q = QuestionBank::create([
                'package_id' => $request->package_id,
                'subject_id' => $request->subject_id,
                'teacher_id' => $teacherId,
                'topic' => $request->topic,
                'difficulty' => $request->difficulty,
                'type' => $request->type,
                'content' => $request->content,
                'media_url' => $mediaUrl,
                'explanation' => $request->explanation,
            ]);

            if ($request->type !== 'essay' && $request->type !== 'matching' && $request->has('options')) {
                foreach ($request->options as $index => $opt) {
                    $optMediaUrl = null;
                    if (isset($opt['media']) && $opt['media'] instanceof \Illuminate\Http\UploadedFile) {
                        $optPath = $opt['media']->store('options', 'public');
                        $optMediaUrl = asset('storage/' . $optPath);
                    }

                    QuestionOption::create([
                        'question_bank_id' => $q->id,
                        'content' => $opt['content'],
                        'is_correct' => filter_var($opt['is_correct'], FILTER_VALIDATE_BOOLEAN),
                        'order' => $opt['order'] ?? $index,
                        'media_url' => $optMediaUrl,
                    ]);
                }
            }

            if ($request->type === 'matching' && $request->has('matching_pairs')) {
                foreach ($request->matching_pairs as $pair) {
                    QuestionMatchingPair::create([
                        'question_bank_id' => $q->id,
                        'left_item' => $pair['left_item'],
                        'right_item' => $pair['right_item'],
                    ]);
                }
            }

            if ($q->package_id) {
                \App\Models\QuestionPackage::find($q->package_id)?->syncTotalQuestions();
            }

            return $q;
        });

        $question->load(['options', 'matchingPairs']);

        return response()->json([
            'message' => 'Soal berhasil disimpan.',
            'data' => $question
        ], 201);
    }

    public function show($id)
    {
        $question = QuestionBank::with(['subject', 'options', 'matchingPairs'])
            ->findOrFail($id);

        return response()->json($question);
    }

    public function update(Request $request, $id)
    {
        $question = QuestionBank::findOrFail($id);

        $request->validate([
            'package_id' => 'nullable|exists:question_packages,id',
            'subject_id' => 'required|exists:subjects,id',
            'topic' => 'required|string|max:255',
            'difficulty' => 'required|in:easy,medium,hard',
            'type' => 'required|in:multiple_choice_single,multiple_choice_multi,essay,true_false,matching',
            'content' => 'required|string',
            'media' => 'nullable|image|max:2048',
            'explanation' => 'nullable|string',
            
            'options' => 'nullable|array',
            'options.*.content' => 'required|string',
            'options.*.is_correct' => 'required|boolean',
            'options.*.order' => 'nullable|integer',
            'options.*.media' => 'nullable|image|max:2048',

            'matching_pairs' => 'nullable|array',
            'matching_pairs.*.left_item' => 'required|string',
            'matching_pairs.*.right_item' => 'required|string',
        ]);

        DB::transaction(function () use ($request, $question) {
            if ($request->hasFile('media')) {
                if ($question->media_url) {
                    $oldPath = str_replace(asset('storage/'), '', $question->media_url);
                    Storage::disk('public')->delete($oldPath);
                }

                $path = $request->file('media')->store('questions', 'public');
                $question->media_url = asset('storage/' . $path);
            }

            $oldPackageId = $question->package_id;

            $question->update([
                'package_id' => $request->has('package_id') ? $request->package_id : $question->package_id,
                'subject_id' => $request->subject_id,
                'topic' => $request->topic,
                'difficulty' => $request->difficulty,
                'type' => $request->type,
                'content' => $request->content,
                'explanation' => $request->explanation,
            ]);

            if ($request->type !== 'essay' && $request->type !== 'matching' && $request->has('options')) {
                $question->options()->delete();

                foreach ($request->options as $index => $opt) {
                    $optMediaUrl = $opt['media_url'] ?? null;

                    if (isset($opt['media']) && $opt['media'] instanceof \Illuminate\Http\UploadedFile) {
                        $optPath = $opt['media']->store('options', 'public');
                        $optMediaUrl = asset('storage/' . $optPath);
                    }

                    QuestionOption::create([
                        'question_bank_id' => $question->id,
                        'content' => $opt['content'],
                        'is_correct' => filter_var($opt['is_correct'], FILTER_VALIDATE_BOOLEAN),
                        'order' => $opt['order'] ?? $index,
                        'media_url' => $optMediaUrl,
                    ]);
                }
            }

            if ($request->type === 'matching' && $request->has('matching_pairs')) {
                $question->matchingPairs()->delete();

                foreach ($request->matching_pairs as $pair) {
                    QuestionMatchingPair::create([
                        'question_bank_id' => $question->id,
                        'left_item' => $pair['left_item'],
                        'right_item' => $pair['right_item'],
                    ]);
                }
            }

            if ($oldPackageId && $oldPackageId != $question->package_id) {
                \App\Models\QuestionPackage::find($oldPackageId)?->syncTotalQuestions();
            }
            if ($question->package_id) {
                $question->package?->syncTotalQuestions();
            }
        });

        $question->load(['options', 'matchingPairs']);

        return response()->json([
            'message' => 'Soal berhasil diperbarui.',
            'data' => $question
        ]);
    }

    public function destroy($id)
    {
        $question = QuestionBank::findOrFail($id);
        $package = $question->package;

        if ($question->media_url) {
            $path = str_replace(asset('storage/'), '', $question->media_url);
            Storage::disk('public')->delete($path);
        }

        foreach ($question->options as $opt) {
            if ($opt->media_url) {
                $optPath = str_replace(asset('storage/'), '', $opt->media_url);
                Storage::disk('public')->delete($optPath);
            }
        }

        $question->delete();

        if ($package) {
            $package->syncTotalQuestions();
        }

        return response()->json([
            'message' => 'Soal berhasil dihapus.'
        ]);
    }
}
