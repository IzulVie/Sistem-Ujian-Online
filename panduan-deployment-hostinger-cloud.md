# Panduan Deployment & Optimasi — Hostinger Cloud Startup
**Sistem Ujian Online CBT**
*Spesifikasi Target: Hostinger Cloud Startup (4 vCPU, 4GB RAM, 100 PHP Worker, 300 Database Connections, 2.000.000 Inodes)*

---

## 1. Ringkasan Arsitektur Hosting

Dengan spesifikasi **Hostinger Cloud Startup**, sistem ini mampu melayani **300 – 600 siswa serentak (*concurrent users*)**. Agar performa maksimal, kita memisahkan penyimpanan file menjadi dua layer:
1. **Layer Privat (`/home/uXXXX/backend`)**: Berisi seluruh source code Laravel, logic, controller, dan file `.env` (terlindungi dari akses publik).
2. **Layer Publik (`/home/uXXXX/public_html`)**: Berisi bundle build React Vite (`dist/*`), file upload publik (`storage/app/public`), serta file `.htaccess` router.

---

## 2. Langkah 1 — Konfigurasi PHP di hPanel Hostinger

1. Masuk ke **hPanel Hostinger** -> Buka menu **Advanced** -> **PHP Configuration**.
2. Pilih versi **PHP 8.2** atau **PHP 8.3**.
3. Klik tab **PHP Options**, lalu sesuaikan konfigurasi parameter berikut:
   - `memory_limit` : `256M` *(Optimal untuk 100 worker pada RAM 4GB)*
   - `max_execution_time` : `60` *(Cegah request macet menggantung worker)*
   - `upload_max_filesize` : `64M`
   - `post_max_size` : `64M`
   - `max_input_vars` : `5000`
4. Klik tab **PHP Extensions**, pastikan ekstensi berikut dicentang/aktif:
   - `pdo_mysql`, `redis` *(phpredis)*, `mbstring`, `openssl`, `bcmath`, `fileinfo`, `tokenizer`, `xml`, `curl`, `zip`.
5. Pastikan **OPcache** aktif (`opcache.enable = 1`, `opcache.memory_consumption = 128`).

---

## 3. Langkah 2 — Mengaktifkan Redis Object Cache di Hostinger

1. Di dashboard hPanel, masuk ke menu **Performance** -> **Object Cache (Redis)**.
2. Klik tombol **Enable** / **Aktifkan**.
3. Hostinger akan menjalankan Redis server internal di `127.0.0.1:6379`.
4. Konfigurasi ini memungkinkan verifikasi token sesi 500 siswa dibaca langsung dari memori RAM super cepat (< 1ms).

---

## 4. Langkah 3 — Membuat Database MySQL

1. Di hPanel, masuk ke menu **Databases** -> **Management**.
2. Buat database baru:
   - **MySQL Database Name**: contoh `u123456789_cbt`
   - **MySQL Username**: contoh `u123456789_cbtuser`
   - **Password**: Buat password yang kuat dan catat.
3. Buka **phpMyAdmin**, import file backup database Anda atau jalankan migrasi via SSH.

---

## 5. Langkah 4 — Persiapan & Upload File Project

### A. Build Frontend React
Di komputer lokal Anda, jalankan perintah build:
```bash
cd frontend
npm run build
```
File hasil kompilasi yang siap upload akan berada di folder `frontend/dist/`.

### B. Upload Source Code ke File Manager Hostinger
Buka **File Manager** di hPanel Hostinger:

1. **Upload Backend**:
   - Buat folder baru di luar `public_html`, yaitu di: `/home/uXXXX/backend`.
   - Upload seluruh isi folder `backend/` (kecuali folder `node_modules` & `tests`).
   - Salin file `.env.production.example` menjadi `.env`, lalu isi dengan kredensial database & domain Hostinger Anda:
     ```env
     APP_ENV=production
     APP_DEBUG=false
     APP_URL=https://domain-cbt-anda.com

     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=u123456789_cbt
     DB_USERNAME=u123456789_cbtuser
     DB_PASSWORD=PasswordDatabaseAnda

     CACHE_STORE=redis
     SESSION_DRIVER=redis
     QUEUE_CONNECTION=database
     ```
   - Berikan izin write (*Permission 775*) pada folder:
     - `/home/uXXXX/backend/storage`
     - `/home/uXXXX/backend/bootstrap/cache`

2. **Upload Frontend ke `public_html`**:
   - Masuk ke folder `/home/uXXXX/public_html`.
   - Upload seluruh file dan folder dari `frontend/dist/*` langsung ke dalam `public_html/`.
   - Buat symlink storage publik Laravel ke public_html:
     Masuk via SSH dan jalankan:
     ```bash
     cd /home/uXXXX/backend && php artisan storage:link
     ```

---

## 6. Langkah 5 — Konfigurasi `.htaccess` di `public_html`

Buat atau edit file `.htaccess` di dalam `/home/uXXXX/public_html/.htaccess` dengan isi berikut:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # 1. Forward all /api/ requests to Laravel Backend public/index.php
    RewriteRule ^api/(.*)$ /../backend/public/index.php [L,QSA]

    # 2. Forward storage uploaded assets if linked
    RewriteRule ^storage/(.*)$ /../backend/storage/app/public/$1 [L]

    # 3. Serve Frontend React SPA Static Files
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    # 4. Fallback all other routes to React index.html
    RewriteRule ^ index.html [L]
</IfModule>

# Security Headers & Gzip Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
</IfModule>
```

---

## 7. Langkah 6 — Setup Cron Job Hostinger (Background Worker)

Agar penilaian otomatis (*Auto-Grading*) dan pembersihan sesi berjalan otomatis tanpa membebani server secara terus-menerus:

1. Di hPanel Hostinger, buka menu **Advanced** -> **Cron Jobs**.
2. Pilih **Custom**.
3. Masukkan jadwal: `* * * * *` *(Setiap Menit)*.
4. Masukkan perintah command:
   ```bash
   /usr/bin/php /home/uXXXX/backend/artisan schedule:run >> /dev/null 2>&1
   ```
   *(Ganti `uXXXX` dengan username akun hosting Anda yang tertera di sidebar hPanel)*.
5. Klik **Save / Simpan**.

Perintah ini akan secara otomatis memicu `queue:work` dengan batas memori aman 128MB setiap 50 detik sekali.

---

## 8. Langkah 7 — Eksekusi Migrasi & Optimasi Cache Laravel via SSH

Masuk ke terminal SSH Hostinger Anda (menu **Advanced** -> **SSH Access**):

```bash
# 1. Masuk ke direktori backend
cd /home/uXXXX/backend

# 2. Generate Application Key (jika belum ada)
php artisan key:generate --force

# 3. Jalankan Migrasi Database
php artisan migrate --force

# 4. Optimasi Cache Konfigurasi & Route Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Jalankan Pemeriksaan Kesiapan Sistem
php artisan cbt:verify-upgrade
```

---

## 9. Checklist Verifikasi Pra-Ujian di Hostinger

Sebelum hari-H ujian berlangsung:
- [ ] Buka menu Admin CBT -> **Live Monitoring & Proctoring**.
- [ ] Klik tombol **Pre-Flight Diagnosa Sistem**.
- [ ] Pastikan status:
  - **Database**: Status `OK`, Latency `< 2 ms`.
  - **Cache**: Status `OK` *(Redis)*.
  - **Queue Worker**: Status `OK`, Pending `0 jobs`.
  - **Storage**: Izin Write `OK`.
- [ ] Lakukan uji simulasi 1 siswa submit ujian untuk memastikan nilai langsung terkalkulasi secara instan.
