# Manual Testing Checklist — RPG Quiz App

> **Cara penggunaan:** Centang `[x]` jika test lulus, `[-]` jika ditemukan bug.  
> **Kolom "Kondisi Normal"** menunjukkan apa yang *seharusnya* terjadi jika tidak ada error.

---

## Persiapan Sebelum Testing

| # | Persiapan | Keterangan |
|---|-----------|------------|
| | Buat minimal **1 akun Admin** di Supabase | NIK + password tersedia |
| | Buat minimal **2 akun Participant** | Dengan area berbeda |
| | Buat minimal **1 akun Supervisor** | Dengan area yang sama dengan salah satu participant |
| | Buat minimal **1 Question Archive** dengan soal (MCQ, Essay) | Untuk testing batch |
| | Buat minimal **1 Batch aktif** + assign participant | Dengan soal Essay minimal 1 |

---

## 1. Autentikasi

### 1.1 Login

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman `/login` tanpa login | Halaman login tampil dengan form NIK & Password, tidak redirect |
| `[ ]` | Submit form dengan NIK dan password **kosong** | Muncul validasi error "NIK required" dan "Password required" di bawah field |
| `[ ]` | Submit dengan NIK valid tapi password **salah** | Muncul pesan error: *"NIK atau password salah..."* |
| `[ ]` | Submit dengan NIK yang **tidak terdaftar** | Muncul pesan error: *"NIK atau password salah..."* |
| `[ ]` | Login dengan akun **Participant** valid | Redirect ke `/` (Homepage), tidak ada loading abadi |
| `[ ]` | Login dengan akun **Admin** valid | Redirect ke `/` (Homepage), tidak ada loading abadi |
| `[ ]` | Login dengan akun **Supervisor** valid | Redirect ke `/` (Homepage), tidak ada loading abadi |
| `[ ]` | Tombol login menampilkan state loading ("Entering...") saat proses | Tombol disabled & teks berubah selama proses, kembali normal jika gagal |
| `[ ]` | User yang sudah login mengakses `/login` | Redirect otomatis ke `/` |

### 1.2 Logout

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik tombol Logout di sidebar / halaman Character | Redirect ke `/login`, session Supabase dihapus |
| `[ ]` | Setelah logout, akses halaman `/` langsung | Redirect ke `/login` |
| `[ ]` | Setelah logout, tekan tombol Back browser | Tidak bisa kembali ke halaman protected (redirect ke login) |

---

## 2. Navigation & Layout

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Sidebar tampil di semua halaman `(main)` untuk desktop | Link aktif ter-highlight sesuai halaman saat ini |
| `[ ]` | Mobile nav tampil di bawah layar pada viewport mobile | 5 icon navigasi tampil: Home, Quests, Character, Leaderboard, Profile |
| `[ ]` | Klik setiap menu navigasi | Berpindah halaman tanpa full reload, URL berubah |
| `[ ]` | Admin yang login mengakses `/admin` | Masuk ke halaman admin dashboard |
| `[ ]` | Participant biasa mengakses `/admin` | Redirect ke `/` atau halaman 403 |

---

## 3. Homepage (`/`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka homepage setelah login (Participant) | Halaman load < 12 detik, menampilkan available quests dan mini leaderboard |
| `[ ]` | Buka homepage setelah **idle** panjang (>5 menit) | Loading tidak abadi — maks 10 detik, lalu tampil data atau empty state |
| `[ ]` | Halaman menampilkan kartu quest yang di-assign ke user | Hanya quest milik user yang tampil (bukan semua quest) |
| `[ ]` | Klik kartu quest yang tersedia | Redirect ke `/exam/[batchId]` |
| `[ ]` | Mini leaderboard menampilkan top 5 hero | Nama, level, dan total score tampil |
| `[ ]` | XP bar di header menampilkan progress XP user | Bar terisi sesuai persentase XP menuju level berikutnya |
| `[ ]` | Tidak ada batch aktif yang di-assign | Muncul empty state "No quests available" (tidak error/crash) |

