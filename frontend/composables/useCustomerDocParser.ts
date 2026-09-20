import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';

export interface ExtractedItem {
  raw_line: string;
  detected_sku?: string;
  detected_name?: string;
  detected_qty: number;
  matched_product_id?: string;
  matched_product_name?: string;
  matched_sku_code?: string;
  unit?: string;
  stock_on_hand?: number;
  match_status: 'EXACT' | 'FUZZY' | 'UNMATCHED';
}

export interface ParsedCustomerDoc {
  file_name: string;
  file_type: 'EXCEL' | 'PDF' | 'IMAGE';
  file_data_url: string;
  customer_ref_number: string;
  recipient_name: string;
  recipient_phone: string;
  destination_address: string;
  destination_city: string;
  extracted_items: ExtractedItem[];
  raw_text: string;
}

export function useCustomerDocParser() {
  const isProcessing = ref(false);
  const progressText = ref('');
  const progressPercent = ref(0);

  /**
   * Mengubah File ke Base64 Data URL untuk preview dan attachment
   */
  async function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Helper pencocokan cerdas SKU / Nama Produk WMS
   */
  function matchProduct(rawText: string, qty: number, products: any[]): ExtractedItem {
    const cleanText = rawText.trim();
    const upperText = cleanText.toUpperCase();

    // 1. Cek Exact Match SKU Code
    for (const p of products) {
      if (p.sku_code && upperText.includes(p.sku_code.toUpperCase())) {
        return {
          raw_line: cleanText,
          detected_sku: p.sku_code,
          detected_name: p.name,
          detected_qty: qty,
          matched_product_id: p.id,
          matched_product_name: p.name,
          matched_sku_code: p.sku_code,
          unit: p.unit || 'PCS',
          match_status: 'EXACT'
        };
      }
    }

    // 2. Cek Token / Fuzzy Match Nama Produk
    let bestMatch: any = null;
    let maxMatchedTokens = 0;

    for (const p of products) {
      const tokens = (p.name || '').toLowerCase().split(/[\s\-_,./]+/).filter((t: string) => t.length > 2);
      let matches = 0;
      for (const t of tokens) {
        if (cleanText.toLowerCase().includes(t)) {
          matches++;
        }
      }
      if (matches > 0 && matches > maxMatchedTokens) {
        maxMatchedTokens = matches;
        bestMatch = p;
      }
    }

    if (bestMatch && maxMatchedTokens >= 2) {
      return {
        raw_line: cleanText,
        detected_sku: bestMatch.sku_code,
        detected_name: bestMatch.name,
        detected_qty: qty,
        matched_product_id: bestMatch.id,
        matched_product_name: bestMatch.name,
        matched_sku_code: bestMatch.sku_code,
        unit: bestMatch.unit || 'PCS',
        match_status: 'FUZZY'
      };
    }

    // 3. Fallback bila belum cocok
    return {
      raw_line: cleanText,
      detected_name: cleanText.replace(/\b\d+(\s*(pcs|unit|box|kg|zak|dus|ktn))?\b/gi, '').trim(),
      detected_qty: qty > 0 ? qty : 1,
      matched_product_id: products[0]?.id || '',
      matched_product_name: products[0]?.name || '',
      matched_sku_code: products[0]?.sku_code || '',
      unit: 'PCS',
      match_status: 'UNMATCHED'
    };
  }

  /**
   * Ekstraksi Entity Heuristik dari Teks OCR / Dokumen
   */
  function extractEntitiesFromText(text: string, products: any[]): Omit<ParsedCustomerDoc, 'file_name' | 'file_type' | 'file_data_url'> {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let customerRef = '';
    let recipientName = '';
    let recipientPhone = '';
    let destinationAddress = '';
    let destinationCity = '';
    const items: ExtractedItem[] = [];

    // Regex pola nomor referensi DO/PO/Surat Jalan Customer
    const refRegex = /(?:po|do|sp|sppb|order|no\.?|sj|surat\s+jalan)[\s:#\-_]*([a-z0-9\-\/]{4,30})/i;
    // Regex penerima
    const recipientRegex = /(?:kepada|penerima|consignee|yth|kirim\s+ke|tujuan)[\s:#\-_]*([^\n,]{3,50})/i;
    // Regex no telepon
    const phoneRegex = /(?:08|\+628)[0-9]{8,11}/;

    for (const line of lines) {
      // 1. Cek No Referensi Dokumen
      if (!customerRef) {
        const m = line.match(refRegex);
        if (m && m[1]) {
          customerRef = m[1].trim();
        }
      }

      // 2. Cek Nama Penerima
      if (!recipientName) {
        const m = line.match(recipientRegex);
        if (m && m[1]) {
          recipientName = m[1].replace(/[:\-–]/g, '').trim();
        }
      }

      // 3. Cek Telepon
      if (!recipientPhone) {
        const m = line.match(phoneRegex);
        if (m) {
          recipientPhone = m[0].trim();
        }
      }

      // 4. Cek Alamat (dimulai Jl. / Jalan / RT / RW / Kel. / Kec.)
      if (!destinationAddress && /^(?:jl|jalan|dusun|desa|kel|kec|blok|komplek|kp|gedung)\b/i.test(line)) {
        destinationAddress = line;
      }

      // 5. Cek Baris Item / Barang
      // Deteksi baris yang mengandung angka qty atau kode SKU produk
      let detectedQty = 0;
      const qtyMatch = line.match(/\b(\d+)\s*(?:pcs|unit|box|kg|zak|dus|ktn|btg|sak)?\b/i);
      if (qtyMatch) {
        const parsed = parseInt(qtyMatch[1], 10);
        if (parsed > 0 && parsed < 100000) {
          detectedQty = parsed;
        }
      }

      // Periksa apakah baris ini menyebutkan produk dari master
      const hasProductKeyword = products.some(p => {
        const sku = (p.sku_code || '').toLowerCase();
        const nameParts = (p.name || '').toLowerCase().split(' ').filter((x: string) => x.length > 3);
        return (sku && line.toLowerCase().includes(sku)) || nameParts.some((np: string) => line.toLowerCase().includes(np));
      });

      if (hasProductKeyword || (detectedQty > 0 && line.length > 5 && !line.match(/^(no|tanggal|penerima|telepon|alamat|total)/i))) {
        items.push(matchProduct(line, detectedQty || 1, products));
      }
    }

    // Jika belum ada item terdeteksi tapi ada teks, coba ambil baris-baris berkuantitas
    if (items.length === 0) {
      for (const line of lines) {
        const m = line.match(/(\d+)/);
        if (m && line.length > 6 && !line.match(/(202\d|tahun|tanggal|telp|hp)/i)) {
          const qty = parseInt(m[1], 10);
          items.push(matchProduct(line, qty > 0 ? qty : 1, products));
        }
      }
    }

    return {
      customer_ref_number: customerRef || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      recipient_name: recipientName || '',
      recipient_phone: recipientPhone || '',
      destination_address: destinationAddress || '',
      destination_city: destinationCity || '',
      extracted_items: items.length > 0 ? items : [
        {
          raw_line: 'Item Pesanan Dokumen',
          detected_name: 'Item Pesanan Dokumen',
          detected_qty: 1,
          matched_product_id: products[0]?.id || '',
          matched_product_name: products[0]?.name || '',
          matched_sku_code: products[0]?.sku_code || '',
          unit: 'PCS',
          match_status: 'UNMATCHED'
        }
      ],
      raw_text: text
    };
  }

  /**
   * Parser File Excel (.xlsx, .xls, .csv)
   */
  async function parseExcel(file: File, products: any[]): Promise<ParsedCustomerDoc> {
    isProcessing.value = true;
    progressText.value = 'Membaca spreadsheet Excel...';
    progressPercent.value = 20;

    const dataUrl = await fileToDataUrl(file);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    progressPercent.value = 60;
    progressText.value = 'Menganalisis baris data...';

    let customerRef = '';
    let recipientName = '';
    let destinationAddress = '';
    const items: ExtractedItem[] = [];

    // Cari baris header tabel
    let headerRowIdx = -1;
    let skuCol = -1;
    let nameCol = -1;
    let qtyCol = -1;

    for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
      const row = jsonData[r] || [];
      const rowStr = row.join(' ').toLowerCase();

      if (!customerRef && (rowStr.includes('po') || rowStr.includes('do') || rowStr.includes('no') || rowStr.includes('ref'))) {
        for (const cell of row) {
          const str = String(cell || '').trim();
          const m = str.match(/(?:po|do|no|ref)[\s:#\-_]*([a-z0-9\-\/]{4,30})/i);
          if (m) customerRef = m[1];
        }
      }

      if (!recipientName && (rowStr.includes('kepada') || rowStr.includes('penerima') || rowStr.includes('tujuan') || rowStr.includes('consignee'))) {
        for (const cell of row) {
          const str = String(cell || '').trim();
          if (str.length > 3 && !str.match(/^(kepada|penerima|consignee):?$/i)) {
            recipientName = str;
          }
        }
      }

      // Deteksi kolom tabel item
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toLowerCase().trim();
        if (val.includes('sku') || val.includes('kode') || val.includes('barcode') || val.includes('part no')) skuCol = c;
        if (val.includes('nama') || val.includes('barang') || val.includes('produk') || val.includes('item') || val.includes('deskripsi')) nameCol = c;
        if (val.includes('qty') || val.includes('jumlah') || val.includes('kuantitas') || val.includes('pcs')) qtyCol = c;
      }

      if ((skuCol !== -1 || nameCol !== -1) && qtyCol !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    // Ekstraksi baris-baris barang dari tabel Excel
    if (headerRowIdx !== -1) {
      for (let r = headerRowIdx + 1; r < jsonData.length; r++) {
        const row = jsonData[r];
        if (!row || row.length === 0) continue;

        const skuVal = skuCol !== -1 ? String(row[skuCol] || '').trim() : '';
        const nameVal = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
        const qtyVal = qtyCol !== -1 ? parseFloat(String(row[qtyCol] || '0')) : 1;

        if (!skuVal && !nameVal) continue;
        if (isNaN(qtyVal) || qtyVal <= 0) continue;

        const combinedText = `${skuVal} ${nameVal}`.trim();
        items.push(matchProduct(combinedText, qtyVal, products));
      }
    }

    // Jika format tabel tidak berpola, gunakan heuristik baris
    if (items.length === 0) {
      const fullText = jsonData.map(r => r.join(' ')).join('\n');
      const entities = extractEntitiesFromText(fullText, products);
      isProcessing.value = false;
      return {
        file_name: file.name,
        file_type: 'EXCEL',
        file_data_url: dataUrl,
        customer_ref_number: customerRef || entities.customer_ref_number,
        recipient_name: recipientName || entities.recipient_name,
        recipient_phone: entities.recipient_phone,
        destination_address: destinationAddress || entities.destination_address,
        destination_city: entities.destination_city,
        extracted_items: entities.extracted_items,
        raw_text: fullText
      };
    }

    progressPercent.value = 100;
    isProcessing.value = false;

    return {
      file_name: file.name,
      file_type: 'EXCEL',
      file_data_url: dataUrl,
      customer_ref_number: customerRef || `EXC-${Math.floor(100000 + Math.random() * 900000)}`,
      recipient_name: recipientName,
      recipient_phone: '',
      destination_address: destinationAddress,
      destination_city: '',
      extracted_items: items,
      raw_text: jsonData.map(r => r.join(' | ')).join('\n')
    };
  }

  /**
   * Parser Foto / Gambar menggunakan Tesseract.js OCR
   */
  async function parseImageWithOcr(file: File, products: any[]): Promise<ParsedCustomerDoc> {
    isProcessing.value = true;
    progressText.value = 'Menyiapkan engine OCR...';
    progressPercent.value = 10;

    const dataUrl = await fileToDataUrl(file);

    try {
      progressText.value = 'Menginisialisasi model OCR bahasa Indonesia & Inggris...';
      const worker = await createWorker(['ind', 'eng']);

      progressPercent.value = 35;
      progressText.value = 'Membaca dan mengenali teks dokumen foto...';

      const ret = await worker.recognize(dataUrl);
      progressPercent.value = 85;
      progressText.value = 'Menganalisis entitas pesanan dan SKU...';

      const rawText = ret.data.text;
      await worker.terminate();

      const entities = extractEntitiesFromText(rawText, products);
      progressPercent.value = 100;
      isProcessing.value = false;

      return {
        file_name: file.name,
        file_type: 'IMAGE',
        file_data_url: dataUrl,
        ...entities
      };
    } catch (err: any) {
      isProcessing.value = false;
      throw new Error(`Gagal memproses OCR pada gambar: ${err.message}`);
    }
  }

  /**
   * Parser Dokumen PDF (Ekstraksi teks digital atau OCR jika scan gambar)
   */
  async function parsePdf(file: File, products: any[]): Promise<ParsedCustomerDoc> {
    isProcessing.value = true;
    progressText.value = 'Membaca dokumen PDF...';
    progressPercent.value = 15;

    const dataUrl = await fileToDataUrl(file);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      // Set worker source
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      }

      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;

      let fullExtractedText = '';
      const numPages = Math.min(pdfDoc.numPages, 3); // Proses hingga 3 halaman pertama

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        progressText.value = `Mengekstrak teks PDF halaman ${pageNum} dari ${numPages}...`;
        progressPercent.value = 20 + Math.floor((pageNum / numPages) * 40);

        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullExtractedText += pageText + '\n';
      }

      // Jika teks digital PDF cukup panjang (> 40 karakter), gunakan langsung!
      if (fullExtractedText.trim().length > 40) {
        progressText.value = 'Memetakan data teks digital PDF ke master SKU...';
        progressPercent.value = 85;
        const entities = extractEntitiesFromText(fullExtractedText, products);
        progressPercent.value = 100;
        isProcessing.value = false;
        return {
          file_name: file.name,
          file_type: 'PDF',
          file_data_url: dataUrl,
          ...entities
        };
      }

      // Jika teks digital kosong/sangat sedikit (berarti PDF adalah hasil SCAN lembar fisik), render halaman ke canvas lalu OCR!
      progressText.value = 'PDF berupa scan lembar fisik — mengaktifkan OCR...';
      progressPercent.value = 65;

      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        const imgDataUrl = canvas.toDataURL('image/png');

        const worker = await createWorker(['ind', 'eng']);
        const ocrRes = await worker.recognize(imgDataUrl);
        await worker.terminate();

        const entities = extractEntitiesFromText(ocrRes.data.text, products);
        progressPercent.value = 100;
        isProcessing.value = false;
        return {
          file_name: file.name,
          file_type: 'PDF',
          file_data_url: dataUrl,
          ...entities
        };
      }

      // Fallback
      isProcessing.value = false;
      const entities = extractEntitiesFromText(fullExtractedText, products);
      return {
        file_name: file.name,
        file_type: 'PDF',
        file_data_url: dataUrl,
        ...entities
      };
    } catch (err: any) {
      isProcessing.value = false;
      throw new Error(`Gagal memproses dokumen PDF: ${err.message}`);
    }
  }

  /**
   * Router File Utama: Otomatis mendeteksi tipe file (Excel / PDF / Gambar)
   */
  async function parseCustomerFile(file: File, products: any[]): Promise<ParsedCustomerDoc> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return parseExcel(file, products);
    } else if (ext === 'pdf') {
      return parsePdf(file, products);
    } else if (['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
      return parseImageWithOcr(file, products);
    } else {
      throw new Error(`Format file .${ext} tidak didukung. Harap unggah file Excel, PDF, atau Foto (JPG/PNG).`);
    }
  }

  return {
    isProcessing,
    progressText,
    progressPercent,
    parseCustomerFile
  };
}
