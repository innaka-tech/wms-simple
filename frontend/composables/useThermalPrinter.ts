import { ref } from 'vue';

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

  return {
    isConnected,
    isPrinting,
    statusMessage,
    connectBluetoothPrinter,
    sendRawBytes,
    printGatePassReceipt,
    printSuratJalanSwap
  };
}