---

## 4. Quests Page (`/quests`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Quests | List batch tampil dalam < 10 detik |
| `[ ]` | Filter tab **"All"** | Menampilkan semua batch yang di-assign |
| `[ ]` | Filter tab **"Available"** | Hanya batch yang belum selesai/belum mulai tampil |
| `[ ]` | Filter tab **"Completed"** | Hanya batch yang sudah selesai dikerjakan tampil |
| `[ ]` | Badge status pada kartu batch sesuai kondisi | "Available" / "Completed" / "Timed Out" tampil dengan warna tepat |
| `[ ]` | Klik **"Start Quest"** pada batch yang available | Redirect ke `/exam/[batchId]` |
| `[ ]` | Klik **"Review"** pada batch yang sudah completed | Redirect ke `/review/[batchId]` |
| `[ ]` | Batch dengan `end_time` sudah lewat tidak tampil | Expired batch ter-filter otomatis |

---

## 5. Exam Page (`/exam/[batchId]`)

### 5.1 Akses & Inisialisasi

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Akses batch yang **valid & aktif** | Halaman exam load, soal pertama tampil |
| `[ ]` | Akses batch yang **sudah expired** | Muncul error: *"The exam window for this quest has closed."* |
| `[ ]` | Akses batch yang **belum mulai** | Muncul error: *"This exam hasn't started yet. It opens in X minutes."* |
| `[ ]` | Akses batch dengan **working_hours_only** di luar jam kerja | Muncul error: *"This exam is only accessible during working hours..."* |
| `[ ]` | Participant yang **tidak di-assign** ke batch mencoba akses | Muncul error / redirect |
| `[ ]` | Timer countdown tampil di sudut kanan | Angka hitung mundur berjalan sesuai waktu |
| `[ ]` | Refresh halaman di tengah exam | Timer melanjutkan dari sisa waktu yang tersisa (tidak reset) |

### 5.2 Menjawab Soal

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Pilih jawaban soal **Multiple Choice** | Opsi terpilih ter-highlight, tombol "Submit Answer" aktif |
| `[ ]` | Submit jawaban MCQ | Feedback benar/salah muncul sesaat, skor terupdate |
| `[ ]` | Pilih jawaban soal **True/False** | Hanya 2 opsi (Benar/Salah), satu bisa dipilih |
| `[ ]` | Pilih jawaban soal **Binary (Ya/Tidak)** | Hanya 2 opsi, satu bisa dipilih |
| `[ ]` | Pilih jawaban soal **Checkbox** (multi-select) | Beberapa opsi bisa dipilih sekaligus |
| `[ ]` | Submit jawaban Checkbox | Feedback "partial" / "correct" muncul sesuai jawaban |
| `[ ]` | Isi teks soal **Essay** | Text area menerima input, tidak ada batasan ketat |
| `[ ]` | Submit jawaban Essay | Status "submitted" muncul, soal ter-mark sebagai selesai |
| `[ ]` | Navigasi ke soal berikutnya dengan tombol Next | Soal berikutnya tampil, progress bar update |
| `[ ]` | Navigasi ke soal sebelumnya dengan tombol Prev | Soal sebelumnya tampil dengan jawaban yang sudah diisi |
| `[ ]` | Indikator progress soal (misal: "3 / 10") | Nomor soal terkini dan total soal tampil akurat |

