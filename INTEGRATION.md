# Constrack — setup integrasi untuk testing

Aplikasi sekarang membutuhkan **Next.js server**, Supabase, dan (untuk AI) Gemini. Tidak lagi menggunakan static export atau menyimpan data pekerjaan di localStorage.

## 1. Ambil source dan install

```bash
git pull origin main
npm install
```

Gunakan Node.js 22 LTS atau lebih baru. `npm run dev` memakai Webpack untuk menghindari masalah batas Client Component yang sebelumnya muncul di Turbopack.

## 2. Siapkan Supabase

1. Buat project Supabase milikmu.
2. Buka SQL Editor. Jalankan seluruh `supabase/migrations/001_workspace.sql` **sekali** pada project baru. Migration membuat tabel, Row Level Security, RPC undangan/quota, dan publikasi realtime.
3. Dari project settings, ambil **Project URL** dan **publishable/anon key**. Jangan gunakan service-role key.
4. Di Authentication → URL Configuration, isi Site URL `http://localhost:3000` dan tambahkan redirect URLs:
   - `http://localhost:3000/login/`
   - `http://localhost:3000/app/dashboard/`
     Jika memakai `127.0.0.1`, tambahkan URL setara dan gunakan hostname yang sama sepanjang login.
5. Aktifkan email/password. Jika konfirmasi email aktif, konfirmasikan akun sebelum login. Konfigurasi SMTP Supabase bila diperlukan untuk email verifikasi dan reset password; pengiriman bergantung pada batas layanan proyekmu.
6. Opsional: aktifkan Google di Authentication → Providers, isi Google OAuth client ID/secret, dan daftarkan callback URL yang ditampilkan Supabase di Google Cloud. Tanpa ini, gunakan email/password.

## 3. Isi environment lokal

Salin `.env.example` menjadi `.env.local`. Pada PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Pada Git Bash/macOS/Linux:

```bash
cp .env.example .env.local
```

Isi:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_KAMU.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=PUBLIC_KEY_DARI_SUPABASE
GEMINI_API_KEY=KEY_DARI_GOOGLE_AI_STUDIO
GEMINI_MODEL=MODEL_GENERATE_CONTENT_YANG_TERSEDIA_DI_PROJECT_KAMU
```

`GEMINI_MODEL` harus model yang mendukung `generateContent` dan structured JSON output. Pilih model yang masih tersedia dan sesuai kuota project Google-mu. Aplikasi tidak menjamin pemakaian gratis; batas dan biaya mengikuti akun/model yang dipilih. API key Gemini hanya digunakan oleh route server, tidak memiliki prefix `NEXT_PUBLIC_`. Jangan commit `.env.local`.

## 4. Jalankan

```bash
npm run dev
```

Buka `http://localhost:3000/login/`, buat akun, dan login. Workspace baru dimulai kosong. Data demo browser sebelumnya tidak otomatis diunggah.

- Buat board, tambahkan task, lalu tunggu status **Saved to Supabase** sebelum menutup halaman.
- Board, task, status, subtask, prioritas, label, due date, dan assignee tersimpan di Supabase.
- Profile name tersimpan di Supabase Auth. Email ditampilkan read-only; assignment memakai user ID agar perubahan nama tidak memutus tugas.
- Team menampilkan anggota sungguhan. Owner dapat membuat link undangan sekali pakai yang kedaluwarsa dalam 24 jam. Bagikan secara manual. Undangan memberi akses ke **semua board dalam workspace**, bukan hanya satu board.
- Untuk mengundang orang dari komputer lain, gunakan origin yang dapat mereka akses; link `localhost` hanya cocok untuk akun/browser lain pada komputer yang sama. Hosting publik belum dikonfigurasi oleh perubahan ini.
- Penerima bisa membuka link, login/register, lalu bergabung; alternatifnya tempel link/kode pada halaman Team setelah login. Link tidak mengirim email otomatis.
- Realtime memperbarui data setelah perubahan; polling setiap 15 detik dan saat fokus membantu bila sambungan realtime terputus.
- Gemini: pilih board, Generate tasks / Break down a task / Summarize board progress. Data board dikirim ke Google setelah tombol Generate ditekan. Review proposal lalu Apply. Generate tidak otomatis menulis task.
- Summary merangkum kondisi board saat ini, bukan riwayat sprint historis. Maksimal 100 task dikirim per ringkasan. AI dibatasi 10 permintaan per menit per akun, selain kuota Google.

## 5. Pengujian

```bash
npm test
npm run typecheck
npm run build
npm start
```

Tes otomatis menjalankan PostgreSQL melalui PGlite untuk menguji RLS antar-workspace, role anonim, izin owner, undangan sekali pakai/expired, quota AI, dan conditional update revision. Tes mutation menguji konflik edit, idempotensi batch AI, serta validasi. PGlite bukan Supabase Auth/Realtime; tes ini tidak membuktikan koneksi layanan live.

Uji manual setelah konfigurasi:

1. Akun A membuat board/task. Refresh dan login ulang; data harus tetap ada.
2. Akun B tanpa undangan tidak boleh melihat workspace A.
3. A mengundang B. B menerima, kemudian kedua akun dapat melihat perubahan task.
4. Edit task yang sama dari dua browser. Edit lama harus ditolak dengan pesan konflik; reload data tersimpan, buka task lagi, lalu ulangi perubahan.
5. Putus koneksi saat menyimpan. Aplikasi harus menampilkan kegagalan/ketidakpastian simpan, bukan mengklaim berhasil. Reload saved data untuk memeriksa hasil sebelum mengulang.
6. Uji reset password, logout, Google login (jika diaktifkan), AI proposal/apply, serta quota/kegagalan AI.

## Batas versi testing

Belum termasuk lifecycle sprint, notification history/push/email assignment, attachment upload, penghapusan board/task, pencabutan anggota melalui UI, atau izin per-board. Anggota workspace dapat mengedit seluruh board/task. Owner dapat mencabut membership melalui database proyeknya bila diperlukan.

Dokumen state per workspace memakai optimistic concurrency (revision). Batas beta: 100 board, 3.000 task, dan state maksimal sekitar 2 MB. Perubahan task yang berbenturan ditolak; tidak ditimpa diam-diam. Tidak ada offline write queue yang bertahan setelah browser ditutup.

Integrasi layanan nyata memerlukan environment dan migration di atas. Build tanpa key hanya memverifikasi kode dan menampilkan layar setup; tidak mengaktifkan Supabase/Gemini secara otomatis.

## Referensi resmi

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://ai.google.dev/gemini-api/docs/structured-output
