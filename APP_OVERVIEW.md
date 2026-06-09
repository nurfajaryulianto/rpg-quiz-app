# RPG Quiz App — Feature & Page Overview

> Aplikasi platform kuis gamifikasi berbasis RPG, dibangun dengan **Next.js 14 + Supabase + Zustand**.
> Ditujukan untuk pelatihan / ujian karyawan dengan nuansa game RPG pixel-art.

---

## Daftar Halaman

### Halaman Publik

| Route | File | Deskripsi |
|-------|------|-----------|
| `/login` | `src/app/login/page.tsx` | Halaman autentikasi menggunakan NIK (Nomor Induk Karyawan) sebagai username |
| `/create-character` | `src/app/create-character/page.tsx` | Halaman pembuatan karakter RPG pertama kali setelah registrasi |

---

### Halaman Peserta `(main)/`

Semua halaman ini memerlukan login dan dibungkus `AppShell` (sidebar + topbar + mobile nav).

| Route | File | Deskripsi |
|-------|------|-----------|
| `/` | `src/app/(main)/page.tsx` | **Dashboard** — sambutan, ujian aktif, stats cepat (skor, XP, ujian selesai), 3 besar leaderboard, tombol mulai ujian |
| `/quests` | `src/app/(main)/quests/page.tsx` | **Daftar Ujian (Quest)** — browse semua batch ujian, filter (semua / tersedia / selesai), status akses, jendela waktu, tombol mulai |
| `/leaderboard` | `src/app/(main)/leaderboard/page.tsx` | **Papan Peringkat** — podium top-3, tabel peringkat lengkap dengan nama, level, skor total, XP, dan avatar |
| `/character` | `src/app/(main)/character/page.tsx` | **Karakter** — kustomisasi karakter RPG (gender, rambut, outfit, aksesoris, senjata), pemilihan kelas, tampilan stat STR/INT/AGI |
| `/inventory` | `src/app/(main)/inventory/page.tsx` | **Inventori / Pencapaian** — badge ujian yang sudah diselesaikan, achievement terbuka berdasarkan pencapaian (level, skor, jumlah ujian) |
| `/profile` | `src/app/(main)/profile/page.tsx` | **Profil** — ganti password, upload foto avatar, informasi akun |
| `/supervisor` | `src/app/(main)/supervisor/page.tsx` | **Panel Supervisor** — tampilkan dan nilai essay dari peserta yang diawasi (khusus role supervisor & admin) |
| `/exam/[batchId]` | `src/app/exam/[batchId]/page.tsx` | **Halaman Ujian** — antarmuka soal (MCQ, Benar/Salah, Ya/Tidak, Checkbox, Essay), timer, navigasi soal, streak, kirim jawaban |
| `/review/[batchId]` | `src/app/review/[batchId]/page.tsx` | **Review Jawaban** — pembahasan pasca-ujian: semua soal, jawaban peserta, jawaban benar, rincian skor & XP |

---

### Halaman Admin `admin/`

Memerlukan role **admin**. Layout terpisah tanpa AppShell peserta.

| Route | File | Deskripsi |
|-------|------|-----------|
| `/admin` | `src/app/admin/page.tsx` | **Dashboard Admin (Guild Master)** — statistik utama (heroes aktif, total batch, total soal), aktivitas ujian terbaru, navigasi ke sub-halaman |
| `/admin/batches` | `src/app/admin/batches/page.tsx` | **Manajemen Batch** — CRUD batch ujian, atur durasi & jendela waktu, status aktif, randomisasi soal, batas percobaan, bank soal & pengaturan soal per tipe |
| `/admin/questions` | `src/app/admin/questions/page.tsx` | **Manajemen Soal** — CRUD soal per batch, import massal via Excel, multi-tipe soal, tingkat kesulitan, poin, kategori |
| `/admin/participants` | `src/app/admin/participants/page.tsx` | **Manajemen Peserta** — daftar akun, registrasi massal dari Excel, assign batch, reset password, atur role |
| `/admin/results` | `src/app/admin/results/page.tsx` | **Hasil & Analitik** — hasil sesi ujian per batch, statistik performa, export ke Google Sheets |
| `/admin/analytics` | `src/app/admin/analytics/page.tsx` | **Analitik Detail** — grafik dan statistik mendalam per batch dan peserta |
| `/admin/question-archives` | `src/app/admin/question-archives/page.tsx` | **Bank Soal (Arsip)** — kelola arsip soal, import soal dari Excel ke bank soal, link bank soal ke batch |

---

## Daftar Fitur

### 🎮 Gamifikasi

| Fitur | Detail |
|-------|--------|
| **Level & XP** | Sistem level 1–20 dengan threshold XP eksponensial (0 hingga 52.000 XP di level 20) |
| **Streak** | Jawaban benar berturut-turut meningkatkan multiplier bonus XP |
| **Achievement Badge** | Terbuka otomatis berdasarkan pencapaian: ujian pertama, veteran, rising star, elite warrior, score master |
| **Papan Peringkat** | Peringkat global berdasarkan `total_score`, podium top-3 dengan tampilan avatar |
| **Gelar Level** | Tiap level memiliki gelar RPG (Novice → Apprentice → Warrior → … → Legendary) |

---

### 🧑‍🎨 Sistem Karakter RPG

| Fitur | Detail |
|-------|--------|
| **Kustomisasi Avatar** | Pixel art, pilihan gender, 5+ variasi rambut/outfit/aksesoris/senjata per gender |
| **Sistem Kelas** | Fighter (STR tinggi), Apprentice (INT tinggi), Scout (AGI tinggi) |
| **Stat Karakter** | STR, INT, AGI ditentukan oleh kelas dan level |
| **Sprite Viewer** | Pratinjau karakter 8 arah dengan animasi rotasi |