### 5.3 Menyelesaikan Exam

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik tombol **"Finish Exam"** | Dialog konfirmasi muncul sebelum submit |
| `[ ]` | Konfirmasi finish exam | Semua jawaban tersimpan, tampil halaman hasil |
| `[ ]` | Hasil exam menampilkan skor, XP, streak | Angka-angka tampil dengan benar |
| `[ ]` | **Timer habis** sebelum selesai | Exam otomatis di-submit, tampil halaman hasil dengan status "Timed Out" |
| `[ ]` | Klik tombol **"Review Answers"** di halaman hasil | Redirect ke `/review/[batchId]` |
| `[ ]` | Klik tombol **"Back to Home"** di halaman hasil | Redirect ke `/` |
| `[ ]` | Mencoba akses exam yang sudah **completed** | Langsung tampil halaman hasil (tidak bisa mengerjakan ulang) |

---

## 6. Review Page (`/review/[batchId]`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman review setelah exam selesai | Semua jawaban tampil dengan status benar/salah |
| `[ ]` | Soal MCQ yang benar | Icon centang hijau, poin tampil |
| `[ ]` | Soal MCQ yang salah | Icon silang merah, jawaban benar di-highlight |
| `[ ]` | Soal Essay yang **belum dinilai** | Status "Awaiting grading" tampil |
| `[ ]` | Soal Essay yang **sudah dinilai** | Skor graded tampil (realtime update jika supervisor baru menilai) |
| `[ ]` | Total skor & XP di bagian atas | Akumulasi dari semua jawaban |

---

## 7. Character Page (`/character`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Character | Sprite karakter tampil, stats (STR/INT/AGI) tampil sesuai class |
| `[ ]` | Klik panah kiri/kanan untuk memutar karakter | Karakter berputar 8 arah (0°–315°) |
| `[ ]` | Klik tombol **"Customise"** | Panel kustomisasi muncul dengan tabs |
| `[ ]` | Ganti **Gender** | Preview karakter di panel berubah real-time |
| `[ ]` | Ganti **Hair** | Preview karakter berubah sesuai pilihan |
| `[ ]` | Ganti **Outfit** | Preview berubah, nama karakter ikut berubah |
| `[ ]` | Ganti **Accessory** | Preview berubah |
| `[ ]` | Ganti **Weapon** | Preview berubah |
| `[ ]` | Klik **"Save Changes"** | Loading sesaat, toast sukses, karakter tersimpan ke database |
| `[ ]` | Refresh halaman setelah save | Karakter yang baru tersimpan tampil (bukan default) |
| `[ ]` | Klik **"Cancel"** sebelum save | Karakter kembali ke konfigurasi sebelumnya |
| `[ ]` | Level, XP bar, dan title tampil di panel info | Data akurat sesuai profil participant |

---

## 8. Profile Page (`/profile`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Profile | Data nama, NIK, jabatan, area, level, XP tampil |
| `[ ]` | Ganti password dengan **password saat ini salah** | Error: *"Password saat ini salah."* |
| `[ ]` | Ganti password dengan **konfirmasi tidak cocok** | Error: *"Konfirmasi password tidak cocok."* |
| `[ ]` | Ganti password dengan **password baru < 6 karakter** | Error: *"Password baru minimal 6 karakter."* |
| `[ ]` | Ganti password dengan **password baru = password lama** | Error: *"Password baru harus berbeda dari password saat ini."* |
| `[ ]` | Ganti password dengan semua input **valid** | Sukses: *"Password berhasil diperbarui."*, field di-clear |
| `[ ]` | Login ulang dengan password baru | Login berhasil |
| `[ ]` | Upload foto > 1MB | Error: *"Ukuran foto maksimal 1MB."* |
| `[ ]` | Upload foto valid (< 1MB, format JPG/PNG) | Foto tampil sebagai preview, setelah save tampil di profil |

---

## 9. Inventory Page (`/inventory`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Inventory | Badge dan achievement tampil dalam < 10 detik |
| `[ ]` | Badge dari exam **completed** | Badge tampil dengan nama batch dan rarity sesuai skor |
| `[ ]` | Badge dari exam **timed_out** | Badge tampil dengan icon timer |
| `[ ]` | Achievements based on stats | Misal: "First Steps" tampil jika `quizzes_taken >= 1` |
| `[ ]` | User belum pernah ikut exam | Empty state tampil, tidak crash |

