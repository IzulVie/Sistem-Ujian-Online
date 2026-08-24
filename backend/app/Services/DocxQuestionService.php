<?php

namespace App\Services;

use ZipArchive;
use SimpleXMLElement;
use Exception;

class DocxQuestionService
{
    /**
     * Parse a .docx Word document file into structured question items
     *
     * @param string $filePath
     * @return array
     * @throws Exception
     */
    public function parseDocx(string $filePath): array
    {
        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new Exception('Gagal membuka berkas Word (.docx). Pastikan berkas tidak rusak atau terproteksi password.');
        }

        $xmlContent = $zip->getFromName('word/document.xml');
        $zip->close();

        if (!$xmlContent) {
            throw new Exception('Format dokumen Word tidak valid (word/document.xml tidak ditemukan).');
        }

        $paragraphs = $this->extractParagraphsAndTables($xmlContent);
        return $this->parseParagraphsToQuestions($paragraphs);
    }

    /**
     * Extract text paragraphs and table rows from document.xml
     */
    protected function extractParagraphsAndTables(string $xmlContent): array
    {
        // Suppress XML lib warnings for robust parsing
        $xml = @simplexml_load_string($xmlContent);
        if (!$xml) {
            // Fallback: strip tags with newline separation
            $clean = preg_replace('/<\/w:p>/', "\n", $xmlContent);
            $clean = preg_replace('/<\/w:tr>/', "\n", $clean);
            $clean = strip_tags($clean);
            $lines = explode("\n", $clean);
            return array_values(array_filter(array_map('trim', $lines)));
        }

        $xml->registerXPathNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        
        $elements = $xml->xpath('//w:body/*');
        $results = [];

        foreach ($elements as $el) {
            $name = $el->getName();
            if ($name === 'p') {
                $text = $this->getTextFromNode($el);
                if (trim($text) !== '') {
                    $results[] = trim($text);
                }
            } elseif ($name === 'tbl') {
                // Parse table rows
                $rows = $el->xpath('.//w:tr');
                foreach ($rows as $r) {
                    $cells = $r->xpath('.//w:tc');
                    $cellTexts = [];
                    foreach ($cells as $c) {
                        $cellTexts[] = trim($this->getTextFromNode($c));
                    }
                    if (!empty(array_filter($cellTexts))) {
                        $results[] = implode(' | ', $cellTexts);
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Helper to concatenate all <w:t> text nodes inside an XML element
     */
    protected function getTextFromNode(SimpleXMLElement $node): string
    {
        $node->registerXPathNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
        $textNodes = $node->xpath('.//w:t');
        $str = '';
        if ($textNodes) {
            foreach ($textNodes as $t) {
                $str .= (string) $t;
            }
        }
        return $str;
    }

    /**
     * Parse array of extracted lines into structured questions
     */
    public function parseParagraphsToQuestions(array $lines): array
    {
        $questions = [];
        $currentQuestion = null;
        $inInstructionSection = false;

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '') continue;

            // Detect section headers
            if (preg_match('/^(?:PETUNJUK|PANDUAN|INSTRUKSI|CARA\s+PENGISIAN)/i', $trimmed)) {
                $inInstructionSection = true;
                continue;
            }

            if (preg_match('/^(?:CONTOH|DAFTAR\s+SOAL|SOAL|MULAI|---)/i', $trimmed)) {
                $inInstructionSection = false;
                continue;
            }

            // Ignore template title and instructions
            if (preg_match('/^(===|---|TEMPLATE|PANDUAN|PETUNJUK|BANK SOAL)/i', $trimmed)) {
                continue;
            }

            // If inside instruction section, skip instruction bullet items (e.g. "1. Tuliskan ...")
            if ($inInstructionSection) {
                if (preg_match('/^(?:\d+[\.\)]|•|\-)\s*(?:Tuliskan|Gunakan|Tentukan|Tambahkan|Pastikan|Format)/i', $trimmed)) {
                    continue;
                }
            }

            // Detect Question Numbering: e.g. "1. Soal...", "1) Soal...", "Soal 1:", "[1] Soal..."
            if (preg_match('/^(?:(?:Soal|No\.?|Pertanyaan)\s*)?\[?(\d+)[\.\)\]]\s*(.+)$/i', $trimmed, $matches)) {
                $qText = trim($matches[2]);
                
                // Skip if this is an instruction numbered item
                if (preg_match('/^(?:Tuliskan|Gunakan|Tentukan|Tambahkan|Pastikan|Format)/i', $qText) && count($questions) === 0) {
                    continue;
                }

                if ($currentQuestion && !empty($currentQuestion['content'])) {
                    $finalized = $this->finalizeQuestion($currentQuestion);
                    if ($finalized) {
                        $questions[] = $finalized;
                    }
                }

                $currentQuestion = [
                    'number' => (int) $matches[1],
                    'content' => $qText,
                    'type' => 'pilihan_ganda', // default type
                    'difficulty' => 'sedang',
                    'topic' => null,
                    'explanation' => null,
                    'options' => [],
                    'key_raw' => null,
                    'matching_pairs' => [],
                    'explicit_type' => false,
                ];
                continue;
            }

            if (!$currentQuestion) {
                // If question hasn't started yet, check if this line is question 1 without number
                if (count($questions) === 0 && !preg_match('/^(TIPE|KUNCI|PEMBAHASAN|TOPIK|KESULITAN|BOBOT|PASANGAN|[A-E][\.\)])/i', $trimmed) && !preg_match('/^(?:Template|Sistem|Panduan|Petunjuk)/i', $trimmed)) {
                    $currentQuestion = [
                        'number' => 1,
                        'content' => $trimmed,
                        'type' => 'pilihan_ganda',
                        'difficulty' => 'sedang',
                        'topic' => null,
                        'explanation' => null,
                        'options' => [],
                        'key_raw' => null,
                        'matching_pairs' => [],
                        'explicit_type' => false,
                    ];
                }
                continue;
            }

            // Detect Metadata Tags
            if (preg_match('/^(?:TIPE|TYPE)\s*[:=]\s*(.+)$/i', $trimmed, $m)) {
                $rawType = strtolower(trim($m[1]));
                $currentQuestion['type'] = $this->normalizeQuestionType($rawType);
                $currentQuestion['explicit_type'] = true;
                continue;
            }

            if (preg_match('/^(?:KUNCI|KUNCI JAWABAN|KEY|ANSWER)\s*[:=]\s*(.+)$/i', $trimmed, $m)) {
                $currentQuestion['key_raw'] = trim($m[1]);
                continue;
            }

            if (preg_match('/^(?:PEMBAHASAN|EXPLANATION|PENJELASAN)\s*[:=]\s*(.+)$/i', $trimmed, $m)) {
                $currentQuestion['explanation'] = trim($m[1]);
                continue;
            }

            if (preg_match('/^(?:TOPIK|TOPIC|KATEGORI)\s*[:=]\s*(.+)$/i', $trimmed, $m)) {
                $currentQuestion['topic'] = trim($m[1]);
                continue;
            }

            if (preg_match('/^(?:KESULITAN|DIFFICULTY|TINGKAT)\s*[:=]\s*(.+)$/i', $trimmed, $m)) {
                $rawDiff = strtolower(trim($m[1]));
                if (str_contains($rawDiff, 'mudah') || str_contains($rawDiff, 'easy')) $currentQuestion['difficulty'] = 'mudah';
                elseif (str_contains($rawDiff, 'sulit') || str_contains($rawDiff, 'hard')) $currentQuestion['difficulty'] = 'sulit';
                else $currentQuestion['difficulty'] = 'sedang';
                continue;
            }

            // Detect Matching Pairs: e.g. "PASANGAN: Python : Ular" or "JODOH: Java : Secangkir Kopi" or "1. Kiri : Kanan"
            if (preg_match('/^(?:PASANGAN|JODOH(?:KAN)?)\s*[:=]\s*(.+)$/i', $trimmed, $m)) {
                $pairStr = trim($m[1]);
                if (str_contains($pairStr, ':')) {
                    $parts = explode(':', $pairStr, 2);
                    $currentQuestion['matching_pairs'][] = [
                        'left_item' => trim($parts[0]),
                        'right_item' => trim($parts[1]),
                    ];
                    $currentQuestion['type'] = 'menjodohkan';
                    $currentQuestion['explicit_type'] = true;
                }
                continue;
            }

            // Detect Options: A. / A) / [A] / (A) / a.
            if (preg_match('/^[\(\[]?([A-Ea-e])[\.\)\]]\s*(.+)$/', $trimmed, $m)) {
                $optLabel = strtoupper($m[1]);
                $optText = trim($m[2]);
                $currentQuestion['options'][$optLabel] = $optText;
                continue;
            }

            // Matching pair in format: "Kiri : Kanan" while question type is menjodohkan
            if ($currentQuestion['type'] === 'menjodohkan' && str_contains($trimmed, ':')) {
                $parts = explode(':', $trimmed, 2);
                if (count($parts) === 2 && !empty(trim($parts[0])) && !empty(trim($parts[1]))) {
                    $currentQuestion['matching_pairs'][] = [
                        'left_item' => trim($parts[0]),
                        'right_item' => trim($parts[1]),
                    ];
                    continue;
                }
            }

            // Otherwise, append to question content (multi-line question body)
            if (empty($currentQuestion['options']) && empty($currentQuestion['matching_pairs']) && empty($currentQuestion['key_raw'])) {
                $currentQuestion['content'] .= "\n" . $trimmed;
            }
        }

        // Finalize last question
        if ($currentQuestion && !empty($currentQuestion['content'])) {
            $finalized = $this->finalizeQuestion($currentQuestion);
            if ($finalized) {
                $questions[] = $finalized;
            }
        }

        return $questions;
    }

    /**
     * Normalize question type strings
     */
    protected function normalizeQuestionType(string $rawType): string
    {
        $raw = strtolower(trim($rawType));
        if (str_contains($raw, 'kompleks') || str_contains($raw, 'multi') || str_contains($raw, 'ganda_kompleks')) {
            return 'pilihan_ganda_kompleks';
        }
        if (str_contains($raw, 'benar') || str_contains($raw, 'salah') || str_contains($raw, 'true') || str_contains($raw, 'false')) {
            return 'benar_salah';
        }
        if (str_contains($raw, 'essay') || str_contains($raw, 'esai') || str_contains($raw, 'uraian')) {
            return 'essay';
        }
        if (str_contains($raw, 'jodoh') || str_contains($raw, 'matching') || str_contains($raw, 'pasangan')) {
            return 'menjodohkan';
        }
        return 'pilihan_ganda';
    }

    /**
     * Finalize question attributes and resolve option keys
     */
    protected function finalizeQuestion(array $q): ?array
    {
        $type = $q['type'];
        $keyRaw = $q['key_raw'];

        // Auto-infer question type if options exist
        if (count($q['options']) > 0 && $type === 'pilihan_ganda') {
            // If key contains multiple letters like "A, B" or "A, C, D", change to pilihan_ganda_kompleks
            if ($keyRaw && preg_match('/[A-E]\s*,\s*[A-E]/i', $keyRaw)) {
                $type = 'pilihan_ganda_kompleks';
            }
        }

        if (count($q['matching_pairs']) > 0) {
            $type = 'menjodohkan';
        }

        $formattedOptions = [];
        $correctKeys = [];

        if ($keyRaw) {
            // Split keys by comma or space
            $keys = preg_split('/[\s,]+/', strtoupper($keyRaw));
            $correctKeys = array_map('trim', array_filter($keys));
        }

        if ($type === 'pilihan_ganda' || $type === 'pilihan_ganda_kompleks') {
            $optOrder = 1;
            foreach ($q['options'] as $label => $optText) {
                $isCorrect = in_array($label, $correctKeys);
                $formattedOptions[] = [
                    'label' => $label,
                    'text' => $optText,
                    'is_correct' => $isCorrect,
                    'order' => $optOrder++
                ];
            }
        } elseif ($type === 'benar_salah') {
            $isBenar = $keyRaw ? (str_contains(strtolower($keyRaw), 'benar') || str_contains(strtolower($keyRaw), 'true') || strtoupper($keyRaw) === 'B' || strtoupper($keyRaw) === 'T') : true;
            $formattedOptions = [
                ['label' => 'A', 'text' => 'Benar', 'is_correct' => $isBenar, 'order' => 1],
                ['label' => 'B', 'text' => 'Salah', 'is_correct' => !$isBenar, 'order' => 2],
            ];
        }

        if (($type === 'pilihan_ganda' || $type === 'pilihan_ganda_kompleks') && count($formattedOptions) === 0 && empty($q['matching_pairs']) && empty($q['explicit_type'])) {
            return null;
        }

        return [
            'content' => $q['content'],
            'type' => $type,
            'difficulty' => $q['difficulty'] ?? 'sedang',
            'topic' => $q['topic'] ?? null,
            'explanation' => $q['explanation'] ?? null,
            'options' => $formattedOptions,
            'matching_pairs' => $q['matching_pairs'] ?? [],
            'essay_sample_answer' => ($type === 'essay') ? $keyRaw : null,
        ];
    }

    /**
     * Generate a pristine Microsoft Word (.docx) template file bytes
     *
     * @return string Binary .docx content
     */
    public function generateWordTemplate(): string
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'docx_tpl_');
        $zip = new ZipArchive();
        $zip->open($tempFile, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // [Content_Types].xml
        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' .
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' .
            '<Default Extension="xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' .
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' .
            '</Types>';
        $zip->addFromString('[Content_Types].xml', $contentTypes);

        // _rels/.rels
        $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' .
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' .
            '</Relationships>';
        $zip->addFromString('_rels/.rels', $rels);

        // word/document.xml with complete examples and styling
        $documentXml = $this->buildTemplateDocumentXml();
        $zip->addFromString('word/document.xml', $documentXml);

        $zip->close();
        $content = file_get_contents($tempFile);
        @unlink($tempFile);

        return $content;
    }

    /**
     * Construct OpenXML content for the Word Template
     */
    protected function buildTemplateDocumentXml(): string
    {
        $paragraphs = [
            // Title Banner
            ['text' => 'TEMPLATE RESMI IMPORT SOAL CBT (MICROSOFT WORD)', 'bold' => true, 'size' => 32, 'color' => '2563EB', 'align' => 'center'],
            ['text' => 'Sistem CBT Ujian Online — Panduan & Format Penulisan Butir Soal', 'italic' => true, 'size' => 20, 'color' => '4B5563', 'align' => 'center'],
            ['text' => '', 'size' => 16],

            // Section 1: Instructions
            ['text' => 'PETUNJUK PENGISIAN:', 'bold' => true, 'size' => 24, 'color' => '1E3A8A'],
            ['text' => '1. Tuliskan nomor soal di awal pertanyaan, contoh: "1. Teks soal..."', 'size' => 20],
            ['text' => '2. Tuliskan opsi pilihan ganda dengan huruf A, B, C, D, E.', 'size' => 20],
            ['text' => '3. Tentukan kunci jawaban dengan format "KUNCI: [Huruf Kunci]" (contoh: KUNCI: B).', 'size' => 20],
            ['text' => '4. Tambahkan informasi opsional seperti TIPE, TOPIK, KESULITAN, dan PEMBAHASAN.', 'size' => 20],
            ['text' => '----------------------------------------------------------------------------------', 'color' => 'D1D5DB', 'size' => 18],
            ['text' => '', 'size' => 16],

            // Section 2: Examples
            ['text' => 'CONTOH BUTIR SOAL:', 'bold' => true, 'size' => 24, 'color' => '1E3A8A'],
            ['text' => '', 'size' => 16],

            // Question 1: Multiple Choice
            ['text' => '1. Berapakah hasil dari perhitungan 15 + 27 ?', 'bold' => true, 'size' => 22, 'color' => '111827'],
            ['text' => 'TOPIK: Aritmatika Dasar', 'italic' => true, 'size' => 18, 'color' => '6B7280'],
            ['text' => 'KESULITAN: mudah', 'italic' => true, 'size' => 18, 'color' => '6B7280'],
            ['text' => 'A. 40', 'size' => 20],
            ['text' => 'B. 42', 'size' => 20],
            ['text' => 'C. 45', 'size' => 20],
            ['text' => 'D. 48', 'size' => 20],
            ['text' => 'E. 50', 'size' => 20],
            ['text' => 'KUNCI: B', 'bold' => true, 'size' => 20, 'color' => '059669'],
            ['text' => 'PEMBAHASAN: Hasil dari 15 + 27 = 42.', 'size' => 18, 'color' => '4B5563'],
            ['text' => '', 'size' => 16],

            // Question 2: Complex Multiple Choice
            ['text' => '2. Pilihlah semua bilangan yang merupakan bilangan prima di bawah 10!', 'bold' => true, 'size' => 22, 'color' => '111827'],
            ['text' => 'TIPE: pilihan_ganda_kompleks', 'bold' => true, 'size' => 18, 'color' => 'D97706'],
            ['text' => 'TOPIK: Bilangan', 'italic' => true, 'size' => 18, 'color' => '6B7280'],
            ['text' => 'A. 2', 'size' => 20],
            ['text' => 'B. 3', 'size' => 20],
            ['text' => 'C. 4', 'size' => 20],
            ['text' => 'D. 9', 'size' => 20],
            ['text' => 'E. 5', 'size' => 20],
            ['text' => 'KUNCI: A, B, E', 'bold' => true, 'size' => 20, 'color' => '059669'],
            ['text' => 'PEMBAHASAN: 2, 3, dan 5 adalah bilangan prima karena hanya memiliki 2 faktor.', 'size' => 18, 'color' => '4B5563'],
            ['text' => '', 'size' => 16],

            // Question 3: True / False
            ['text' => '3. Sudut siku-siku memiliki besar tepat 90 derajat.', 'bold' => true, 'size' => 22, 'color' => '111827'],
            ['text' => 'TIPE: benar_salah', 'bold' => true, 'size' => 18, 'color' => 'D97706'],
            ['text' => 'TOPIK: Geometri', 'italic' => true, 'size' => 18, 'color' => '6B7280'],
            ['text' => 'KUNCI: Benar', 'bold' => true, 'size' => 20, 'color' => '059669'],
            ['text' => 'PEMBAHASAN: Sesuai definisi matematis, sudut siku-siku selalu berukuran 90 derajat.', 'size' => 18, 'color' => '4B5563'],
            ['text' => '', 'size' => 16],

            // Question 4: Essay
            ['text' => '4. Jelaskan secara singkat proses fotosintesis pada tumbuhan hijau!', 'bold' => true, 'size' => 22, 'color' => '111827'],
            ['text' => 'TIPE: essay', 'bold' => true, 'size' => 18, 'color' => 'D97706'],
            ['text' => 'TOPIK: Biologi', 'italic' => true, 'size' => 18, 'color' => '6B7280'],
            ['text' => 'KUNCI: Proses pembuatan makanan oleh tumbuhan menggunakan karbon dioksida dan air dengan bantuan cahaya matahari dan klorofil untuk menghasilkan glukosa dan oksigen.', 'size' => 18, 'color' => '059669'],
            ['text' => 'PEMBAHASAN: Fotosintesis terdiri dari reaksi terang dan reaksi gelap di dalam kloroplas.', 'size' => 18, 'color' => '4B5563'],
            ['text' => '', 'size' => 16],

            // Question 5: Matching
            ['text' => '5. Pasangkanlah bahasa pemrograman berikut dengan logonya masing-masing!', 'bold' => true, 'size' => 22, 'color' => '111827'],
            ['text' => 'TIPE: menjodohkan', 'bold' => true, 'size' => 18, 'color' => 'D97706'],
            ['text' => 'PASANGAN: Python : Ular', 'size' => 20],
            ['text' => 'PASANGAN: Java : Secangkir Kopi', 'size' => 20],
            ['text' => 'PASANGAN: PHP : Gajah', 'size' => 20],
            ['text' => 'PASANGAN: JavaScript : Huruf JS Kuning', 'size' => 20],
            ['text' => 'PEMBAHASAN: Pasangan maskot resmi bahasa pemrograman.', 'size' => 18, 'color' => '4B5563'],
        ];

        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' .
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' .
            '<w:body>';

        foreach ($paragraphs as $p) {
            $xml .= '<w:p>';
            $pPr = '<w:pPr>';
            if (isset($p['align'])) {
                $pPr .= '<w:jc w:val="' . $p['align'] . '"/>';
            }
            $pPr .= '<w:spacing w:after="120" w:line="240" w:lineRule="auto"/>';
            $pPr .= '</w:pPr>';
            $xml .= $pPr;

            $xml .= '<w:r>';
            $rPr = '<w:rPr>';
            if (!empty($p['bold'])) $rPr .= '<w:b/>';
            if (!empty($p['italic'])) $rPr .= '<w:i/>';
            if (!empty($p['size'])) $rPr .= '<w:sz w:val="' . $p['size'] . '"/>';
            if (!empty($p['color'])) $rPr .= '<w:color w:val="' . $p['color'] . '"/>';
            $rPr .= '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>';
            $rPr .= '</w:rPr>';
            $xml .= $rPr;

            $escapedText = htmlspecialchars($p['text'], ENT_XML1, 'UTF-8');
            $xml .= '<w:t xml:space="preserve">' . $escapedText . '</w:t>';
            $xml .= '</w:r>';
            $xml .= '</w:p>';
        }

        $xml .= '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>';
        $xml .= '</w:body></w:document>';

        return $xml;
    }
}