---

### 📋 Sistem Ujian

| Fitur | Detail |
|-------|--------|
| **Tipe Soal** | Multiple Choice, Benar/Salah, Ya/Tidak (Binary), Checkbox (multi-pilih), Essay |
| **Timer Wall-Clock** | Timer berbasis waktu nyata, tidak terpengaruh throttling background tab |
| **Resume Ujian** | Peserta bisa tutup dan lanjutkan ujian tanpa kehilangan jawaban |
| **Pengacakan Soal** | Soal diacak per peserta *dalam kelompok tipe* (MCQ tetap bersama, Binary tetap bersama) |
| **Pengacakan Opsi** | Pilihan jawaban diacak tiap sesi untuk MCQ |
| **Batas Percobaan** | Admin dapat mengatur maksimal percobaan; percobaan pertama saja yang masuk leaderboard |
| **Pembatasan Waktu Akses** | Batch bisa dikunci jam kerja (Senin–Jumat 07:00–16:00) atau jendela tanggal tertentu |
| **Navigasi Soal** | Panel navigasi dengan indikator terjawab/belum, header tipe soal saat batch multi-tipe |
| **Soal Essay** | Dikirim peserta, dinilai manual oleh supervisor; skor diperbarui setelah penilaian |
| **Scoring** | Poin dasar + bonus XP berdasarkan streak dan sisa waktu |

---

### 🗃️ Bank Soal & Manajemen Batch

| Fitur | Detail |
|-------|--------|
| **Bank Soal (Arsip)** | Kelola koleksi soal terpisah dari batch ujian |
| **Import Excel** | Upload file Excel untuk soal (MCQ, essay, binary, dll.) ke bank soal |
| **Pengaturan Soal per Tipe** | Admin menentukan jumlah soal & poin per tipe (PG, Binary, dll.) untuk tiap batch |
| **Generate Otomatis** | Soal di-generate dari bank soal sesuai konfigurasi tipe & tingkat kesulitan, diurutkan per tipe |
| **Warning Pool Kosong** | Muncul peringatan jika tipe soal yang dikonfigurasi tidak tersedia di bank soal |

---

### 👨‍💼 Panel Admin

| Fitur | Detail |
|-------|--------|
| **CRUD Batch** | Buat, edit, hapus batch ujian dengan semua konfigurasi |
| **CRUD Soal** | Tambah, edit, hapus soal dan pilihan jawaban, import massal via Excel |
| **Manajemen Peserta** | Registrasi massal, assign batch, reset password, atur role |
| **Nilai Essay** | Supervisor memberi poin ke essay; skor sesi dan total peserta otomatis diperbarui |
| **Export ke Google Sheets** | Ekspor hasil ujian batch ke spreadsheet via Google Sheets API |
| **Statistik** | Dashboard statistik ringkas (heroes aktif, batch, soal, aktivitas terbaru) |
| **Duplikasi Batch** | Salin batch beserta konfigurasinya sebagai template |

---

### 🔒 Keamanan & Autentikasi

| Fitur | Detail |
|-------|--------|
| **Login via NIK** | Email diformat dari NIK (`NIK@domain.com`) untuk autentikasi Supabase |
| **Single-Device Login** | Session nonce di DB + Supabase Realtime — login di perangkat baru otomatis logout perangkat lama |
| **Role-Based Access** | participant / supervisor / admin dengan RLS di level database |
| **Row-Level Security** | Peserta hanya akses data sendiri; supervisor/admin akses lebih luas |
| **Middleware** | Next.js middleware melindungi semua route yang memerlukan autentikasi |

---

## API Routes

| Route | Method | Deskripsi |
|-------|--------|-----------|
| `/api/auth/register` | POST | Registrasi satu atau banyak peserta (buat akun Supabase Auth + profil peserta) |
| `/api/admin/reset-password` | POST | Reset password peserta oleh admin |
| `/api/admin/update-participant` | POST | Update data peserta (nama, area, role, dll.) oleh admin |
| `/api/admin/export-to-sheets` | POST | Ekspor hasil batch ke Google Sheets menggunakan service account |

---

## Entitas Database

| Tabel | Kegunaan |
|-------|----------|
| `participants` | Profil pengguna dengan atribut RPG (level, XP, skor, avatar, role) |
| `batches` | Sesi ujian dengan konfigurasi waktu, randomisasi, dan batas percobaan |
| `questions` | Soal ujian per batch (semua tipe) |
| `options` | Pilihan jawaban untuk soal |
| `answers` | Respons peserta dengan poin, XP, dan data streak |
| `exam_sessions` | Rekam jejak sesi ujian per percobaan (status, skor, urutan soal acak) |
| `batch_participants` | Mapping peserta yang di-assign ke batch tertentu |
| `question_archives` | Koleksi bank soal (arsip) |
| `archive_questions` | Soal di dalam bank soal |
| `archive_options` | Pilihan jawaban untuk soal di bank soal |
| `batch_archives` | Link antara batch dan bank soal yang digunakan |
| `batch_question_settings` | Konfigurasi jumlah soal & poin per tipe per batch |

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database & Auth | Supabase (PostgreSQL + Auth + Realtime) |
| State Management | Zustand |
| UI | Tailwind CSS + Framer Motion |
| Form | React Hook Form |
| Excel Import | SheetJS (xlsx) |
| Charts | (Recharts / custom) |
| Spreadsheet Export | Google Sheets API (service account) |

---

*Terakhir diperbarui: Mei 2026*