---

## 10. Leaderboard Page (`/leaderboard`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Leaderboard | Data ranking tampil dalam < 10 detik |
| `[ ]` | Podium top 3 tampil | Urutan: 2nd (kiri) → 1st (tengah) → 3rd (kanan) |
| `[ ]` | List rank 4 ke bawah tampil di bawah podium | Nama, level, skor tampil per baris |
| `[ ]` | User sendiri ter-highlight di leaderboard | Baris user dengan warna berbeda / badge "You" |
| `[ ]` | Jika koneksi timeout (> 10 detik) | Pesan error dengan tombol **"Coba Lagi"** tampil, bukan loading abadi |
| `[ ]` | Klik **"Coba Lagi"** setelah error | Leaderboard di-reload ulang |
| `[ ]` | Buka setelah idle > 5 menit | Tidak loading abadi, maks 10 detik lalu data atau error state tampil |

---

## 11. Supervisor Page (`/supervisor`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Login sebagai **Participant biasa** dan akses `/supervisor` | Redirect ke `/` (akses ditolak) |
| `[ ]` | Login sebagai **Supervisor** dan buka halaman | Essay task dari area supervisor tampil dalam < 10 detik |
| `[ ]` | Login sebagai **Admin** dan buka halaman | Semua essay task dari semua area tampil |
| `[ ]` | Filter **"Ungraded Only"** | Hanya essay yang belum dinilai tampil |
| `[ ]` | Filter **"Show All"** | Semua essay tampil (graded dan ungraded) |
| `[ ]` | Isi skor essay dan klik **"Save Score"** | Loading sesaat, sukses, status berubah menjadi graded |
| `[ ]` | Isi skor melebihi **poin maksimal soal** | Error atau validasi muncul |
| `[ ]` | Skor yang disimpan muncul di halaman Review peserta | Data ter-update realtime (tanpa refresh) |
| `[ ]` | Tidak ada essay untuk dinilai | Empty state tampil, tidak crash |

---

## 12. Admin — Dashboard (`/admin`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman admin dashboard | Dalam < 10 detik: kartu stats tampil (total batches, participants, dll.) |
| `[ ]` | Stat cards menampilkan angka sesuai data | "Active Heroes" = jumlah participant aktif |
| `[ ]` | Tabel **Recent Activity** tampil | 10 aktivitas exam terbaru tampil |
| `[ ]` | Klik tombol **"New Quest"** | Redirect ke `/admin/batches` |
| `[ ]` | Koneksi timeout saat load | Skeleton loading tidak stuck — setelah 10 detik tampil 0 / empty state |

---

## 13. Admin — Batches (`/admin/batches`)

### 13.1 View & Load

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Batches | List batch tampil dalam < 10 detik |
| `[ ]` | Setelah idle panjang, buka halaman | Tidak loading abadi, maks 10 detik |

### 13.2 Create Batch

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"New Batch"** | Form batch muncul |
| `[ ]` | Submit form dengan field **Name kosong** | Validasi error tampil di bawah field |
| `[ ]` | Isi semua field wajib dan submit | Batch baru muncul di list, form tertutup |
| `[ ]` | Set `start_time` dan `end_time` | Batch hanya aktif dalam rentang waktu tersebut |

### 13.3 Edit Batch

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Edit"** pada batch | Form pre-filled dengan data batch |
| `[ ]` | Ubah nama dan save | Nama batch terupdate di list |
| `[ ]` | Toggle **Active/Inactive** | Status batch berubah |

### 13.4 Delete Batch

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Delete"** pada batch | Dialog konfirmasi muncul |
| `[ ]` | Konfirmasi delete | Batch hilang dari list |
| `[ ]` | Cancel delete | Tidak ada perubahan |

