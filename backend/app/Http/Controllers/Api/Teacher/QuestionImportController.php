<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\QuestionMatchingPair;
use App\Models\Subject;
use App\Models\Teacher;
use App\Services\DocxQuestionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuestionImportController extends Controller
{
    public function downloadTemplate()
    {
        $csvContent = "\xEF\xBB\xBF" . // UTF-8 BOM
            "sep=;\n" . // Excel directive to split columns with semicolon automatically
            "soal;tipe_soal;tingkat_kesulitan;topik;pilihan_a;pilihan_b;pilihan_c;pilihan_d;pilihan_e;kunci_jawaban;pembahasan;pasangan_menjodohkan_1;pasangan_menjodohkan_2;pasangan_menjodohkan_3;pasangan_menjodohkan_4\n" .
            "\"Berapakah hasil dari 2 + 2 ?\";pilihan_ganda;mudah;Aritmatika;3;4;5;6;;B;\"2 + 2 = 4\";;;;\n" .
            "\"Pilihlah semua bilangan prima di bawah 10!\";pilihan_ganda_kompleks;sedang;Bilangan;2;3;4;9;;A,B;\"2 dan 3 adalah bilangan prima\";;;;\n" .
            "\"Sudut siku-siku memiliki besar 90 derajat.\";benar_salah;mudah;Geometri;;;;;;Benar;\"Sudut siku-siku selalu bernilai 90 derajat\";;;;\n" .
            "\"Jelaskan proses fotosintesis pada tumbuhan!\";essay;sedang;Biologi;;;;;;\"Proses pembentukan makanan oleh tumbuhan menggunakan cahaya matahari dan klorofil.\";\"Reaksi terang dan gelap menghasilkan glukosa.\";;;;\n" .
            "\"Jodohkan bahasa pemrograman berikut dengan logonya!\";menjodohkan;mudah;Teknologi;;;;;;;\"Kunci otomatis sesuai pasangan di samping\";\"Python : Ular\";\"Java : Secangkir Kopi\";\"PHP : Gajah\";\"JavaScript : Huruf JS\"\n";

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="template_import_soal.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }

    public function downloadWordTemplate()
    {
        $service = new DocxQuestionService();
        $docxContent = $service->generateWordTemplate();

        return response($docxContent, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => 'attachment; filename="template_import_soal.docx"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ]);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:16384',
            'package_id' => 'nullable|exists:question_packages,id',
        ]);

        $packageId = $request->input('package_id');
        $package = $packageId ? \App\Models\QuestionPackage::with('subject')->find($packageId) : null;

        $teacher = $request->user()->teacher ?? Teacher::first();
        $teacherId = $teacher ? $teacher->id : null;
        $subjectId = $package ? $package->subject_id : null;

        if (!$subjectId) {
            $subject = Subject::first();
            $subjectId = $subject ? $subject->id : null;
        }

        $file = $request->file('file');
        $path = $file->getRealPath();
        $originalExt = strtolower($file->getClientOriginalExtension());
        $mime = $file->getClientMimeType();

        // 1. Process Microsoft Word (.docx) documents
        if ($originalExt === 'docx' || str_contains($mime, 'wordprocessingml') || str_contains($mime, 'officedocument')) {
            try {
                $service = new DocxQuestionService();
                $parsedQuestions = $service->parseDocx($path);

                if (empty($parsedQuestions)) {
                    return response()->json([
                        'message' => 'Tidak ditemukan butir soal valid dalam file Word. Pastikan format penomoran soal sesuai panduan template (1. Teks Soal, Opsi A-E, KUNCI: X).',
                        'errors' => ['Format dokumen tidak memiliki butir soal yang dapat dikenali.']
                    ], 422);
                }

                DB::beginTransaction();
                $importedCount = 0;

                foreach ($parsedQuestions as $idx => $qData) {
                    $question = QuestionBank::create([
                        'package_id' => $packageId,
                        'teacher_id' => $teacherId,
                        'subject_id' => $subjectId,
                        'type' => $qData['type'],
                        'content' => $qData['content'],
                        'difficulty' => $qData['difficulty'] ?? 'sedang',
                        'topic' => $qData['topic'] ?? null,
                        'explanation' => $qData['explanation'] ?? null,
                    ]);

                    if (!empty($qData['options'])) {
                        foreach ($qData['options'] as $opt) {
                            QuestionOption::create([
                                'question_bank_id' => $question->id,
                                'label' => $opt['label'],
                                'content' => $opt['text'],
                                'is_correct' => $opt['is_correct'],
                                'order' => $opt['order'],
                            ]);
                        }
                    }

                    if (!empty($qData['matching_pairs'])) {
                        foreach ($qData['matching_pairs'] as $pair) {
                            QuestionMatchingPair::create([
                                'question_bank_id' => $question->id,
                                'left_item' => $pair['left_item'],
                                'right_item' => $pair['right_item'],
                            ]);
                        }
                    }

                    $importedCount++;
                }

                DB::commit();

                if ($packageId) {
                    \App\Models\QuestionPackage::find($packageId)?->syncTotalQuestions();
                }

                return response()->json([
                    'message' => "Berhasil mengimpor {$importedCount} butir soal dari dokumen Microsoft Word (.docx).",
                    'imported_count' => $importedCount,
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Gagal membaca berkas Word: ' . $e->getMessage()
                ], 422);
            }
        }

        // 2. Process CSV / Excel text files

        $content = file_get_contents($path);
        if ($content === false || empty(trim($content))) {
            return response()->json(['message' => 'File CSV kosong atau tidak terbaca.'], 422);
        }

        // Remove UTF-8 BOM if present
        if (str_starts_with($content, "\xEF\xBB\xBF")) {
            $content = substr($content, 3);
        }

        $lines = preg_split('/\r\n|\r|\n/', trim($content));
        if (empty($lines)) {
            return response()->json(['message' => 'File CSV tidak memiliki baris data.'], 422);
        }

        // Check if first line is sep= directive
        $delimiter = ';';
        $headerIndex = 0;
        if (str_starts_with(strtolower(trim($lines[0])), 'sep=')) {
            $sepLine = trim($lines[0]);
            $delimiter = substr($sepLine, 4, 1) ?: ';';
            $headerIndex = 1;
        } else {
            // Auto-detect delimiter from the first row
            $firstLine = $lines[0];
            $semiCount = substr_count($firstLine, ';');
            $commaCount = substr_count($firstLine, ',');
            $tabCount = substr_count($firstLine, "\t");

            if ($semiCount >= $commaCount && $semiCount >= $tabCount && $semiCount > 0) {
                $delimiter = ';';
            } elseif ($tabCount > $commaCount && $tabCount > 0) {
                $delimiter = "\t";
            } else {
                $delimiter = ',';
            }
        }

        if (!isset($lines[$headerIndex])) {
            return response()->json(['message' => 'Header CSV tidak ditemukan.'], 422);
        }

        // Parse header row
        $rawHeaders = str_getcsv($lines[$headerIndex], $delimiter);
        $headers = array_map(function($h) {
            return strtolower(trim(str_replace(['"', "'", "\xEF\xBB\xBF"], '', $h)));
        }, $rawHeaders);

        // Normalize header mapping
        $headerMap = [];
        foreach ($headers as $idx => $h) {
            if (in_array($h, ['soal', 'content', 'pertanyaan', 'isi_soal'])) $headerMap['content'] = $idx;
            elseif (in_array($h, ['tipe_soal', 'type', 'tipe', 'jenis_soal'])) $headerMap['type'] = $idx;
            elseif (in_array($h, ['tingkat_kesulitan', 'difficulty', 'kesulitan', 'level'])) $headerMap['difficulty'] = $idx;
            elseif (in_array($h, ['topik', 'topic', 'materi', 'bab'])) $headerMap['topic'] = $idx;
            elseif (in_array($h, ['subject_code', 'kode_mapel', 'mapel', 'mata_pelajaran'])) $headerMap['subject_code'] = $idx;
            elseif (in_array($h, ['pilihan_a', 'opsi_a', 'option_a', 'a'])) $headerMap['pilihan_a'] = $idx;
            elseif (in_array($h, ['pilihan_b', 'opsi_b', 'option_b', 'b'])) $headerMap['pilihan_b'] = $idx;
            elseif (in_array($h, ['pilihan_c', 'opsi_c', 'option_c', 'c'])) $headerMap['pilihan_c'] = $idx;
            elseif (in_array($h, ['pilihan_d', 'opsi_d', 'option_d', 'd'])) $headerMap['pilihan_d'] = $idx;
            elseif (in_array($h, ['pilihan_e', 'opsi_e', 'option_e', 'e'])) $headerMap['pilihan_e'] = $idx;
            elseif (in_array($h, ['options', 'opsi', 'pilihan'])) $headerMap['options'] = $idx;
            elseif (in_array($h, ['kunci_jawaban', 'correct_options', 'kunci', 'jawaban_benar', 'jawaban'])) $headerMap['kunci_jawaban'] = $idx;
            elseif (in_array($h, ['pembahasan', 'explanation', 'penjelasan', 'solusi'])) $headerMap['explanation'] = $idx;
            elseif (in_array($h, ['pasangan_menjodohkan_1', 'jodohkan_1', 'matching_1'])) $headerMap['jodohkan_1'] = $idx;
            elseif (in_array($h, ['pasangan_menjodohkan_2', 'jodohkan_2', 'matching_2'])) $headerMap['jodohkan_2'] = $idx;
            elseif (in_array($h, ['pasangan_menjodohkan_3', 'jodohkan_3', 'matching_3'])) $headerMap['jodohkan_3'] = $idx;
            elseif (in_array($h, ['pasangan_menjodohkan_4', 'jodohkan_4', 'matching_4'])) $headerMap['jodohkan_4'] = $idx;
            elseif (in_array($h, ['matching_pairs', 'pasangan_menjodohkan', 'jodohkan'])) $headerMap['matching_pairs'] = $idx;
        }

        if (!isset($headerMap['content'])) {
            return response()->json([
                'message' => 'Format file salah. Kolom "soal" (pertanyaan) wajib ada pada baris pertama.'
            ], 422);
        }

        $user = $request->user();
        $teacher = $user->teacher;
        $teacherId = $teacher ? $teacher->id : Teacher::first()?->id;

        if (!$teacherId) {
            return response()->json(['message' => 'Profil guru tidak ditemukan untuk menautkan soal ini.'], 422);
        }

        $importedCount = 0;
        $errors = [];
        $rowNum = $headerIndex + 1;

        DB::beginTransaction();
        try {
            for ($i = $headerIndex + 1; $i < count($lines); $i++) {
                $line = trim($lines[$i]);
                if (empty($line)) continue;

                $rowNum++;
                $row = str_getcsv($line, $delimiter);
                if (empty(array_filter($row))) continue;

                $getVal = function($key) use ($headerMap, $row) {
                    if (!isset($headerMap[$key], $row[$headerMap[$key]])) return '';
                    $val = trim($row[$headerMap[$key]]);
                    if (preg_match('/^[=+\-@\t\r]/', $val)) {
                        $val = ltrim($val, "=+-@\t\r ");
                    }
                    return $val;
                };

                $content = $getVal('content');
                $rawType = strtolower($getVal('type'));
                $rawDiff = strtolower($getVal('difficulty'));
                $topic = $getVal('topic') ?: 'Umum';
                $subjectCode = $getVal('subject_code');
                $explanation = $getVal('explanation');
                $kunciJawaban = $getVal('kunci_jawaban');

                if (empty($content)) {
                    continue; // Skip blank question row
                }

                // 1. Map type
                $type = 'multiple_choice_single';
                if (in_array($rawType, ['pilihan_ganda_kompleks', 'pg_kompleks', 'multiple_choice_multi', 'majemuk', 'multi'])) {
                    $type = 'multiple_choice_multi';
                } elseif (in_array($rawType, ['benar_salah', 'benar/salah', 'true_false', 'bs'])) {
                    $type = 'true_false';
                } elseif (in_array($rawType, ['essay', 'uraian', 'esai'])) {
                    $type = 'essay';
                } elseif (in_array($rawType, ['menjodohkan', 'matching', 'jodohkan'])) {
                    $type = 'matching';
                } elseif (in_array($rawType, ['pilihan_ganda', 'pg', 'multiple_choice_single', 'tunggal', 'mcq', ''])) {
                    $type = 'multiple_choice_single';
                }

                // 2. Map difficulty
                $difficulty = 'medium';
                if (in_array($rawDiff, ['mudah', 'easy', 'gampang'])) $difficulty = 'easy';
                elseif (in_array($rawDiff, ['sulit', 'hard', 'sukar'])) $difficulty = 'hard';

                // 3. Resolve Subject
                $subject = null;
                if (!empty($subjectCode)) {
                    $subject = Subject::where('code', $subjectCode)->orWhere('name', $subjectCode)->first();
                }
                if (!$subject && $package && $package->subject) {
                    $subject = $package->subject;
                }
                if (!$subject) {
                    $subject = Subject::firstOrCreate(['name' => 'Umum'], ['code' => 'UMUM']);
                }

                // 4. Create Question Bank Record
                $question = QuestionBank::create([
                    'package_id' => $packageId,
                    'subject_id' => $subject->id,
                    'teacher_id' => $teacherId,
                    'topic' => $topic,
                    'difficulty' => $difficulty,
                    'type' => $type,
                    'content' => $content,
                    'explanation' => $explanation,
                ]);

                // 5. Handle Options for MCQ / True False
                if ($type === 'multiple_choice_single' || $type === 'multiple_choice_multi') {
                    $optionList = [];

                    // Check individual columns pilihan_a, pilihan_b, etc.
                    $colA = $getVal('pilihan_a');
                    $colB = $getVal('pilihan_b');
                    $colC = $getVal('pilihan_c');
                    $colD = $getVal('pilihan_d');
                    $colE = $getVal('pilihan_e');

                    if (!empty($colA) || !empty($colB)) {
                        if (!empty($colA)) $optionList['A'] = $colA;
                        if (!empty($colB)) $optionList['B'] = $colB;
                        if (!empty($colC)) $optionList['C'] = $colC;
                        if (!empty($colD)) $optionList['D'] = $colD;
                        if (!empty($colE)) $optionList['E'] = $colE;
                    } elseif (!empty($getVal('options'))) {
                        // Fallback to pipe-separated options
                        $rawOpts = array_map('trim', explode('|', $getVal('options')));
                        $labels = ['A', 'B', 'C', 'D', 'E'];
                        foreach ($rawOpts as $idx => $opt) {
                            $label = $labels[$idx] ?? chr(65 + $idx);
                            $optionList[$label] = $opt;
                        }
                    }

                    if (empty($optionList)) {
                        $errors[] = "Baris {$rowNum}: Pilihan jawaban (pilihan_a, pilihan_b, dst) belum diisi.";
                        continue;
                    }

                    // Parse correct keys (e.g. 'A', 'A,B', 'B', '2', 'Benar')
                    $rawKeys = array_map('trim', preg_split('/[,;|]/', strtoupper($kunciJawaban)));
                    $optIndex = 1;

                    foreach ($optionList as $label => $optText) {
                        $isCorrect = in_array(strtoupper($label), $rawKeys) ||
                                     in_array(strval($optIndex), $rawKeys) ||
                                     in_array(strtoupper($optText), array_map('strtoupper', $rawKeys));

                        QuestionOption::create([
                            'question_bank_id' => $question->id,
                            'content' => $optText,
                            'is_correct' => $isCorrect,
                            'order' => $optIndex,
                        ]);
                        $optIndex++;
                    }
                } elseif ($type === 'true_false') {
                    $isBenar = in_array(strtolower($kunciJawaban), ['benar', 'true', 'b', '1', 't', 'ya']);
                    QuestionOption::create([
                        'question_bank_id' => $question->id,
                        'content' => 'Benar',
                        'is_correct' => $isBenar,
                        'order' => 1,
                    ]);
                    QuestionOption::create([
                        'question_bank_id' => $question->id,
                        'content' => 'Salah',
                        'is_correct' => !$isBenar,
                        'order' => 2,
                    ]);
                } elseif ($type === 'matching') {
                    // Collect pairs from jodohkan_1..4 and matching_pairs column
                    $pairs = [];
                    foreach (['jodohkan_1', 'jodohkan_2', 'jodohkan_3', 'jodohkan_4'] as $jCol) {
                        $pairVal = $getVal($jCol);
                        if (!empty($pairVal)) $pairs[] = $pairVal;
                    }
                    if (!empty($getVal('matching_pairs'))) {
                        $rawPairs = array_map('trim', explode('|', $getVal('matching_pairs')));
                        $pairs = array_merge($pairs, $rawPairs);
                    }

                    if (empty($pairs)) {
                        $errors[] = "Baris {$rowNum}: Kolom pasangan menjodohkan belum diisi (Format: Kiri : Kanan).";
                        continue;
                    }

                    foreach ($pairs as $pair) {
                        // Delimiters : or = or ->
                        $parts = preg_split('/[:=\->]/', $pair, 2);
                        if (count($parts) === 2 && !empty(trim($parts[0])) && !empty(trim($parts[1]))) {
                            QuestionMatchingPair::create([
                                'question_bank_id' => $question->id,
                                'left_item' => trim($parts[0]),
                                'right_item' => trim($parts[1]),
                            ]);
                        } else {
                            $errors[] = "Baris {$rowNum}: Format pasangan menjodohkan '{$pair}' salah. Gunakan tanda titik dua (contoh: Kiri : Kanan).";
                        }
                    }
                }

                $importedCount++;
            }

            if (!empty($errors)) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Gagal mengimpor karena terdapat kesalahan data.',
                    'errors' => $errors
                ], 422);
            }

            DB::commit();

            if ($packageId) {
                \App\Models\QuestionPackage::find($packageId)?->syncTotalQuestions();
            }

            return response()->json([
                'message' => "Berhasil mengimpor {$importedCount} butir soal ke dalam berkas paket soal.",
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Terjadi kesalahan memproses file: ' . $e->getMessage()
            ], 500);
        }
    }
}
