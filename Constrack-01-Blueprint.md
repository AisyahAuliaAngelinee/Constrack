# Constrack — Product & Frontend Blueprint

Versi 0.1 · 17 Oktober 2026 · Status: rancangan awal untuk implementasi

Dokumen ini merangkum ide produk dan arah implementasi Constrack. Detail perilaku, use case, diagram, dan wireframe berada di `Constrack-02-Spesifikasi-Aplikasi.md`. Keputusan tambahan merupakan usulan desain, bukan fitur yang sudah diimplementasikan.

## 1. Visi produk

Constrack adalah workspace AI Kanban untuk mengubah ide menjadi pekerjaan terstruktur, berkolaborasi, melacak progres, dan merangkum sprint. Makna nama: construct + track. Target awal adalah individu dan tim kecil yang mengelola proyek umum; tidak dibatasi pada konstruksi fisik.

Alur inti: buat workspace → buat board → susun task → kerjakan bersama → evaluasi sprint.

Nilai utama:

- Planning lebih cepat melalui AI Task Generation dan AI Task Breakdown.
- Eksekusi jelas melalui Kanban, My Tasks, Calendar, dan due date.
- Kolaborasi melalui assignment, komentar, notification, dan update realtime.
- Evaluasi melalui dashboard dan AI Sprint Summary berbasis data.

## 2. Struktur produk

| Tingkat | Fungsi |
|---|---|
| Workspace | Batas anggota, data, dan pengaturan tim |
| Board | Ruang kerja proyek dengan owner dan anggota |
| Column | Tahapan pekerjaan; nama dapat dikustomisasi |
| Task | Unit pekerjaan dengan assignee, prioritas, due date, dan sprint |
| Subtask | Checklist pekerjaan di dalam task |
| Sprint | Periode kerja bertanggal yang mengelompokkan task pada satu board |

Team menampilkan anggota workspace aktif. Direktori seluruh pengguna lintas workspace menjadi fitur admin di luar scope awal.

## 3. Stack

| Area | Pilihan | Tanggung jawab |
|---|---|---|
| Framework | React, Next.js App Router | Routing, server rendering, server endpoints |
| Bahasa | TypeScript strict | Kontrak data dan komponen |
| UI | shadcn/ui, Tailwind CSS | Primitive, form, dialog, styling |
| Motion | Animate UI, Framer Motion | Animasi komponen dan transisi khusus |
| Ikon | Lucide, Hugeicons | Lucide untuk UI utama; Hugeicons untuk ilustrasi tertentu |
| State | React Redux, Redux Toolkit | Shared client UI state |
| API cache | RTK Query | Data interaktif, mutation, optimistic update |
| Form | React Hook Form, Zod | Form state dan validasi input/output |
| Drag & drop | dnd-kit | Sorting task dan perpindahan kolom |
| Chart | shadcn chart/Recharts | Bar chart dan donut chart |
| Backend | Supabase PostgreSQL | Penyimpanan dan kebijakan akses |
| Auth | Supabase Auth | Google OAuth dan email/password |
| Realtime | Supabase Realtime | Perubahan data dan presence |
| AI | Gemini API melalui server | Generation, breakdown, summary |

Pin versi yang kompatibel saat bootstrap. Hindari dua library animasi mengendalikan properti yang sama pada satu elemen. Jangan menganggap semua primitive Animate UI langsung interchangeable dengan semua varian shadcn.

## 4. Identitas visual

| Token | Warna | Penggunaan |
|---|---|---|
| Primary dark | `#0A2129` | Sidebar, heading, teks utama |
| Primary green | `#03E29C` | CTA, aksen aktif; teks tombol memakai primary dark |
| Dark green | `#006B54` | Teks/ikon hijau pada permukaan terang |
| Mint light | `#E4F3EA` | Selected state, AI panel, light section |
| Light gray | `#F8F8F8` | Background aplikasi |
| White | `#FFFFFF` | Cards, navbar, modal |
| Dark section | `#0A2129 → #006B54` | Gradient section homepage |

Font: Manrope untuk heading, Inter untuk body dan kontrol. Gunakan font fallback sans-serif; muat melalui mekanisme font Next.js. Warna error/warning/information ditambahkan sebagai semantic tokens dan selalu disertai teks/ikon.

Logo: ikon tiga kolom Kanban bertingkat dengan negative space yang menyiratkan C. Logo utama tetap berupa ikon; nama produk tersedia sebagai accessible label.

| Elemen | Ukuran awal |
|---|---|
| Floating sidebar | Lebar expanded 248px, collapsed 76px, radius 24px |
| Sidebar inset | 16px dari tepi viewport |
| Content padding | Desktop 24–32px, mobile 16px |
| Card radius | 16–20px |
| Control height | 40–44px; target sentuh minimal 44px |
| Motion | 150–250ms; hormati reduced motion |