### 13.5 Manage Participants in Batch

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Manage Participants"** pada batch | Panel assignment participant muncul |
| `[ ]` | Assign participant ke batch | Participant masuk ke list assigned |
| `[ ]` | Remove participant dari batch | Participant hilang dari list assigned |

### 13.6 Manage Archives / Question Settings

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Pilih Question Archive untuk batch | Daftar archive tersedia untuk dipilih |
| `[ ]` | Set jumlah soal per tipe | Input angka bisa diisi |
| `[ ]` | Klik **"Generate Questions"** | Soal digenerate dari archive ke batch, konfirmasi sukses tampil |

### 13.7 Duplicate Batch

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Duplicate"** pada batch | Batch baru dengan nama sama + "(copy)" muncul di list |

---

## 14. Admin — Questions (`/admin/questions`)

### 14.1 Load & Filter

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Questions | Dropdown batch tampil dalam < 10 detik |
| `[ ]` | Pilih batch dari dropdown | List soal batch tersebut tampil dalam < 10 detik |
| `[ ]` | Cari soal dengan search bar | List ter-filter realtime sesuai kata kunci |
| `[ ]` | Filter berdasarkan Category | Hanya soal kategori tersebut tampil |
| `[ ]` | Filter berdasarkan Difficulty | Hanya soal dengan difficulty tersebut tampil |

### 14.2 Create Question Manual

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Add Question"** | Form soal muncul |
| `[ ]` | Pilih tipe **Multiple Choice** | 4 field opsi A-D tampil dengan pilihan "Correct Answer" |
| `[ ]` | Pilih tipe **True/False** | Hanya 2 opsi (Benar/Salah) tampil |
| `[ ]` | Pilih tipe **Binary** | Hanya 2 opsi (Ya/Tidak) tampil |
| `[ ]` | Pilih tipe **Checkbox** | Multiple opsi dengan toggle "correct" per opsi |
| `[ ]` | Pilih tipe **Essay** | Tidak ada field opsi, hanya soal + poin |
| `[ ]` | Submit tanpa mengisi teks soal | Validasi error tampil |
| `[ ]` | Submit soal valid | Soal muncul di list |

### 14.3 Edit & Delete Question

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Edit"** pada soal | Form pre-filled, bisa diubah |
| `[ ]` | Save edit | Perubahan tersimpan, tampil di list |
| `[ ]` | Klik **"Delete"** pada soal | Dialog konfirmasi muncul |
| `[ ]` | Konfirmasi delete | Soal hilang dari list |

### 14.4 Upload via Excel

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Upload file **bukan Excel (.xlsx)** | Error: format file tidak valid |
| `[ ]` | Upload file Excel dengan format **kolom salah** | Error dengan keterangan kolom yang salah |
| `[ ]` | Upload file Excel valid | Soal berhasil diimport, jumlah soal tampil di notifikasi sukses |

### 14.5 Delete All Questions in Batch

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Delete All Questions"** | Dialog konfirmasi muncul |
| `[ ]` | Konfirmasi | Semua soal batch terhapus |

---

## 15. Admin — Participants (`/admin/participants`)

### 15.1 Load & Search

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Participants | List participant tampil dalam < 10 detik |
| `[ ]` | Ketik di search bar | List ter-filter by nama / NIK |

### 15.2 Create Participant

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Add Participant"** | Form muncul |
| `[ ]` | Submit dengan NIK yang **sudah terdaftar** | Error: NIK sudah digunakan |
| `[ ]` | Submit dengan semua field valid | Participant baru muncul di list |
| `[ ]` | Participant baru bisa login | Login dengan NIK sebagai username dan NIK sebagai password (default) |

### 15.3 Edit Participant

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Edit"** pada participant | Form pre-filled |
| `[ ]` | Ubah nama / area / jabatan dan save | Data terupdate di list |
| `[ ]` | Ubah **role** menjadi Supervisor | Role berubah |

