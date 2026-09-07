// Generator PDF Master Dokumentasi WMS Simple Enterprise
// Render mermaid via headless Chrome (DevTools Protocol).
// Teks: A4 rapat. Diagram: SATU halaman utuh per diagram (kertas otomatis seukuran diagram, nol potongan).
// Usage: node scripts/build-master-pdf.mjs [output.pdf] | --png (export PNG utuh ke docs/diagrams/)
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VERSION = '3.2.0';

// --- 1. Baca diagram dari dokumen sumber ---
const seqDoc = readFileSync(join(ROOT, 'docs/09_Master_End_to_End_Flow_and_Sequence.md'), 'utf8');
const diagrams = [...seqDoc.matchAll(/```mermaid\n([\s\S]*?)```/g)].map(m => m[1].trim());
if (diagrams.length < 2) throw new Error('Diagram mermaid tidak ditemukan di 09_Master');
const [flowchartSrc, sequenceSrc] = diagrams;

// --- 2. HTML template ---
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<style id="pagestyle">
  @page { size: A4; margin: 9mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1a2332; margin: 0; font-size: 10.5pt; line-height: 1.45; }
  h1 { font-size: 20pt; margin: 0 0 2mm; color: #0d47a1; }
  h2 { font-size: 13.5pt; margin: 4.5mm 0 2mm; color: #0d47a1; border-bottom: 1.5pt solid #0d47a1; padding-bottom: 1mm; break-after: avoid; }
  h3 { font-size: 11pt; margin: 3mm 0 1.2mm; break-after: avoid; }
  p, li { margin: 0.7mm 0; }
  .kicker { letter-spacing: 2px; font-size: 8.5pt; color: #546e7a; text-transform: uppercase; margin-bottom: 1mm; }
  .subtitle { font-size: 10pt; color: #37474f; margin-bottom: 3mm; }
  .meta { width: 100%; border-collapse: collapse; margin: 2mm 0 3mm; font-size: 9pt; }
  .meta td { border: 0.75pt solid #b0bec5; padding: 2mm 2.5mm; vertical-align: top; }
  .meta .lbl { color: #546e7a; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 1px; }
  .footer-note { margin-top: 2mm; font-size: 8pt; color: #78909c; border-top: 0.75pt solid #cfd8dc; padding-top: 1mm; }
  .diagram { break-inside: avoid; }
  .diagram svg { max-width: 100% !important; height: auto !important; }
  table.data { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 2mm 0; }
  table.data tr { break-inside: avoid; }
  table.data th, table.data td { border: 0.75pt solid #b0bec5; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
  table.data th { background: #e8eef7; color: #0d47a1; }
  ol.rules { padding-left: 5mm; }
  ol.rules li { margin: 1mm 0; }
  .conclusion { background: #e8f5e9; border-left: 3pt solid #2e7d32; padding: 2mm 3mm; margin-top: 2.5mm; font-size: 9.5pt; }
  .placeholder { position: absolute; left: -10000px; top: 0; }
</style>
</head>
<body>

<section class="cover">
  <div class="kicker">Dokumentasi &amp; Blueprint Operasional Logistik</div>
  <h1>WMS Simple Enterprise</h1>
  <p class="subtitle">Spesifikasi Bahasa Gudang Sederhana &amp; Sistem Manajemen Logistik Terpadu. Mencakup: Multi-Gudang Cabang, Kargo Besar &amp; Curah (Repacking), Tukar Surat Jalan (Cross-Dock), Log Pos Satpam Armada Truk, Pengiriman Showcase Pendingin (Program Desa KDMP), Anti Kebocoran Stok, &amp; Bukti Kirim Digital (e-POD).</p>
  <table class="meta">
    <tr>
      <td style="width:50%"><div class="lbl">Versi Sistem</div><b>v${VERSION}</b> (Bahasa Gudang Simplified)</td>
      <td><div class="lbl">Target Industri</div>Gudang Distribusi 3PL, Trucking, Cold Chain KDMP</td>
    </tr>
    <tr>
      <td><div class="lbl">Penyimpanan Database</div>Host Server Lokal Terpusat (PostgreSQL 16)</td>
      <td><div class="lbl">Mesin Aplikasi (IT)</div>Hono Backend + Aplikasi HP Android (Nuxt 3 PWA)</td>
    </tr>
  </table>
</section>

<h2>1. Target Operasional Bisnis &amp; Pencapaian Indikator (KPI)</h2>
<table class="data">
  <tr><th style="width:14%">ID Sasaran</th><th style="width:24%">Target Penyakit Gudang yang Diobati</th><th style="width:28%">Indikator Keberhasilan Mutlak (KPI)</th><th>Solusi Fitur di Sistem WMS Simple</th></tr>
  <tr><td><b>GOAL-01</b></td><td>Cegah Barang Hilang Misterius &amp; Kartu Stok Harus Akurat</td><td>Akurasi Stok Nyata &ge; 99,8%</td><td>Sistem Buku Besar (Double-Entry Ledger): Stok tidak bisa dikurangi sepihak, setiap keluar masuk harus seimbang dan wajib sebut nama petugas pemindah.</td></tr>
  <tr><td><b>GOAL-02</b></td><td>Barang Transit Kelamaan Ngendap di Gudang Penghubung</td><td>Truk Bongkar &amp; Muat Ulang &lt; 24 Jam</td><td>Jalur Cepat (Cross-Docking): Fitur ini memotong alur barang turun agar langsung di-tally ke truk tujuan kota berikutnya tanpa dimasukkan ke rak simpan.</td></tr>
  <tr><td><b>GOAL-03</b></td><td>Supir Nakal (Kencing Solar) &amp; Pemakaian Truk Gelap</td><td>100% Truk Lapor Satpam</td><td>Pencatatan Gerbang (Gate Pass): Mesin melacak Odometer Keluar wajib lebih kecil dari Odometer Masuk, menghitung total Jarak KM, dan memantau sisa liter BBM harian.</td></tr>
  <tr><td><b>GOAL-04</b></td><td>Susut Curah Berlebihan (Tumpah atau Dicuri Karyawan)</td><td>Susut Pengepakan (Shrinkage) &le; 1,0%</td><td>Modul Repacking &amp; Timbangan Truk: Otomatis menghitung selisih timbangan awal truk utuh dengan total karungan akhir. Bila selisih lebih dari 1%, Alarm Manajer berbunyi.</td></tr>
  <tr><td><b>GOAL-05</b></td><td>Pembeli Tahu Nama Pabrik Asli (Membahayakan Bisnis Ekspedisi Titipan 3PL)</td><td>0% Kebocoran Dokumen Asal Pabrik</td><td>Tukar Dokumen Asli (Blind Shipping / Cross-Document Swap): Secara otomatis menerbitkan form Surat Jalan baru berlogo WMS Ekspedisi untuk menutupi nama produsen.</td></tr>
</table>

<h2>2. Penanganan Khusus Barang Sensitif &amp; Alat Pendingin (Kasus Showcase KDMP)</h2>
<p>Sistem WMS Simple dikonfigurasi untuk memahami instruksi penanganan barang yang butuh perlakuan khusus (Barang Rewel). Contoh nyatanya adalah pengiriman Kulkas Showcase dan Chest Freezer Koperasi Desa Merah Putih (KDMP) se-Indonesia.</p>
<h3>Aturan Kaku (Baku) Penanganan Showcase Pendingin di Gudang &amp; Truk:</h3>
<ol class="rules">
  <li><b>Pantang Dimiringkan (Wajib Tegak / Upright Only):</b> Barang ini dilarang keras diangkut dengan posisi miring atau ditidurkan rebah. Jika rebah, oli pelumas dari kompresor bawah akan tumpah masuk ke pipa evaporator dan bikin kulkas langsung rusak (buntu) saat dinyalakan.</li>
  <li><b>Dilarang Ditumpuk (No Double Stacking):</b> Barang rentan pecah kacanya. Sistem melarang keras penumpukan 2 tingkat kecuali pakai sangkar palet kayu pelindung dari pabrik.</li>
  <li><b>Wajib Dicatat Nomor Seri Mesinnya (Barcode Serial Number Tracking):</b> Saat masuk ke gudang, wajib di-scan barcode bodi kulkasnya untuk pendaftaran Garansi Resmi &amp; Inventaris Aset Milik Negara (BMN).</li>
  <li><b>Wajib Menunggu Tenang (Resting Time 4 Jam):</b> Sopir dan Kades diwajibkan SOP untuk membiarkan unit berdiri diam minimal 2 hingga 4 jam setelah truk sampai. Ini fungsinya agar oli mesin kembali mengendap stabil ke bawah sebelum kabel listrik boleh dicolokkan.</li>
  <li><b>Wajib Dikirim Pakai Truk Berekor Hidrolik (Tail-Lift):</b> Karena Balai Desa di pelosok tidak punya garasi loading dock maupun kendaraan Forklift, maka sistem WMS mengunci (mengawinkan) pesanan ini HANYA BOLEH diangkut oleh Truk Kecil Box yang punya pintu Lift Hidrolik (CDE Box Tail-Lift) agar kulkas berat 75 kg bisa turun perlahan aman ke tanah.</li>
</ol>

<h2>3. Standar Teknologi Aplikasi, Kemudahan Orang Lapangan, &amp; Keamanan (IT)</h2>
<p>Aplikasi WMS Simple Enterprise tidak hanya kuat secara pencatatan stok, namun juga aman dari peretasan siber dan gampang digunakan oleh buruh angkut di lapangan tanpa perlu manual book tebal.</p>

<h3>3.1 Navigasi Layar Hibrida (App Drawer + Bottom Nav)</h3>
<p>Agar petugas lapangan bisa beroperasi menggunakan satu tangan (satu jempol), aplikasi memadukan dua lapis navigasi yang responsif baik di HP maupun Scanner Alat Berat:</p>
<ul>
  <li><b>Jalur Cepat Bawah (Bottom Navigation):</b> Berisi 5 tombol fitur harian yang paling sering dipencet (Home, Gate Pass, Inbound, Stok, POD). Posisinya menempel di bawah agar selalu masuk zona nyaman jempol (<i>Thumb-Zone</i>).</li>
  <li><b>Menu Lengkap Samping (App Drawer / Hamburger Menu):</b> Berisi laci menu lengkap dari ujung ke ujung untuk fitur yang jarang dipakai tapi penting (Ganti Profil, Repacking, Laporan, Logout). Menu ini akan meluncur (<i>slide</i>) dari kiri atas layar.</li>
</ul>

<h3>3.2 Keamanan Anti-Maling Data &amp; Lolos Audit Keuangan Siber</h3>
<ul>
  <li><b>Standar Tembok Besi OWASP Top 10:</b> Aplikasi ini didesain patuh pada standar lembaga siber global OWASP. Semua celah teks pencarian di-filter ketat. Mustahil hacker memasukkan "kode SQL jahat" (SQL Injection) untuk mengutak-atik saldo angka gudang.</li>
  <li><b>Satu Server Data Tak Terbagi (Single Host PostgreSQL):</b> Sistem menggunakan satu gudang otak database yang ditaruh di komputer utama. Tidak ada cerita "Data Cabang Bali dan Cabang Balikpapan Beda/Bentrok", karena semuanya menyedot dan menyuap data ke satu muara induk yang sama secara real-time.</li>
  <li><b>Sistem Pengujian Otomatis Ketat (Vitest Coverage):</b> Sebelum aplikasi ini dirilis ke supir atau petugas gudang, kode-kodenya telah disimulasikan oleh mesin komputer otomatis ribuan kali. Terutama untuk rumus pengurangan Saldo Stok, Rumus Susut Kiloan Barang, dan Rumus Odometer Bensin, semuanya dijamin lulus tes akurasi 90%.</li>
</ul>

<div class="conclusion"><b>Status Kesimpulan Sistem:</b> Dokumen arsitektur dan spesifikasi operasional WMS Simple Enterprise (Versi ${VERSION}) telah sepenuhnya difinalisasi. Semua alur kerja sudah memakai bahasa pergudangan Indonesia yang membumi, masalah operasional sehari-hari teratasi secara sistem, dan siap memasuki tahap koding pemrograman (Development Phase).</div>

<div class="footer-note">&copy; 2026 BER5 Logistics Technology Ecosystem &bull; Workspace: /Users/anasfikri/Documents/Projects/ber5/wms-simple &bull; v${VERSION}</div>

<div class="diagram placeholder" id="d-flow">${esc(flowchartSrc)}</div>
<div class="diagram placeholder" id="d-seq">${esc(sequenceSrc)}</div>

<script type="module">
  import mermaid from '__MERMAID_URL__';
  // tampilkan placeholder offscreen sementara (perlu ter-layout utk getBoundingClientRect)
  for (const id of ['d-flow', 'd-seq']) {
    const el = document.getElementById(id);
    if (el) el.style.cssText = 'position:absolute;left:-10000px;top:0;display:block';
  }
  const ERROR = [];
  mermaid.initialize({ startOnLoad: false, theme: 'base', securityLevel: 'loose',
    themeVariables: { fontSize: '13px', primaryColor: '#e8eef7', primaryBorderColor: '#0d47a1', lineColor: '#455a64' },
    flowchart: { htmlLabels: true, curve: 'basis', nodeSpacing: 24, rankSpacing: 30, useMaxWidth: false, diagramPadding: 6 },
    sequence: { actorMargin: 70, width: 130, wrap: true, messageFontSize: 12, noteFontSize: 12, useMaxWidth: false, mirrorActors: false } });
  for (const id of ['d-flow', 'd-seq']) {
    const el = document.getElementById(id);
    try {
      const { svg } = await mermaid.render('svg-' + id, el.textContent);
      el.innerHTML = svg;
    } catch (e) { ERROR.push(id + ': ' + ((e && (e.message || e.str)) || String(e))); }
  }
  window.__ERROR_TEXT = ERROR.length ? 'MERMAID_ERROR: ' + ERROR.join(' | ') : 'MERMAID_OK';
  window.__DIAGRAM_SIZES = {};
  window.__DIAGRAM_GAPS = {};
  window.__DIAGRAM_SVGS = {};
  for (const id of ['d-flow', 'd-seq']) {
    const svg = document.querySelector('#' + id + ' svg');
    if (!svg) continue;
    const vb = svg.viewBox.baseVal;
    window.__DIAGRAM_SIZES[id] = { w: Math.ceil(vb.width), h: Math.ceil(vb.height) };
    window.__DIAGRAM_SVGS[id] = svg.outerHTML;
    // Peta okupansi vertikal dari elemen solid (kotak/label) — EDGES (path/line) DIKECUALIKAN
    // supaya cut bisa jatuh di celah antar baris node (garis edge boleh tersambung antar tile).
    // PENTING: hitung occupancy SELAG placeholder masih ter-layout (belum display:none),
    // kalau tidak semua getBoundingClientRect() = 0 dan peta celah kosong → cut sembarangan.
    const svgTop = svg.getBoundingClientRect().top;
    const Hpx = vb.height;
    const occ = new Uint8Array(Math.ceil(Hpx) + 2);
    for (const el of svg.querySelectorAll('rect,polygon,circle,ellipse,foreignObject,text')) {
      const r = el.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0) continue;
      const y0 = Math.max(0, Math.floor(r.top - svgTop));
      const y1 = Math.min(Math.ceil(Hpx), Math.ceil(r.bottom - svgTop));
      for (let y = y0; y <= y1; y++) occ[y] = 1;
    }
    // Setelah ukur selesai baru sembunyikan: abs-pos memuai tinggi dokumen saat print teks
    document.getElementById(id).style.cssText = 'display:none';
    const gaps = [];
    let runStart = -1;
    for (let y = 0; y < occ.length; y++) {
      if (!occ[y]) { if (runStart < 0) runStart = y; }
      else { if (runStart >= 0 && y - runStart >= 10) gaps.push(Math.round((runStart + y) / 2)); runStart = -1; }
    }
    if (runStart >= 0 && occ.length - runStart >= 10) gaps.push(Math.round((runStart + occ.length) / 2));
    if (!gaps.length) throw new Error('Peta celah kosong untuk ' + id + ' — occupancy dihitung saat elemen tidak ter-layout (display:none). Periksa urutan ukur vs hide.');
    window.__DIAGRAM_GAPS[id] = gaps;
  }
</script>
</body>
</html>`;

// --- 3. Siapkan workdir & HTML ---
const workDir = mkdtempSync(join(tmpdir(), 'wms-pdf-'));
const htmlPath = join(workDir, 'doc.html');
const mermaidUrl = 'file://' + join(ROOT, 'node_modules/mermaid/dist/mermaid.esm.min.mjs');
writeFileSync(htmlPath, html.replace('__MERMAID_URL__', mermaidUrl));

// --- 4. Minimal CDP client (Node builtin WebSocket) ---
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); });
    srv.on('error', reject);
  });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Set();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) { this.handlers.forEach(h => h(msg)); }
    });
  }
  static async connect(port) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find(t => t.type === 'page');
    if (!page) throw new Error('Tidak ada target page Chrome');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(fn) { this.handlers.add(fn); }
  close() { this.ws.close(); }
}

// --- 5. Launch Chrome & render ---
const port = await getFreePort();
const chrome = execFile(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`, '--user-data-dir=' + join(workDir, 'profile'),
  'about:blank',
], { maxBuffer: 16 * 1024 * 1024 });

try {
  // tunggu devtools siap
  let targets = null;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; }
    catch { await sleep(200); }
  }
  if (!targets) throw new Error('Chrome devtools tidak merespons');

  const cdp = await CDP.connect(port);
  await cdp.send('Page.enable');
  await cdp.send('Page.navigate', { url: 'file://' + htmlPath });
  await new Promise((resolve) => cdp.on(msg => { if (msg.method === 'Page.loadEventFired') resolve(); }));

  // poll status render mermaid (max 60 dtk)
  let status = null;
  for (let i = 0; i < 200; i++) {
    const r = await cdp.send('Runtime.evaluate', { expression: 'window.__ERROR_TEXT', returnByValue: true }).catch(() => null);
    if (r && r.result && r.result.value) { status = r.result.value; break; }
    await sleep(300);
  }
  if (!status) throw new Error('Timeout menunggu render mermaid');
  if (status.includes('MERMAID_ERROR')) throw new Error('Mermaid gagal render: ' + status);

  // Ukuran diagram natif (px viewBox)
  const sizes = await cdp.send('Runtime.evaluate', { expression: 'window.__DIAGRAM_SIZES', returnByValue: true });
  const diag = (sizes.result && sizes.result.value) || {};

  // Ekstrak string SVG dari halaman render
  const svgs = await cdp.send('Runtime.evaluate', { expression: 'window.__DIAGRAM_SVGS', returnByValue: true });
  const svgMap = svgs.result.value || {};
  if (!svgMap['d-flow'] || !svgMap['d-seq']) throw new Error('SVG diagram tidak terekstrak');

  // Mode --png: export tiap diagram sebagai SATU gambar utuh (untuk share ke client)
  if (process.argv.includes('--png')) {
    const outDir = join(ROOT, 'docs', 'diagrams');
    execFileSync('mkdir', ['-p', outDir]);
    const PNG_TITLE = { 'd-flow': 'Diagram Alir Operasional Gudang Menyeluruh — WMS Simple Enterprise', 'd-seq': 'Urutan Interaksi & Riwayat Lacak Status (Audit Trail) — WMS Simple Enterprise' };
    const PNG_FILE = { 'd-flow': 'wms-flowchart.png', 'd-seq': 'wms-sequence.png' };
    for (const id of ['d-flow', 'd-seq']) {
      const d = diag[id];
      if (!d) throw new Error('Ukuran diagram tidak tersedia: ' + id);
      const W = d.w, HIMG = d.h;
      const headH = 70, pad = 24;
      const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        html,body { margin:0; padding:0; background:#fff; }
        .head { padding: ${pad}px ${pad}px 12px; font:700 20px -apple-system,Helvetica,Arial,sans-serif; color:#0d47a1; }
        .sub { padding: 0 ${pad}px ${pad - 6}px; font:400 12px -apple-system,Helvetica,Arial,sans-serif; color:#78909c; }
        .body { padding: 0 ${pad}px ${pad}px; width: ${W}px; }
        .body svg { width: ${W}px !important; height: ${HIMG}px !important; display: block; }
      </style></head><body>
        <div class="head">${PNG_TITLE[id]}</div>
        <div class="sub">v${VERSION} • ${new Date().toISOString().slice(0, 10)} • BER5 Logistics</div>
        <div class="body">${svgMap[id]}</div>
      </body></html>`;
      const pngHtml = join(workDir, `png-${id}.html`);
      writeFileSync(pngHtml, full);
      await new Promise((res) => {
        const h = (msg) => { if (msg.method === 'Page.loadEventFired') res(); };
        cdp.on(h);
        cdp.send('Page.navigate', { url: 'file://' + pngHtml }).then(() => setTimeout(res, 500));
      });
      const totalW = W + 2 * pad, totalH = headH + HIMG + 2 * pad + 10;
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: totalW, height: totalH, deviceScaleFactor: 2, mobile: false });
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: totalW, height: totalH, scale: 2 },
      });
      const outPath = join(outDir, PNG_FILE[id]);
      writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log('OK PNG:', outPath, `(${totalW * 2}x${totalH * 2}px, diagram utuh tanpa potongan)`);
    }
    cdp.close();
    chrome.kill();
    process.exit(0);
  }

  // Cetak tiap diagram sebagai SATU halaman utuh:
  // kertas otomatis seukuran diagram + judul (nol tile, nol potongan, nol kehilangan konten).
  const pdfParts = [];
  const TITLE = { 'd-flow': 'Lampiran A — Diagram Alir Operasional Gudang Menyeluruh', 'd-seq': 'Lampiran B — Urutan Interaksi & Riwayat Lacak Status (Audit Trail)' };
  for (const id of ['d-flow', 'd-seq']) {
    const d = diag[id];
    if (!d) throw new Error('Ukuran diagram tidak tersedia: ' + id);

    const pad = 24, headH = 74, buf = 24;
    const totalW = d.w + 2 * pad + buf, totalH = headH + d.h + 2 * pad + buf;
    const pageHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${totalW}px ${totalH}px; margin: 0; }
      html,body { margin:0; padding:0; background:#fff; }
      .head { height: 48px; padding: ${pad}px ${pad}px 0; box-sizing: content-box; font:700 18px/48px -apple-system,Helvetica,Arial,sans-serif; color:#0d47a1; }
      .sub { height: 26px; padding: 0 ${pad}px; box-sizing: content-box; font:400 11px/26px -apple-system,Helvetica,Arial,sans-serif; color:#78909c; }
      .body { padding: 0 ${pad}px ${pad}px; width: ${d.w}px; box-sizing: content-box; }
      .body svg { width: ${d.w}px !important; height: ${d.h}px !important; display: block; }
    </style></head><body>
      <div class="head">${TITLE[id]}</div>
      <div class="sub">v${VERSION} • ${new Date().toISOString().slice(0, 10)} • BER5 Logistics</div>
      <div class="body">${svgMap[id]}</div>
    </body></html>`;
    const pagePath = join(workDir, `page-${id}.html`);
    writeFileSync(pagePath, pageHtml);
    await new Promise((res) => {
      const h = (msg) => { if (msg.method === 'Page.loadEventFired') res(); };
      cdp.on(h);
      cdp.send('Page.navigate', { url: 'file://' + pagePath }).then(() => setTimeout(res, 400));
    });
    const { data } = await cdp.send('Page.printToPDF', {
      printBackground: true, preferCSSPageSize: true,
      marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
    });
    pdfParts.push(Buffer.from(data, 'base64'));
  }

  // Kembali ke dokumen utama untuk cetak bagian teks (diagram tersembunyi)
  await new Promise((res) => {
    const h = (msg) => { if (msg.method === 'Page.loadEventFired') res(); };
    cdp.on(h);
    cdp.send('Page.navigate', { url: 'file://' + htmlPath }).then(() => setTimeout(res, 600));
  });
  // pastikan render & hide selesai: tunggu placeholder tersembunyi ATAU svg belum ada
  for (let i = 0; i < 100; i++) {
    const st = await cdp.send('Runtime.evaluate', { expression: `(() => {
      const a = document.getElementById('d-flow'), b = document.getElementById('d-seq');
      if (!a || !b) return 'noel';
      const sa = a.querySelector('svg'), sb = b.querySelector('svg');
      if (!sa || !sb) return 'rendering';
      return (a.style.display === 'none' && b.style.display === 'none') ? 'hidden' : 'visible';
    })()`, returnByValue: true }).catch(() => null);
    if (st && st.result && (st.result.value === 'hidden')) break;
    if (st && st.result && st.result.value === 'noel') break; // halaman lain (tak terduga)
    await sleep(200);
  }

  // Dokumen teks utama (diagram tersembunyi, tidak ada ruang kosong raksasa)
  const { data: docData } = await cdp.send('Page.printToPDF', {
    printBackground: true, preferCSSPageSize: true,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  });

  // Gabung: teks dulu, lalu halaman lampiran diagram
  const pdfPath = process.argv[2] || join(ROOT, 'docs', 'WMS_Simple_Enterprise_Master_Documentation.pdf');
  const tmpDoc = join(workDir, 'doc-text.pdf');
  writeFileSync(tmpDoc, Buffer.from(docData, 'base64'));
  const tmpParts = [];
  pdfParts.forEach((b, i) => { const p = join(workDir, 'part-' + i + '.pdf'); writeFileSync(p, b); tmpParts.push(p); });
  execFileSync('pdfunite', [tmpDoc, ...tmpParts, pdfPath]);
  cdp.close();
  console.log('OK PDF:', pdfPath, '| diagram sizes:', JSON.stringify(diag), '| halaman diagram:', tmpParts.length);
} finally {
  chrome.kill();
}