## 5. Navigasi dan halaman

| Route | Halaman | Akses |
|---|---|---|
| `/` | Homepage | Publik |
| `/login` | Google / email login | Publik |
| `/register` | Registrasi | Publik |
| `/forgot-password` | Pemulihan password | Publik |
| `/reset-password` | Penggantian password melalui tautan valid | Auth recovery |
| `/auth/callback` | Callback OAuth/verifikasi | Sistem |
| `/app/dashboard` | Dashboard | Login |
| `/app/boards/[boardId]` | Board detail | Board member |
| `/app/my-tasks` | My Tasks | Login |
| `/app/calendar` | Calendar | Login |
| `/app/team` | Team | Workspace member |
| `/app/settings` | Settings | Login; kontrol admin sesuai role |

Task dibuka menggunakan URL board dengan query `?task=<taskId>` agar dapat dibagikan. Server tetap memeriksa akses. CTA Let's get started menuju login atau dashboard sesuai sesi. Return URL harus berupa route internal yang tervalidasi.

## 6. Homepage

| Bagian | Isi |
|---|---|
| Navigation | Logo, Features, How it works, Sign in, Let's get started |
| Hero | Headline manfaat, penjelasan singkat, CTA, preview board |
| Product preview | Task cards dan AI breakdown panel |
| Features | AI planning, realtime, drag & drop, command menu |
| How it works | Create a board → Plan tasks → Track progress |
| AI section | Prompt contoh dan draft task yang dapat direview |
| Final CTA | Ajakan membuat board pertama |
| Footer | Help, privacy, terms |

Hero memakai mint light; section AI memakai gradient gelap. Hindari testimonial atau statistik pengguna fiktif. Mockup harus dikenali sebagai demonstrasi.

## 7. App shell

Sidebar: Dashboard, My Tasks, Calendar, Team, Settings. Bagian bawah: Help & Search, Log out, profil dengan avatar/logo akun, display name, dan email. Sidebar dapat collapse/expand; mode collapsed mempertahankan tooltip dan accessible label.

Navbar: judul dan subtitle halaman, Search, Notification, New board, avatar serta first name. Dropdown akun berisi identitas, Edit information, Settings, Log out. Edit information mengubah avatar dan display name; perubahan email menggunakan verifikasi.

Mobile: sidebar berupa drawer, tombol sekunder masuk overflow, search berupa ikon, detail task memenuhi layar.

## 8. Dashboard

Urutan: greeting → cards → Board analysis → Recently opened → All boards.

| Card | Definisi |
|---|---|
| Total boards | Board tidak diarsipkan yang dapat diakses |
| Total tasks | Task tidak diarsipkan pada board aktif yang dapat diakses |
| Owned by you | Board dengan pengguna sebagai owner |
| Shared with you | Board yang dapat diakses tetapi dimiliki orang lain |

Board analysis: stacked bar per board dengan jumlah task per kategori status. Judul legend: **Breakdown**. Compositions: donut Owned vs Shared. Chart menggunakan scope yang sama dengan cards.

Recently opened: 4–6 board berdasarkan akses pengguna. All boards: search, All/Owned/Shared, sorting, New Board. Card board memuat nama, deskripsi, avatar anggota, jumlah task, progress, updated time.

## 9. Board Detail

Header: nama, deskripsi, anggota online, connection state, Share, Settings. Toolbar: search, assignee/priority/label filter, sprint selector, Add task, AI actions.

Kolom default: Backlog, To do, In progress, In review, Done. Kolom memiliki kategori internal agar rename tidak merusak perhitungan completed.

Task card: judul, priority, label, avatar, due date, indikator subtasks dan comments. Task detail: description, acceptance criteria, subtasks, assignees, sprint, comments, activity history.

Drag & drop mendukung sorting dan pindah kolom. Menu Move to menyediakan alternatif keyboard. Update optimistis dikembalikan jika gagal tersimpan.

## 10. My Tasks, Calendar, Team, Settings

| Halaman | Fitur |
|---|---|
| My Tasks | Assigned to you, Overdue, Due this week, Completed; search; priority/board filter; created-at ASC/DESC; card/list toggle |
| Calendar | Task berdasarkan due date; month/week desktop; agenda mobile; filter board; Unscheduled |
| Team | Tabel avatar, nama, email, role, invitation status, joined date; search dan invite |
| Settings | Profile, workspace, appearance, notifications, AI preferences |

