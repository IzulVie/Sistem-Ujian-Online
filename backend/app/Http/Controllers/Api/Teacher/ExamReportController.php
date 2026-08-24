<?php

namespace App\Http\Controllers\Api\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\StudentExamAttempt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExamReportController extends Controller
{
    /**
     * Get comprehensive exam report and analytics
     */
    public function getExamReport(Request $request, $examId)
    {
        $exam = Exam::with(['subject', 'academicYear', 'package', 'questions'])
            ->findOrFail($examId);

        $kkm = $exam->kkm_score ?? 75;

        // Fetch all attempts for this exam with related data
        $attempts = StudentExamAttempt::where('exam_id', $examId)
            ->with([
                'student.user',
                'student.classRoom',
                'student.major',
                'answers.questionBank',
                'violations',
                'examGroup'
            ])
            ->get();

        $totalQuestions = $exam->questions->count();
        $totalWeight = $exam->questions->sum(fn($q) => $q->pivot->weight ?? 1) ?: 1;

        // Calculate Overview Statistics
        $totalParticipants = $attempts->count();
        $completedAttempts = $attempts->whereIn('status', ['submitted', 'auto_submitted']);
        $disqualifiedAttempts = $attempts->where('status', 'disqualified');
        $inProgressAttempts = $attempts->where('status', 'in_progress');
        $notStartedCount = $attempts->where('status', 'not_started')->count();

        $scores = $attempts->whereNotNull('total_score')->pluck('total_score')->map(fn($s) => (float)$s)->values();

        $avgScore = $scores->count() > 0 ? round($scores->avg(), 2) : 0;
        $maxScore = $scores->count() > 0 ? round($scores->max(), 2) : 0;
        $minScore = $scores->count() > 0 ? round($scores->min(), 2) : 0;

        $passedCount = $scores->filter(fn($s) => $s >= $kkm)->count();
        $remedialCount = $scores->filter(fn($s) => $s < $kkm)->count();
        $passRate = $scores->count() > 0 ? round(($passedCount / $scores->count()) * 100, 1) : 0;

        // Score Distribution Ranges
        $distribution = [
            'range_0_20' => $scores->filter(fn($s) => $s >= 0 && $s <= 20)->count(),
            'range_21_40' => $scores->filter(fn($s) => $s > 20 && $s <= 40)->count(),
            'range_41_60' => $scores->filter(fn($s) => $s > 40 && $s <= 60)->count(),
            'range_61_80' => $scores->filter(fn($s) => $s > 60 && $s <= 80)->count(),
            'range_81_100' => $scores->filter(fn($s) => $s > 80 && $s <= 100)->count(),
        ];

        // Format Student Rankings and Scores List
        $sortedAttempts = $attempts->sortByDesc(function ($att) {
            return $att->total_score ?? -1;
        })->values();

        $studentsReport = [];
        $rank = 1;

        foreach ($sortedAttempts as $att) {
            $student = $att->student;
            $user = $student?->user;

            $durationMinutes = null;
            if ($att->started_at && $att->submitted_at) {
                $durationMinutes = round($att->started_at->diffInMinutes($att->submitted_at), 1);
            }

            // Count correct / incorrect / empty answers
            $answeredCount = $att->answers->count();
            $correctCount = 0;
            $incorrectCount = 0;

            foreach ($att->answers as $ans) {
                if ($ans->score !== null && $ans->score > 0) {
                    $correctCount++;
                } else {
                    $incorrectCount++;
                }
            }

            $unansweredCount = max(0, $totalQuestions - $answeredCount);
            $score = $att->total_score !== null ? (float)$att->total_score : null;
            $isPassed = $score !== null ? ($score >= $kkm) : false;

            $studentsReport[] = [
                'rank' => $rank++,
                'attempt_id' => $att->id,
                'student_id' => $student?->id,
                'name' => $user?->name ?? 'Siswa Tanpa Nama',
                'username' => $user?->username ?? '-',
                'nisn' => $student?->nisn ?? '-',
                'nis' => $student?->nis ?? '-',
                'class_name' => $student?->classRoom?->name ?? 'Semua Kelas',
                'major_name' => $student?->major?->name ?? '-',
                'status' => $att->status,
                'total_score' => $score,
                'is_passed' => $isPassed,
                'started_at' => $att->started_at?->format('Y-m-d H:i:s'),
                'submitted_at' => $att->submitted_at?->format('Y-m-d H:i:s'),
                'duration_minutes' => $durationMinutes,
                'correct_count' => $correctCount,
                'incorrect_count' => $incorrectCount,
                'unanswered_count' => $unansweredCount,
                'violation_count' => $att->violations->count(),
            ];
        }

        // Calculate Question Item Analysis (Analisis Butir Soal)
        $questionsAnalysis = [];
        $totalSubmittedAttempts = max(1, $completedAttempts->count() + $disqualifiedAttempts->count());

        foreach ($exam->questions as $index => $q) {
            $questionAnswers = DB::table('student_answers')
                ->join('student_exam_attempts', 'student_answers.attempt_id', '=', 'student_exam_attempts.id')
                ->where('student_exam_attempts.exam_id', $examId)
                ->where('student_answers.question_bank_id', $q->id)
                ->get();

            $totalAnswered = $questionAnswers->count();
            $correctCount = $questionAnswers->filter(fn($a) => $a->score !== null && $a->score > 0)->count();
            $incorrectCount = $questionAnswers->filter(fn($a) => $a->score === null || $a->score == 0)->count();
            $unansweredCount = max(0, $totalSubmittedAttempts - $totalAnswered);

            $accuracyRate = round(($correctCount / $totalSubmittedAttempts) * 100, 1);

            // Determine difficulty status
            $category = 'Sedang';
            if ($accuracyRate >= 80) {
                $category = 'Mudah';
            } elseif ($accuracyRate <= 40) {
                $category = 'Sukar / Sulit';
            }

            $questionsAnalysis[] = [
                'number' => $index + 1,
                'question_id' => $q->id,
                'type' => $q->type,
                'content_preview' => mb_substr(strip_tags($q->content), 0, 100) . '...',
                'topic' => $q->topic ?? 'Umum',
                'difficulty' => $q->difficulty,
                'weight' => $q->pivot->weight ?? 1,
                'total_answered' => $totalAnswered,
                'correct_count' => $correctCount,
                'incorrect_count' => $incorrectCount,
                'unanswered_count' => $unansweredCount,
                'accuracy_rate' => $accuracyRate,
                'performance_category' => $category,
            ];
        }

        return response()->json([
            'exam' => [
                'id' => $exam->id,
                'title' => $exam->title,
                'subject_name' => $exam->subject?->name ?? 'Semua Mapel',
                'subject_code' => $exam->subject?->code ?? '-',
                'academic_year' => $exam->academicYear?->name ?? '-',
                'duration_minutes' => $exam->duration_minutes,
                'start_time' => $exam->start_time?->format('Y-m-d H:i:s'),
                'end_time' => $exam->end_time?->format('Y-m-d H:i:s'),
                'kkm_score' => $kkm,
                'status' => $exam->status,
                'total_questions' => $totalQuestions,
                'total_weight' => $totalWeight,
            ],
            'statistics' => [
                'total_participants' => $totalParticipants,
                'completed_count' => $completedAttempts->count(),
                'in_progress_count' => $inProgressAttempts->count(),
                'disqualified_count' => $disqualifiedAttempts->count(),
                'not_started_count' => $notStartedCount,
                'average_score' => $avgScore,
                'highest_score' => $maxScore,
                'lowest_score' => $minScore,
                'passed_count' => $passedCount,
                'remedial_count' => $remedialCount,
                'pass_rate_percent' => $passRate,
                'score_distribution' => $distribution,
            ],
            'students' => $studentsReport,
            'item_analysis' => $questionsAnalysis,
        ]);
    }

