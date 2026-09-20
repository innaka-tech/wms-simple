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
   * Helper ekstraksi kuantitas barang dari sebaris teks
   * Mampu membedakan nomor urut (1, 2, 3), spesifikasi produk (25 KG, 43 Inch, 300L),
   * dan kuantitas sesungguhnya dengan atau tanpa UOM (50 ZAK, 15 UNIT, 5 UNIT).
   */
  function extractItemQuantity(line: string): number {
    const uomPattern = '(?:zak|unit|pcs|box|dus|ktn|sak|ton|liter|ltr|dr|bh|pack|roll|btg|set|btl|lembar)';
    const cleanLine = line.trim();

    // 1. Cek angka di akhir baris yang diikuti satuan atau tanpa satuan (misal "50 ZAK", "15 UNIT", atau "50")
    const endMatch = cleanLine.match(new RegExp(`\\b(\\d+)\\s*${uomPattern}?\\s*$`, 'i'));
    if (endMatch) {
      const parsed = parseInt(endMatch[1], 10);
      if (parsed > 0 && parsed < 100000) return parsed;
    }

    // 2. Cek semua pasangan angka + satuan di baris ini, ambil yang paling kanan (kolom Qty)
    const allUomMatches = Array.from(cleanLine.matchAll(new RegExp(`\\b(\\d+)\\s*(${uomPattern})\\b`, 'gi')));
    if (allUomMatches.length > 0) {
      const lastMatch = allUomMatches[allUomMatches.length - 1];
      const parsed = parseInt(lastMatch[1], 10);
      if (parsed > 0 && parsed < 100000) return parsed;
    }

    // 3. Fallback: buang nomor urut baris di awal (misal "1 ") dan ambil angka terakhir
    const strippedLine = cleanLine.replace(/^\s*\d+[\s.)\-]+/, '');
    const trailingNums = Array.from(strippedLine.matchAll(/\b(\d+)\b/g));
    if (trailingNums.length > 0) {
      const lastNum = trailingNums[trailingNums.length - 1];
      const parsed = parseInt(lastNum[1], 10);
      if (parsed > 0 && parsed < 100000) return parsed;
    }

    return 1;
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
          stock_on_hand: p.stock_on_hand || 0,
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
        stock_on_hand: bestMatch.stock_on_hand || 0,
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
      stock_on_hand: products[0]?.stock_on_hand || 0,
      match_status: 'UNMATCHED'
    };
  }

  /**
   * Ekstraksi Entity Heuristik dari Teks Dokumen
   */
  function extractEntitiesFromText(text: string, products: any[]): Omit<ParsedCustomerDoc, 'file_name' | 'file_type' | 'file_data_url'> {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let customerRef = '';
    let recipientName = '';
    let recipientPhone = '';
    let destinationAddress = '';
    let destinationCity = '';
    const items: ExtractedItem[] = [];

    // 1. Deteksi Nomor Referensi DO/PO/Surat Jalan
    // Prioritas 1: Format nomor terstruktur DO-XXX/YY/ZZ atau PO-XXX/YY
    const explicitRef = text.match(/\b((?:DO|PO|SPPB|SP|RO|SJ|REF|ORD|INV)[-_/][A-Z0-9-_/]{3,35})\b/i);
    if (explicitRef) {
      customerRef = explicitRef[1].trim();
    } else {
      // Prioritas 2: Label NO. PO / DO diikuti nomor alfanumerik
      const refMatch = text.match(/(?:no\.?\s*(?:po|do|order|ref|referensi|surat\s*jalan)?|po|do|sppb)\s*[:#\s\-_]+\s*([A-Z0-9\-_/]{4,35})/i);
      if (refMatch && !refMatch[1].match(/^(customer|barang|pengambilan|order|pengiriman|consignee)$/i) && /\d/.test(refMatch[1])) {
        customerRef = refMatch[1].trim();
      }
    }

    // 2. Iterasi baris untuk mencari Penerima, Telepon, Alamat, dan Kota
    for (const line of lines) {
      // Cek Nama Penerima (Consignee)
      if (!recipientName) {
        // Prioritaskan label Kepada: atau Yth:
        const kepadaMatch = line.match(/\b(?:kepada|yth|att|u\.?p\.?)\s*[:\-–]?\s*([^|\n,]{3,60})/i);
        if (kepadaMatch) {
          const cleaned = kepadaMatch[1].replace(/[:\-–]/g, '').trim();
          if (!/(consignee|tujuan|customer|pengiriman|pengambilan|sumber|alamat|telepon)/i.test(cleaned)) {
            recipientName = cleaned;
          }
        } else {
          // Label Penerima atau Kirim Ke (abaikan header tabel seperti "PENERIMA (CONSIGNEE) & TUJUAN:")
          const penerimaMatch = line.match(/\b(?:penerima|kirim\s+ke)\s*[:\-–]?\s*([^|\n,]{3,60})/i);
          if (penerimaMatch) {
            const cleaned = penerimaMatch[1].replace(/[():\-–]/g, ' ').trim();
            if (!/(consignee|tujuan|customer|pengiriman|pengambilan|sumber|alamat|telepon)/i.test(cleaned) && cleaned.length > 3) {
              recipientName = cleaned;
            }
          }
        }
      }

      // Cek Nomor Telepon
      if (!recipientPhone) {
        const phoneMatch = line.match(/(?:telepon|telp|hp|wa|phone)?[\s:]*((?:08|\+628|\(0\d{2,3}\))[0-9\s\-]{7,15})\b/i);
        if (phoneMatch && phoneMatch[1].replace(/\D/g, '').length >= 9) {
          recipientPhone = phoneMatch[1].trim();
        }
      }

      // Cek Alamat Pengiriman (mengandung kata kunci jalan / blok / komplek / dusun / kelurahan / etc.)
      if (!destinationAddress) {
        const addrMatch = line.match(/(?:alamat\s*:\s*)((?:jl|jalan|blok|gd|komplek|dusun|desa|rt|rw)[^|\n]+)/i) ||
                          line.match(/\b((?:jl\.?|jalan)\s+[^|\n]+)/i);
        if (addrMatch) {
          destinationAddress = addrMatch[1].trim();
        }
      }

      // Cek Kota / Kabupaten
      if (!destinationCity) {
        const cityMatch = line.match(/(?:kota|kabupaten|kab\.?)\s*:\s*([^|\n]+)/i);
        if (cityMatch) {
          destinationCity = cityMatch[1].trim();
        }
      }
    }

    // 3. Ekstraksi Baris Item Barang
    for (const line of lines) {
      // Abaikan baris header, instruksi, footer atau ketentuan
      if (line.match(/^(no\b|daftar|instruksi|ketentuan|catatan|dibuat|pemeriksa|menyetujui|total|tanggal terbit|kode shipper|wms simple)/i)) {
        continue;
      }

      // Cek kecocokan SKU atau nama produk dari master
      const hasExactSku = products.some(p => p.sku_code && line.toUpperCase().includes(p.sku_code.toUpperCase()));
      let hasProductName = false;

      if (!hasExactSku) {
        for (const p of products) {
          const nameParts = (p.name || '').toLowerCase().split(/[\s\-_,./]+/).filter((x: string) => x.length > 3);
          if (nameParts.length >= 2) {
            const matched = nameParts.filter((np: string) => line.toLowerCase().includes(np));
            if (matched.length >= 2) {
              hasProductName = true;
              break;
            }
          }
        }
      }

      if (hasExactSku || hasProductName) {
        const detectedQty = extractItemQuantity(line);
        items.push(matchProduct(line, detectedQty, products));
      }
    }

    // Fallback jika tidak ada baris yang cocok tapi ada angka
    if (items.length === 0) {
      for (const line of lines) {
        if (line.match(/^(no|tanggal|penerima|telepon|alamat|total|kota|catatan|dibuat)/i)) continue;
        const qty = extractItemQuantity(line);
        if (qty > 0 && line.length > 5) {
          items.push(matchProduct(line, qty, products));
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
    let recipientPhone = '';
    let destinationAddress = '';
    let destinationCity = '';
    const items: ExtractedItem[] = [];

    // Cari header kolom dan metadata key-value
    let headerRowIdx = -1;
    let skuCol = -1;
    let nameCol = -1;
    let qtyCol = -1;

    for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
      const row = jsonData[r] || [];

      // Ekstraksi Metadata Key-Value (Label di sel C, Nilai di sel C+1)
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        const nextVal = String(row[c + 1] || '').trim();

        if (!customerRef) {
          if (/(?:no\.?\s*(?:po|do|ref|order)|po\/do)/i.test(val) && nextVal) {
            customerRef = nextVal;
          } else {
            const explicit = val.match(/\b((?:DO|PO|SPPB|SP|RO|SJ|REF|ORD)[-_/][A-Z0-9-_/]{4,35})\b/i);
            if (explicit) customerRef = explicit[1];
          }
        }

        if (!recipientName && /(?:penerima|consignee|kepada|tujuan)/i.test(val)) {
          if (nextVal && !/(?:telepon|alamat|kota|gudang)/i.test(nextVal)) {
            recipientName = nextVal;
          }
        }

        if (!recipientPhone && /(?:telepon|telp|hp|wa|phone)/i.test(val)) {
          if (nextVal && /(?:08|\+628|\(0\d)/.test(nextVal)) {
            recipientPhone = nextVal;
          }
        }

        if (!destinationAddress && /(?:alamat)/i.test(val)) {
          if (nextVal) destinationAddress = nextVal;
        }

        if (!destinationCity && /(?:kota|kabupaten|city)/i.test(val)) {
          if (nextVal) destinationCity = nextVal;
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
        recipient_phone: recipientPhone || entities.recipient_phone,
        destination_address: destinationAddress || entities.destination_address,
        destination_city: destinationCity || entities.destination_city,
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
      recipient_phone: recipientPhone,
      destination_address: destinationAddress,
      destination_city: destinationCity,
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
   * Parser Dokumen PDF (Ekstraksi teks digital rekonstruksi baris koordinat Y atau OCR jika scan fisik)
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

        // Rekonstruksi baris visual teks berdasarkan koordinat Y (toleransi 6pt)
        const linesMap = new Map<number, any[]>();
        const yTolerance = 6;

        for (const item of textContent.items as any[]) {
          if (!item.str || !item.str.trim()) continue;
          const y = item.transform[5];
          let matchedYKey: number | null = null;
          for (const key of linesMap.keys()) {
            if (Math.abs(key - y) <= yTolerance) {
              matchedYKey = key;
              break;
            }
          }
          if (matchedYKey === null) {
            matchedYKey = y;
            linesMap.set(matchedYKey, []);
          }
          linesMap.get(matchedYKey)!.push(item);
        }

        // Urutkan baris dari atas ke bawah (Y descending)
        const sortedYKeys = Array.from(linesMap.keys()).sort((a, b) => b - a);
        const pageLines: string[] = [];

        for (const y of sortedYKeys) {
          const itemsOnLine = linesMap.get(y)!;
          // Urutkan teks dalam baris dari kiri ke kanan (X ascending)
          itemsOnLine.sort((a, b) => a.transform[4] - b.transform[4]);
          const lineText = itemsOnLine.map(i => i.str.trim()).join(' ');
          pageLines.push(lineText);
        }

        fullExtractedText += pageLines.join('\n') + '\n';
      }

      // Jika teks digital PDF cukup panjang (> 40 karakter), gunakan hasil rekonstruksi baris!
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

      // Jika teks digital kosong/sangat sedikit (berarti PDF adalah scan gambar fisik), render halaman ke canvas lalu OCR!
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