My Tasks default adalah cards yang dikelompokkan berdasarkan board, hanya berisi task assigned to current user. Filter berada di URL; preferensi view disimpan. Kalender mengikuti timezone pengguna.

## 11. Command menu dan notifikasi

Satu command menu digunakan oleh navbar dan Help & Search. Shortcut: macOS ⌘K; Windows/Linux Ctrl+K. Kelompok: Navigation, Boards, Tasks, Actions, Help. Mendukung keyboard, loading, no results, dan recent items. Search hanya mengembalikan data yang berhak diakses.

Notifications awal: assignment, mention komentar, undangan board. Klik membuka konteks dan menandai read. Gunakan deduplication untuk mencegah event ganda.

## 12. Fitur AI

| Fitur | Input | Output |
|---|---|---|
| Task Generation | Brief dan konteks board | Draft task, description, priority, acceptance criteria |
| Task Breakdown | Task terpilih | Subtasks dan urutan kerja |
| Sprint Summary | Sprint, task, activity history | Ringkasan selesai/belum selesai, blocker tercatat, saran |

Alur: Generate → Review → Edit → Apply. Tidak ada assignment, due date, atau mutation otomatis tanpa persetujuan pengguna pada hasil.

Hitungan sprint dihitung aplikasi, bukan ditebak model. AI harus membedakan fakta dan rekomendasi; blocker yang tidak tercatat tidak boleh diciptakan.

Gemini API key hanya di server; model melalui environment variable. Free tier digunakan sejauh tersedia pada project, tanpa janji kuota tetap atau biaya nol pada skala produksi. Sebelum data privat dipakai, tinjau kebijakan penggunaan data free tier. Tambahkan kuota per user/workspace, validasi Zod, timeout, retry terbatas, dan cache summary. Fitur manual tetap berjalan ketika AI gagal.

## 13. Arsitektur frontend

| Lapisan | Tanggung jawab |
|---|---|
| Server Components | Layout dan initial server reads |
| Client Components | Kanban, form, calendar, command menu |
| Redux slices | Shared UI: sidebar, selection, command menu |
| RTK Query | Cache server data interaktif dan mutations |
| URL | Search, filter, sorting, view yang dapat dibagikan |
| Local state | Form sementara dan state komponen lokal |

Buat store per provider/request instance, bukan singleton server. Jangan menyimpan token autentikasi di persisted Redux. Jika server menyediakan initial data, tentukan satu proses hydration supaya tidak ada dua cache authoritative yang berbeda.

Direktori yang disarankan: `src/app`, `src/components/ui`, `src/components/layout`, `src/components/shared`, `src/features/{boards,tasks,sprints,dashboard,calendar,team,notifications,search,ai}`, `src/lib/{auth,supabase,validations}`, `src/store`, `src/types`.

## 14. Data dan realtime

Entitas: profiles, workspaces, workspace_members, boards, board_members, columns, tasks, task_assignees, subtasks, sprints, comments, labels, task_labels, activity_logs, notifications, invitations, board_visits, ai_runs.

Task memiliki column_id, position, priority, due_date, timestamps, version. Server memvalidasi akses; database menjadi sumber kebenaran. Event realtime memperbarui cache, bukan memberi izin. Gunakan version check, rollback mutation gagal, deduplikasi event, dan refetch saat reconnect.

Workspace roles: Owner/Admin/Member. Board roles: Owner/Editor/Viewer. Detail kebijakan akses berada pada spesifikasi.

## 15. Roadmap implementasi

| Tahap | Deliverable | Syarat selesai |
|---|---|---|
| 1 | Tokens, shell, responsive layout | Sidebar dan navbar dapat digunakan desktop/mobile |
| 2 | Auth, workspace, board, task, drag & drop | Data tetap benar setelah refresh |
| 3 | Dashboard, My Tasks, Calendar, command menu | Semua view memakai data dan filter yang konsisten |
| 4 | Invitations, permissions, comments, realtime, notifications | Dua sesi saling menerima update tanpa kebocoran akses |
| 5 | Generation, breakdown, sprint summary | Review/apply bekerja dan kegagalan AI tidak memblokir manual flow |
| 6 | Homepage, motion, accessibility, empty/error states | Keyboard dan mobile flow lulus review |

Mulai dari satu vertical slice: login → create board → create task → move task → refresh → data tetap tersimpan.

## 16. Referensi teknis

Rujukan dokumentasi, bukan jaminan bahwa versi/kuota provider tidak berubah:

- [Next.js App Router](https://nextjs.org/docs/app)
- [Redux Toolkit dengan Next.js](https://redux.js.org/usage/nextjs)
- [shadcn Command](https://ui.shadcn.com/docs/components/command)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