    /**
     * Export student exam scores to beautifully formatted Microsoft Excel (.xls SpreadsheetML)
     */
    public function exportCsv(Request $request, $examId): StreamedResponse
    {
        $exam = Exam::with(['subject', 'academicYear'])->findOrFail($examId);
        $kkm = $exam->kkm_score ?? 75;

        $attempts = StudentExamAttempt::where('exam_id', $examId)
            ->with(['student.user', 'student.classRoom', 'violations', 'answers'])
            ->get()
            ->sortByDesc(fn($a) => $a->total_score ?? -1)
            ->values();

        $scores = $attempts->whereNotNull('total_score')->pluck('total_score')->map(fn($s) => (float)$s);
        $avgScore = $scores->count() > 0 ? round($scores->avg(), 2) : 0;
        $maxScore = $scores->count() > 0 ? round($scores->max(), 2) : 0;
        $minScore = $scores->count() > 0 ? round($scores->min(), 2) : 0;
        $passedCount = $scores->filter(fn($s) => $s >= $kkm)->count();
        $passRate = $scores->count() > 0 ? round(($passedCount / $scores->count()) * 100, 1) : 0;

        $cleanTitle = preg_replace('/[^A-Za-z0-9_\-]/', '_', $exam->title);
        $filename = 'Laporan_Hasil_Ujian_' . $cleanTitle . '_' . date('Ymd_His') . '.xls';

        $headers = [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($exam, $attempts, $kkm, $avgScore, $maxScore, $minScore, $passedCount, $passRate) {
            $xmlEscape = function ($str) {
                return htmlspecialchars((string)$str, ENT_XML1, 'UTF-8');
            };

            echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            echo '<?mso-application progid="Excel.Sheet"?>' . "\n";
            ?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="MainTitle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1E1B4B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaHeader">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="MetaValue">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4338CA" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#312E81"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#312E81"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#312E81"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#312E81"/>
   </Borders>
  </Style>
  <Style ss:ID="CellRank">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellText">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellCenter">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CellScore">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusPassed">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BBF7D0"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusRemedial">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusDisqualified">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FECACA"/>
   </Borders>
  </Style>
  <Style ss:ID="FooterRow">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#94A3B8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Rekap Nilai Ujian">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="45"/>
   <Column ss:Width="110"/>
   <Column ss:Width="80"/>
   <Column ss:Width="180"/>
   <Column ss:Width="95"/>
   <Column ss:Width="80"/>
   <Column ss:Width="120"/>
   <Column ss:Width="110"/>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="80"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="85"/>

   <!-- Document Title -->
   <Row ss:Height="26">
    <Cell ss:MergeAcross="13" ss:StyleID="MainTitle"><Data ss:Type="String">REKAPITULASI HASIL UJIAN CBT</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="13" ss:StyleID="SubTitle"><Data ss:Type="String">Sistem Ujian Online CBT &amp; Pengawasan Proctoring — <?= $xmlEscape(date('d F Y H:i')) ?></Data></Cell>
   </Row>
   <Row ss:Height="10"></Row>

   <!-- Exam Metadata Box -->
   <Row ss:Height="20">
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Nama Ujian</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $xmlEscape($exam->title) ?></Data></Cell>
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Rata-Rata Nilai</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $avgScore ?></Data></Cell>
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Lulus KKM</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $passedCount ?> Siswa (<?= $passRate ?>%)</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Mata Pelajaran</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $xmlEscape($exam->subject?->name ?? 'Umum') ?></Data></Cell>
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Nilai Tertinggi</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $maxScore ?></Data></Cell>
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Total Peserta</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $attempts->count() ?> Siswa</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Standar KKM</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $kkm ?> Poin</Data></Cell>
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Nilai Terendah</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $minScore ?></Data></Cell>
    <Cell ss:StyleID="MetaHeader"><Data ss:Type="String">Durasi Ujian</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String"><?= $exam->duration_minutes ?> Menit</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- Main Table Header -->
   <Row ss:Height="26">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Rank</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">NISN</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">NIS</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nama Lengkap Siswa</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Kelas</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nilai Akhir</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status Kelulusan</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status Ujian</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Benar</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Salah</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Pelanggaran</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Waktu Mulai</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Waktu Selesai</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Durasi (Mnt)</Data></Cell>
   </Row>

   <!-- Students Data Rows -->
   <?php
   $rank = 1;
   foreach ($attempts as $att) {
       $score = $att->total_score !== null ? (float)$att->total_score : null;
       $statusStyle = 'StatusRemedial';
       $statusLabel = 'REMEDIAL';

       if ($att->status === 'disqualified') {
           $statusStyle = 'StatusDisqualified';
           $statusLabel = 'DISKUALIFIKASI';
       } elseif ($score !== null && $score >= $kkm) {
           $statusStyle = 'StatusPassed';
           $statusLabel = 'LULUS';
       }

       $correctCount = $att->answers->filter(fn($a) => $a->score !== null && $a->score > 0)->count();
       $incorrectCount = $att->answers->filter(fn($a) => $a->score === null || $a->score == 0)->count();

       $duration = null;
       if ($att->started_at && $att->submitted_at) {
           $duration = round($att->started_at->diffInMinutes($att->submitted_at), 1);
       }
   ?>
   <Row ss:Height="22">
    <Cell ss:StyleID="CellRank"><Data ss:Type="Number"><?= $rank++ ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $xmlEscape($att->student?->nisn ?? '-') ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $xmlEscape($att->student?->nis ?? '-') ?></Data></Cell>
    <Cell ss:StyleID="CellText"><Data ss:Type="String"><?= $xmlEscape($att->student?->user?->name ?? 'Siswa') ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $xmlEscape($att->student?->classRoom?->name ?? '-') ?></Data></Cell>
    <Cell ss:StyleID="CellScore"><Data ss:Type="Number"><?= $score !== null ? $score : 0 ?></Data></Cell>
    <Cell ss:StyleID="<?= $statusStyle ?>"><Data ss:Type="String"><?= $statusLabel ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $xmlEscape(ucfirst(str_replace('_', ' ', $att->status))) ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number"><?= $correctCount ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number"><?= $incorrectCount ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number"><?= $att->violations->count() ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $att->started_at ? $att->started_at->format('d/m/Y H:i:s') : '-' ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $att->submitted_at ? $att->submitted_at->format('d/m/Y H:i:s') : '-' ?></Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String"><?= $duration !== null ? $duration : '-' ?></Data></Cell>
   </Row>
   <?php } ?>

  </Table>
 </Worksheet>
</Workbook>
<?php
        }, 200, $headers);
    }
}