### 15.4 Delete Participant

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Delete"** | Dialog konfirmasi muncul |
| `[ ]` | Konfirmasi delete | Participant hilang dari list, akun auth juga terhapus |

### 15.5 Reset Password

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Reset Password"** pada participant | Dialog konfirmasi muncul |
| `[ ]` | Konfirmasi reset | Password direset ke default (NIK), konfirmasi sukses tampil |
| `[ ]` | Participant login dengan password lama setelah reset | Login gagal |
| `[ ]` | Participant login dengan **NIK sebagai password** setelah reset | Login berhasil |

### 15.6 Reset Progress

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Reset Progress"** pada participant | Dialog konfirmasi muncul |
| `[ ]` | Konfirmasi reset | XP, level, skor participant direset ke 0 |

### 15.7 Upload via Excel

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Upload file Excel participant valid | Participant berhasil diimport massal, jumlah tampil di notifikasi |
| `[ ]` | Upload file dengan NIK duplikat | Error atau warning untuk NIK yang sudah ada |

---

## 16. Admin — Results (`/admin/results`)

### 16.1 Load & Filter

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Results | Dropdown batch tampil dalam < 10 detik |
| `[ ]` | Pilih batch | Tabel hasil exam tampil dalam < 10 detik |
| `[ ]` | Pilih **"All Batches"** (kosong) | Semua hasil dari semua batch tampil |
| `[ ]` | Ketik di search bar | Tabel ter-filter by nama participant |

### 16.2 Drill-down Detail

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik nama participant di tabel | Panel detail terbuka dengan daftar jawaban per soal |
| `[ ]` | Jawaban benar/salah tampil | Icon dan warna sesuai status |
| `[ ]` | Tutup panel drill-down | Panel tertutup |

### 16.3 Export

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Export Excel"** tanpa memilih batch | Alert: "Please select a batch first" |
| `[ ]` | Klik **"Export Excel"** dengan batch terpilih | File `.xlsx` terdownload dengan data hasil |
| `[ ]` | Buka file Excel hasil export | Kolom: No, Peserta, Batch, Score, XP, Status, dll. lengkap |
| `[ ]` | Klik **"Export to Google Sheets"** | Input Spreadsheet ID tampil |
| `[ ]` | Isi Spreadsheet ID valid dan submit | Data ter-export ke Google Sheets, konfirmasi sukses |

### 16.4 Reset Results

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Reset Results"** tanpa pilih batch | Tombol disabled / alert |
| `[ ]` | Pilih batch, klik Reset, konfirmasi | Semua exam session dan jawaban batch terhapus |
| `[ ]` | Setelah reset, tabel kosong | Tidak ada data tersisa |

---

## 17. Admin — Analytics (`/admin/analytics`)

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Analytics | Dropdown batch tampil dalam < 10 detik |
| `[ ]` | Pilih batch yang **belum ada datanya** | Pesan "no data" atau angka 0 tampil, tidak crash |
| `[ ]` | Pilih batch yang punya data | Kartu overview tampil: Total Participants, Completed, Avg Score, Avg Accuracy |
| `[ ]` | Tabel **Difficulty Breakdown** tampil | Persentase akurasi per level kesulitan |
| `[ ]` | Tabel **Per-Question Analytics** tampil | Jumlah attempt, akurasi, dan avg time per soal |
| `[ ]` | Tabel **Category Breakdown** tampil | Performa per kategori soal |
| `[ ]` | Timeout saat load analytics | Tidak loading abadi, maks 10 detik, lalu tampil 0 / empty |

---

## 18. Admin — Question Archives (`/admin/question-archives`)

### 18.1 Load

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka halaman Question Archives | List archive tampil dalam < 10 detik |
| `[ ]` | Klik salah satu archive | List soal archive tersebut tampil dalam < 10 detik |

