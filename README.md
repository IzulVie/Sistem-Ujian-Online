# 🎓 Sistem CBT Ujian Online (Online Examination System)

Sistem Computer-Based Testing (CBT) modern, responsif, dan aman berbasis **Laravel 12 (RESTful API)** dan **React 18 + Vite + Tailwind CSS**. Dilengkapi sistem pengawasan anti-cheat canggih, manajemen bank soal multi-tipe (termasuk import Word .docx & Excel .csv), penilaian otomatis dan esai manual, serta monitoring real-time live proctoring.

---

## 🚀 Fitur Unggulan

### 1. 🛡️ Keamanan & Anti-Cheat Canggih
- **Single-Session Token Locking**: Mencegah akun siswa digunakan secara bersamaan di lebih dari satu perangkat.
- **Strict Fullscreen Gatekeeper**: Mode layar penuh wajib saat pengerjaan ujian.
- **Tab & Application Switch Limiting**: Memantau perpindahan tab/jendela (Alt+Tab) dengan sistem peringatan bertingkat dan auto-diskualifikasi permanen saat batas tercapai.
- **Anti-Copy & Anti-Inspect Protection**: Memblokir copy (Ctrl+C), cut, drag, select text, inspect element (F12 / Ctrl+Shift+I), dan klik kanan pada lembar soal.
- **Auto-Exit Fullscreen**: Otomatis keluar dari mode layar penuh seketika ujian selesai dikumpulkan.

### 2. 📝 Manajemen Bank Soal & Multi-Format
- **Dukungan 5 Tipe Soal**:
  1. Pilihan Ganda Biasa (A–E)
  2. Pilihan Ganda Kompleks (Multi-Jawaban)
  3. Benar / Salah
  4. Essay / Uraian
  5. Menjodohkan (Matching Pairs)
- **Import Dokumen Microsoft Word (.docx)**: Guru dapat langsung mengunggah naskah soal dari file Word standar.
- **Import Spreadsheet Excel (.csv)**: Mendukung import data massal berbasis tabel Excel.
- **Dukungan Rumus Matematika (LaTeX / KaTeX)** & Format Gambar.

### 3. 👥 Manajemen Multi-Role Lengkap
- **👑 Administrator**: Manajemen master data (Jurusan, Kelas, Siswa, Guru, Mata Pelajaran, Tahun Ajaran) & monitoring global.
- **👨‍🏫 Guru / Pengawas**: Penyusunan paket soal, penjadwalan sesi ujian, penilaian jawaban essay, analisis butir soal, dan Live Monitoring.
- **👨‍🎓 Siswa**: Portal ujian interaktif, autosave lembar jawaban real-time per detik, navigasi nomor soal, ragu-ragu, dan rekap skor akhir.

---

## 🛠️ Tech Stack

- **Backend**: PHP 8.2+ / Laravel 12 / Laravel Sanctum / Spatie Laravel Permission / SQLite & MySQL
- **Frontend**: React 18 / TypeScript / Vite / Tailwind CSS / Lucide Icons / KaTeX
- **Architecture**: Single-Page Application (SPA) + Stateless Tokenized REST API

---

## ⚡ Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat
- PHP >= 8.2 (dengan ekstensi `zip`, `pdo`, `mbstring`)
- Composer
- Node.js >= 18.x & npm

### 2. Setup Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```

### 3. Setup Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Akses aplikasi di browser:
- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`

---

## 📄 Lisensi
Hak Cipta © 2026. Dikembangkan untuk kebutuhan Computer Based Test (CBT) institusi pendidikan.
