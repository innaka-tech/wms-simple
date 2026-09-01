# 02_Bulky_Curah_and_Debulking.md

**Document:** Bulky, Curah (Bulk Cargo), and De-bulking Operations  
**Scope:** Inbound, Weighbridge, Storage, Conversion / Bagging-Off, Shrinkage Management  
**Version:** 2.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Konsep Penanganan Kargo: Bulky vs Curah

Dalam sistem logistik komprehensif, komoditas dibagi menjadi beberapa kelompok penanganan fisik:

| Kategori Kargo | Karakteristik Fisik | Contoh Komoditas | Unit Penyimpanan / Kemasan | Kebutuhan Penanganan Khusus |
|---|---|---|---|---|
| **Bulky & Heavy Lift** | Barang ukuran besar, satuan terikat/unitized, berat > 500 kg per unit | Gula Rafinasi Jumbo Bag 1 Ton, Steel Coil, Bal Kapas, Mesin Pabrik | Jumbo Bag (FIBC), Steel Drum, Pallet Kayu Heavy, Kontainer | Forklift tonase besar (> 5 Ton), Crane, Floor Staging Area |
| **Curah Kering (Dry Bulk)** | Komoditas berbentuk butiran/tepung/bubuk tanpa kemasan individu | Gula pasir curah, Jagung, Gandum, Pupuk curah, Semen curah | Silo Kering, Bunker Gudang, Truk Dump Truck Curah | Jembatan Timbang Truk, Conveyor, Silo Discharge, Uji Kadar Air |
| **Curah Cair (Liquid Bulk)** | Cairan tanpa kemasan botol/jerigen | CPO (Minyak Sawit Mentah), Bahan Kimia Cair, BBM, Oli Curah | Tangki Timbun (*Storage Tank*), Truk Tangki (*Tanker*) | Jembatan Timbang / Flowmeter, Pompa Transfer, Segel Pipa |

---

## 2. Proses "Bulky yang Kemudian Dicurah" (De-bulking / Bagging-Off / Decanting)

**Definisi:** Proses operasional di gudang di mana barang masuk dalam bentuk kemasan besar (*Bulky Parent*), kemudian dipecah, dicurah, atau dikemas ulang (*repacking / bagging-off / decanting*) menjadi satuan yang lebih kecil (*Child Product*) atau dipindahkan ke silo curah untuk kebutuhan distribusi retail / sub-distributor.

### 2.1 Contoh Skenario Riil
1. **Gula Rafinasi / Pupuk:**
   - Masuk: 10 Unit Jumbo Bag @ 1.000 KG (Total 10.000 KG kargo bulky).
   - Proses De-bulking: Jumbo bag diangkat dengan forklift, bagian corong bawah dibuka di atas hopper mesin bagging.
   - Hasil Output: 398 Karung @ 25 KG (Total 9.950 KG).
   - Susut / Shrinkage: 50 KG (0.50% loss karena debu/penimbangan), masih dalam batas toleransi wajar (<= 1.0%).
2. **Oli Curah / Cairan Kimia:**
   - Masuk: 1 Truk Tangki ISO Tank 20.000 Liter (Bulky Liquid).
   - Proses Decanting: Cairan dialirkan ke dalam 100 Drum @ 200 Liter.

### 2.2 Rumus Perhitungan Susut (Shrinkage Rate)
$$\text{Susut (KG)} = \text{Total Berat Input Bulky (KG)} - \text{Total Berat Output Curah/Karung (KG)}$$
$$\text{Persentase Susut (\%)} = \left( \frac{\text{Susut (KG)}}{\text{Total Berat Input Bulky (KG)}} \right) \times 100\%$$

*Jika Persentase Susut > `allowable_shrinkage_percentage` (default 1.0%), sistem secara otomatis memicu `Alert: DEBULKING_SHRINKAGE_HIGH` untuk investigasi kepala gudang.*

---

## 3. Diagram Alur De-bulking (Flowchart)

```mermaid
flowchart TD
    classDef bulky fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef process fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef curah fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#d32f2f,stroke-width:2px;

    IN_BULK(["Stok Barang Bulky di Gudang (Contoh: Jumbo Bag 1 Ton)"]):::bulky --> WO["Buat Work Order De-bulking (Actor: WH_MANAGER)"]:::process

    WO --> WEIGH_IN["1. Timbang dan Verifikasi Input Bulky (Stock Movement: DEBULKING_INPUT)"]:::process

    WEIGH_IN --> PROCESS["2. Proses Pencurahan dan Bagging-Off (Staf Lapangan dan Mesin Bagging)"]:::process

    PROCESS --> WEIGH_OUT["3. Timbang dan Catat Output Karung / Curah (Stock Movement: DEBULKING_OUTPUT)"]:::curah

    WEIGH_OUT --> CALC_LOSS{"Kalkulasi Susut: Apakah Susut di atas 1.0 persen Toleransi?"}:::process

    CALC_LOSS -->|Ya| ALERT_LOSS["Alert: DEBULKING_SHRINKAGE_HIGH (Notifikasi Investigasi Manajer)"]:::alert
    CALC_LOSS -->|Tidak| CLOSE_WO
    ALERT_LOSS --> CLOSE_WO

    CLOSE_WO["4. Selesaikan Work Order (Status: COMPLETED, Catat Checkpoint Audit)"]:::process --> END_STOCK(["Stok Siap Distribusi (Karung 25kg di Rak / Curah di Silo)"]):::curah
```

---

## 4. Diagram Sequence De-bulking (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Staff as WH Staff / Operator
    actor Mgr as WH Manager
    participant App as WMS Simple API
    participant DB as Host PostgreSQL
    participant Alert as Alerts Engine

    Mgr->>App: POST /api/debulking (Work Order Baru)
    Note over Mgr,App: Input Parent SKU (Jumbo Bag 1T), Target Output (Karung 25kg)
    App->>DB: INSERT INTO stock_conversions (Status: IN_PROGRESS)
    DB-->>App: Work Order Created (DEBULK-XXXX)

    Staff->>App: POST /api/debulking/execute
    Note over Staff,App: Catat Input 1.000 KG dan Output 398 Karung (9.950 KG)
    
    rect rgb(240, 248, 255)
        Note over App,DB: Double-Entry Ledger Execution
        App->>DB: UPDATE stock_levels (Kurangi 1 Jumbo Bag Bulky)
        App->>DB: INSERT stock_movements (DEBULKING_INPUT, -1 Unit / -1000 KG)
        App->>DB: UPDATE stock_levels (Tambah 398 Karung 25kg)
        App->>DB: INSERT stock_movements (DEBULKING_OUTPUT, +398 Unit / +9950 KG)
    end

    App->>App: Hitung Susut: 50 KG (0.50 persen dari Total Input)
    
    opt Jika Susut Melebihi Toleransi (di atas 1.0 persen)
        App->>Alert: Trigger Alert DEBULKING_SHRINKAGE_HIGH
        Alert->>DB: INSERT INTO alerts (Severity: WARNING)
    end

    App->>DB: INSERT INTO checkpoint_logs (DEBULKING_COMPLETED, actor_name: Staff)
    App->>DB: UPDATE stock_conversions (Status: COMPLETED)
    App-->>Staff: Response: De-bulking Selesai dan Saldo Stok Terkini
```