### 18.2 Archive CRUD

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"New Archive"** | Form nama + deskripsi muncul |
| `[ ]` | Submit archive baru | Archive muncul di list kiri |
| `[ ]` | Edit nama archive | Nama terupdate |
| `[ ]` | Delete archive | Archive hilang dari list |

### 18.3 Question CRUD di Archive

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Klik **"Add Question"** pada archive terpilih | Form soal muncul |
| `[ ]` | Tambah soal MCQ, T/F, Binary, Checkbox, Essay | Masing-masing soal tersimpan dengan opsi yang benar |
| `[ ]` | Edit soal di archive | Perubahan tersimpan |
| `[ ]` | Delete soal di archive | Soal hilang |

### 18.4 Upload via Excel

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Upload file Excel soal ke archive | Soal berhasil diimport massal |
| `[ ]` | Download **Template Excel** | File template terdownload dengan contoh format |
| `[ ]` | Upload file Excel dengan format salah | Error keterangan format yang diharapkan |

### 18.5 Search & Filter

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Cari soal di archive dengan search bar | Ter-filter realtime |
| `[ ]` | Filter berdasarkan tipe soal | Hanya soal tipe tersebut tampil |
| `[ ]` | Filter berdasarkan difficulty | Hanya soal difficulty tersebut tampil |

---

## 19. Skenario Idle / Timeout

> Bagian ini khusus menguji perbaikan **loading abadi** yang telah dilakukan.

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | Buka tab browser, **tidak lakukan apapun 10+ menit**, lalu navigate ke halaman manapun | Halaman load dalam maks 10 detik atau menampilkan empty state / error state — **tidak loading selamanya** |
| `[ ]` | Buka halaman admin (questions, batches, participants, results) setelah idle | Data tampil dalam maks 10 detik, atau spinner berhenti |
| `[ ]` | Buka leaderboard setelah idle | Error state dengan tombol "Coba Lagi" muncul jika gagal — tidak stuck |
| `[ ]` | Buka homepage / quests setelah idle | Empty state tampil, bukan loading abadi |
| `[ ]` | Buka halaman supervisor setelah idle | Tasks tampil atau empty state, bukan spinner abadi |
| `[ ]` | Matikan internet, navigasi ke halaman apapun | Error atau empty state dalam maks 15 detik (global timeout) |
| `[ ]` | Hidupkan kembali internet, klik refresh/retry | Halaman load normal kembali |

---

## 20. Pengujian Lintas Role

| # | Test Case | Kondisi Normal |
|---|-----------|----------------|
| `[ ]` | **Participant** mencoba akses `/admin/*` | Redirect ke `/` |
| `[ ]` | **Participant** mencoba akses `/supervisor` | Redirect ke `/` |
| `[ ]` | **Supervisor** mencoba akses `/admin/*` | Redirect ke `/` |
| `[ ]` | **Supervisor** akses `/supervisor` | Berhasil, hanya melihat essay dari areanya |
| `[ ]` | **Admin** akses `/supervisor` | Berhasil, melihat semua essay |
| `[ ]` | **Admin** akses `/admin/*` | Semua halaman admin dapat diakses |
| `[ ]` | **Admin** akses `/quests` | Melihat semua batch aktif (tidak difilter per participant) |

---

## Catatan Bug

Gunakan tabel ini untuk mencatat semua bug yang ditemukan selama testing.

| No | Halaman | Langkah Reproduksi | Perilaku Aktual | Perilaku yang Diharapkan | Severity |
|----|---------|-------------------|-----------------|--------------------------|----------|
| 1  |         |                   |                 |                          |          |
| 2  |         |                   |                 |                          |          |
| 3  |         |                   |                 |                          |          |

**Severity:**  
- 🔴 **Critical** — Fitur utama tidak bisa digunakan  
- 🟠 **High** — Fitur bisa digunakan tapi ada data salah / crash  
- 🟡 **Medium** — UX buruk tapi bisa di-workaround  
- 🟢 **Low** — Kosmetik / minor  
