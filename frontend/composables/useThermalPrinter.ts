import { ref } from 'vue';

export interface ReceiptRow {
  type?: 'text' | 'row' | 'divider' | 'double-divider' | 'spacer';
  text?: string;
  left?: string;
  right?: string;
  bold?: boolean;
  size?: 'normal' | 'large';
  align?: 'left' | 'center' | 'right';
}

export function useThermalPrinter() {
  const isConnected = ref(false);
  const isPrinting = ref(false);
  const statusMessage = ref('');
  const bluetoothDevice = ref<any>(null);
  const printCharacteristic = ref<any>(null);

  // ESC/POS Command Constants
  const ESC = 0x1B;
  const GS = 0x1D;

  function initBuffer(): number[] {
    return [ESC, 0x40]; // ESC @ : Initialize printer
  }

  function setAlign(align: 'LEFT' | 'CENTER' | 'RIGHT'): number[] {
    const code = align === 'CENTER' ? 1 : align === 'RIGHT' ? 2 : 0;
    return [ESC, 0x61, code]; // ESC a n
  }

  function setBold(enable: boolean): number[] {
    return [ESC, 0x45, enable ? 1 : 0]; // ESC E n
  }

  function setSize(size: 'NORMAL' | 'DOUBLE_HEIGHT' | 'DOUBLE_WIDTH' | 'LARGE'): number[] {
    let code = 0x00;
    if (size === 'DOUBLE_HEIGHT') code = 0x01;
    if (size === 'DOUBLE_WIDTH') code = 0x10;
    if (size === 'LARGE') code = 0x11;
    return [GS, 0x21, code]; // GS ! n
  }

  function stringToBytes(text: string): number[] {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  }

  function addLine(text: string = ''): number[] {
    return [...stringToBytes(text), 0x0A]; // 0x0A = Line Feed
  }

  function addDivider(char: string = '-', length: number = 32): number[] {
    return addLine(char.repeat(length));
  }

  function addRow(left: string, right: string, totalWidth: number = 32): number[] {
    const spaceCount = Math.max(1, totalWidth - (left.length + right.length));
    const line = left + ' '.repeat(spaceCount) + right;
    return addLine(line);
  }

  function cutPaper(): number[] {
    return [0x0A, 0x0A, 0x0A, GS, 0x56, 0x42, 0x00]; // Feed 3 lines & Cut
  }

  // Browser Print Dialog Fallback (for Desktop & non-Bluetooth devices)
  function printReceiptViaBrowser(title: string, rows: ReceiptRow[]): boolean {
    if (typeof window === 'undefined') return false;

    const content = rows.map(r => {
      if (r.type === 'divider') return '<div class="divider"></div>';
      if (r.type === 'double-divider') return '<div class="double-divider"></div>';
      if (r.type === 'spacer') return '<div style="height: 10px;"></div>';
      if (r.type === 'row') {
        const boldCls = r.bold ? ' bold' : '';
        return `<div class="row${boldCls}"><span class="row-left">${r.left || ''}</span><span class="row-right">${r.right || ''}</span></div>`;
      }
      const alignCls = r.align === 'center' ? ' text-center' : r.align === 'right' ? ' text-right' : '';
      const boldCls = r.bold ? ' bold' : '';
      const sizeCls = r.size === 'large' ? ' large' : '';
      return `<div class="${alignCls}${boldCls}${sizeCls}">${r.text || '&nbsp;'}</div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { margin: 0; padding: 8px; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      width: 72mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 10px 6px;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .large { font-size: 14px; font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .double-divider { border-top: 2px solid #000; margin: 5px 0; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .row-left { text-align: left; }
    .row-right { text-align: right; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    try {
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }, 250);
        return true;
      }
    } catch (e) {
      console.error('Browser print fallback error:', e);
    }
    return false;
  }

  async function connectBluetoothPrinter(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      statusMessage.value = 'Web Bluetooth tidak didukung pada browser ini. Gunakan Google Chrome Android.';
      return false;
    }

    try {
      statusMessage.value = 'Mencari printer Bluetooth...';
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC Bluetooth Raw Print
        ]
      });

      bluetoothDevice.value = device;
      statusMessage.value = `Menghubungkan ke ${device.name || 'Printer Bluetooth'}...`;

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            printCharacteristic.value = char;
            isConnected.value = true;
            statusMessage.value = `Terhubung ke ${device.name || 'Printer'}`;
            return true;
          }
        }
      }

      statusMessage.value = 'Karakteristik write printer tidak ditemukan.';
      return false;
    } catch (err: any) {
      statusMessage.value = `Gagal terhubung: ${err.message}`;
      return false;
    }
  }

  async function sendRawBytes(bytes: number[]): Promise<boolean> {
    if (!printCharacteristic.value) {
      // If no Bluetooth device connected, simulate instant success
      console.log('ESC/POS Print Stream (Simulation):', bytes);
      return true;
    }

    isPrinting.value = true;
    try {
      const buffer = new Uint8Array(bytes);
      const CHUNK_SIZE = 100;

      for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
        const chunk = buffer.slice(i, i + CHUNK_SIZE);
        await printCharacteristic.value.writeValue(chunk);
      }
      return true;
    } catch (err: any) {
      statusMessage.value = `Error mencetak: ${err.message}`;
      return false;
    } finally {
      isPrinting.value = false;
    }
  }

  // Preset Template 1: Gate Pass Struk Satpam (58mm / 80mm)
  async function printGatePassReceipt(data: {
    log_number: string;
    plate_number: string;
    driver_name: string;
    purpose: string;
    odometer_out: number;
    odometer_in?: number;
    fuel_level_out: string;
    departure_time?: string;
    officer_name: string;
    type: 'GATE_OUT' | 'GATE_IN';
  }) {
    // If bluetooth is connected, stream ESC/POS bytes
    if (printCharacteristic.value) {
      let bytes: number[] = initBuffer();

      bytes.push(...setAlign('CENTER'));
      bytes.push(...setSize('DOUBLE_HEIGHT'));
      bytes.push(...setBold(true));
      bytes.push(...addLine('WMS SIMPLE ENTERPRISE'));
      bytes.push(...setSize('NORMAL'));
      bytes.push(...setBold(false));
      bytes.push(...addLine('STRUK RESMI POS SATPAM GERBANG'));
      bytes.push(...addDivider('='));

      bytes.push(...setAlign('LEFT'));
      bytes.push(...addRow('NO. PASS:', data.log_number));
      bytes.push(...addRow('TIPE:', data.type === 'GATE_OUT' ? 'GATE-OUT (KELUAR)' : 'GATE-IN (KEMBALI)'));
      bytes.push(...addRow('NO. POLISI:', data.plate_number));
      bytes.push(...addRow('SOPIR:', data.driver_name));
      bytes.push(...addRow('KEPERLUAN:', data.purpose));
      bytes.push(...addDivider('-'));

      bytes.push(...addRow('ODO AWAL:', `${data.odometer_out} KM`));
      if (data.odometer_in) {
        bytes.push(...addRow('ODO AKHIR:', `${data.odometer_in} KM`));
        const dist = (data.odometer_in - data.odometer_out).toFixed(1);
        bytes.push(...setBold(true));
        bytes.push(...addRow('TOTAL JARAK:', `${dist} KM`));
        bytes.push(...setBold(false));
      }
      bytes.push(...addRow('BBM SOLAR:', data.fuel_level_out));
      bytes.push(...addRow('PETUGAS:', data.officer_name));
      bytes.push(...addRow('WAKTU:', new Date().toLocaleTimeString('id-ID')));
      bytes.push(...addDivider('='));

      bytes.push(...setAlign('CENTER'));
      bytes.push(...addLine('Tanda Tangan Petugas Pos'));
      bytes.push(...addLine(''));
      bytes.push(...addLine(''));
      bytes.push(...addLine(`( ${data.officer_name} )`));
      bytes.push(...addLine('Simpan bukti ini selama di perjalanan'));
      bytes.push(...cutPaper());

      return await sendRawBytes(bytes);
    }

    // Fallback: trigger browser print dialog with styled 80mm layout
    const rows: ReceiptRow[] = [
      { text: 'WMS SIMPLE ENTERPRISE', bold: true, size: 'large', align: 'center' },
      { text: 'STRUK RESMI POS SATPAM GERBANG', align: 'center' },
      { type: 'double-divider' },
      { type: 'row', left: 'NO. PASS:', right: data.log_number },
      { type: 'row', left: 'TIPE:', right: data.type === 'GATE_OUT' ? 'GATE-OUT (KELUAR)' : 'GATE-IN (KEMBALI)' },
      { type: 'row', left: 'NO. POLISI:', right: data.plate_number },
      { type: 'row', left: 'SOPIR:', right: data.driver_name },
      { type: 'row', left: 'KEPERLUAN:', right: data.purpose },
      { type: 'divider' },
      { type: 'row', left: 'ODO AWAL:', right: `${data.odometer_out} KM` },
    ];

    if (data.odometer_in) {
      const dist = (data.odometer_in - data.odometer_out).toFixed(1);
      rows.push({ type: 'row', left: 'ODO AKHIR:', right: `${data.odometer_in} KM` });
      rows.push({ type: 'row', left: 'TOTAL JARAK:', right: `${dist} KM`, bold: true });
    }

    rows.push(
      { type: 'row', left: 'BBM SOLAR:', right: data.fuel_level_out },
      { type: 'row', left: 'PETUGAS:', right: data.officer_name },
      { type: 'row', left: 'WAKTU:', right: new Date().toLocaleTimeString('id-ID') },
      { type: 'double-divider' },
      { text: 'Tanda Tangan Petugas Pos', align: 'center' },
      { type: 'spacer' },
      { type: 'spacer' },
      { text: `( ${data.officer_name} )`, align: 'center' },
      { text: 'Simpan bukti ini selama di perjalanan', align: 'center' }
    );

    return printReceiptViaBrowser(`Gate-Pass-${data.log_number}`, rows);
  }

  // Preset Template 2: Surat Jalan Titipan Swap / Blind Shipping
  async function printSuratJalanSwap(data: {
    doc_number: string;
    origin_sender: string;
    blind_recipient: string;
    item_name: string;
    qty: number;
    unit: string;
    driver_name: string;
    plate_number: string;
  }) {
    if (printCharacteristic.value) {
      let bytes: number[] = initBuffer();

      bytes.push(...setAlign('CENTER'));
      bytes.push(...setBold(true));
      bytes.push(...setSize('DOUBLE_HEIGHT'));
      bytes.push(...addLine('SURAT JALAN TITIPAN (3PL)'));
      bytes.push(...setSize('NORMAL'));
      bytes.push(...addLine('PT LOGISTIK BERSAMA NUSANTARA'));
      bytes.push(...addDivider('='));

      bytes.push(...setAlign('LEFT'));
      bytes.push(...setBold(false));
      bytes.push(...addRow('NO. SJ:', data.doc_number));
      bytes.push(...addRow('PENGIRIM:', data.origin_sender));
      bytes.push(...addRow('PENERIMA:', data.blind_recipient));
      bytes.push(...addRow('ARMADA:', data.plate_number));
      bytes.push(...addRow('DRIVER:', data.driver_name));
      bytes.push(...addDivider('-'));

      bytes.push(...addRow('DESKRIPSI BARANG', 'JUMLAH'));
      bytes.push(...setBold(true));
      bytes.push(...addRow(data.item_name, `${data.qty} ${data.unit}`));
      bytes.push(...setBold(false));
      bytes.push(...addDivider('='));

      bytes.push(...setAlign('CENTER'));
      bytes.push(...addLine('Diterima Oleh,       Diserahkan Oleh,'));
      bytes.push(...addLine(''));
      bytes.push(...addLine(''));
      bytes.push(...addLine('( Penerima )         ( Driver/Petugas )'));
      bytes.push(...cutPaper());

      return await sendRawBytes(bytes);
    }

    // Browser Fallback
    const rows: ReceiptRow[] = [
      { text: 'SURAT JALAN TITIPAN (3PL)', bold: true, size: 'large', align: 'center' },
      { text: 'PT LOGISTIK BERSAMA NUSANTARA', align: 'center' },
      { type: 'double-divider' },
      { type: 'row', left: 'NO. SJ:', right: data.doc_number },
      { type: 'row', left: 'PENGIRIM:', right: data.origin_sender },
      { type: 'row', left: 'PENERIMA:', right: data.blind_recipient },
      { type: 'row', left: 'ARMADA:', right: data.plate_number },
      { type: 'row', left: 'DRIVER:', right: data.driver_name },
      { type: 'divider' },
      { type: 'row', left: 'DESKRIPSI BARANG', right: 'JUMLAH' },
      { type: 'row', left: data.item_name, right: `${data.qty} ${data.unit}`, bold: true },
      { type: 'double-divider' },
      { text: 'Diterima Oleh,       Diserahkan Oleh,', align: 'center' },
      { type: 'spacer' },
      { type: 'spacer' },
      { text: '( Penerima )         ( Driver/Petugas )', align: 'center' }
    ];

    return printReceiptViaBrowser(`SJ-${data.doc_number}`, rows);
  }

  // Preset Template 3: Struk Terbit Surat Jalan + Nomor Resi (semua jenis pengiriman)
  async function printWaybillReceipt(data: {
    order_number: string;
    sj_number: string;
    resi_number: string;
    recipient_name: string;
    destination?: string;
    issued_by: string;
  }) {
    if (printCharacteristic.value) {
      let bytes: number[] = initBuffer();

      bytes.push(...setAlign('CENTER'));
      bytes.push(...setSize('DOUBLE_HEIGHT'));
      bytes.push(...setBold(true));
      bytes.push(...addLine('SURAT JALAN + RESI'));
      bytes.push(...setSize('NORMAL'));
      bytes.push(...setBold(false));
      bytes.push(...addLine('WMS SIMPLE ENTERPRISE'));
      bytes.push(...addDivider('='));

      bytes.push(...setAlign('LEFT'));
      bytes.push(...addRow('ORDER:', data.order_number));
      bytes.push(...setBold(true));
      bytes.push(...addRow('NO. SJ:', data.sj_number));
      bytes.push(...addRow('NO. RESI:', data.resi_number));
      bytes.push(...setBold(false));
      bytes.push(...addRow('PENERIMA:', data.recipient_name));
      if (data.destination) {
        bytes.push(...addRow('TUJUAN:', data.destination));
      }
      bytes.push(...addRow('DITERBITKAN:', data.issued_by));
      bytes.push(...addRow('WAKTU:', new Date().toLocaleString('id-ID')));
      bytes.push(...addDivider('='));

      bytes.push(...setAlign('CENTER'));
      bytes.push(...addLine('Surat jalan sah untuk keluar gerbang.'));
      bytes.push(...addLine('Wajib ditunjukkan di pos satpam.'));
      bytes.push(...cutPaper());

      return await sendRawBytes(bytes);
    }

    // Browser Fallback
    const rows: ReceiptRow[] = [
      { text: 'SURAT JALAN + RESI', bold: true, size: 'large', align: 'center' },
      { text: 'WMS SIMPLE ENTERPRISE', align: 'center' },
      { type: 'double-divider' },
      { type: 'row', left: 'ORDER:', right: data.order_number },
      { type: 'row', left: 'NO. SJ:', right: data.sj_number, bold: true },
      { type: 'row', left: 'NO. RESI:', right: data.resi_number, bold: true },
      { type: 'row', left: 'PENERIMA:', right: data.recipient_name },
    ];

    if (data.destination) {
      rows.push({ type: 'row', left: 'TUJUAN:', right: data.destination });
    }

    rows.push(
      { type: 'row', left: 'DITERBITKAN:', right: data.issued_by },
      { type: 'row', left: 'WAKTU:', right: new Date().toLocaleString('id-ID') },
      { type: 'double-divider' },
      { text: 'Surat jalan sah untuk keluar gerbang.', align: 'center' },
      { text: 'Wajib ditunjukkan di pos satpam.', align: 'center' }
    );

    return printReceiptViaBrowser(`Waybill-${data.resi_number}`, rows);
  }

  // Preset Template 4: Tiket Jembatan Timbang (Weighbridge Slip 58mm / 80mm)
  async function printWeighbridgeReceipt(data: {
    ticket_number: string;
    warehouse_name?: string;
    truck_plate: string;
    driver_name?: string;
    reference_id?: string;
    reference_type?: string;
    first_weight_gross_kg: number;
    second_weight_tare_kg?: number | null;
    net_weight_cargo_kg?: number | null;
    operator_name: string;
    date?: string;
  }) {
    const rows: ReceiptRow[] = [
      { text: 'WMS SIMPLE ENTERPRISE', bold: true, size: 'large', align: 'center' },
      { text: 'TIKET JEMBATAN TIMBANG TRUK', align: 'center' },
      { text: (data.warehouse_name || 'STASIUN TIMBANGAN').toUpperCase(), align: 'center' },
      { type: 'double-divider' },
      { type: 'row', left: 'NO. TIKET:', right: data.ticket_number, bold: true },
      { type: 'row', left: 'NO. POLISI:', right: data.truck_plate },
      { type: 'row', left: 'PENGEMUDI:', right: data.driver_name || '-' },
      { type: 'row', left: 'REFERENSI:', right: `${data.reference_type || 'CARGO'} / ${data.reference_id || '-'}` },
      { type: 'divider' },
      { type: 'row', left: 'BERAT 1 (GROSS):', right: `${Number(data.first_weight_gross_kg).toLocaleString()} KG`, bold: true }
    ];

    if (data.second_weight_tare_kg !== null && data.second_weight_tare_kg !== undefined) {
      rows.push(
        { type: 'row', left: 'BERAT 2 (TARE):', right: `${Number(data.second_weight_tare_kg).toLocaleString()} KG` },
        { type: 'divider' },
        { type: 'row', left: 'MUATAN (NETTO):', right: `${Number(data.net_weight_cargo_kg || 0).toLocaleString()} KG`, bold: true, size: 'large' }
      );
    } else {
      rows.push(
        { type: 'divider' },
        { text: 'STATUS: MENUNGGU TIMBANG KEDUA', align: 'center', bold: true }
      );
    }

    rows.push(
      { type: 'double-divider' },
      { type: 'row', left: 'OPERATOR:', right: data.operator_name },
      { type: 'row', left: 'WAKTU:', right: data.date || new Date().toLocaleString('id-ID') },
      { type: 'spacer' },
      { text: 'Tiket sah jembatan timbang resmi.', align: 'center' },
      { text: 'Harap disimpan sebagai bukti timbang.', align: 'center' }
    );

    return printReceiptViaBrowser(`TiketTimbang-${data.ticket_number}`, rows);
  }

  return {
    isConnected,
    isPrinting,
    statusMessage,
    connectBluetoothPrinter,
    sendRawBytes,
    printReceiptViaBrowser,
    printGatePassReceipt,
    printSuratJalanSwap,
    printWaybillReceipt,
    printWeighbridgeReceipt
  };
}


