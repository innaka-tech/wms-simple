# 05_Fleet_Exit_and_Security_Gate_Flows.md

**Document:** Fleet Exit Log & Security Gate Pass Specification  
**Operations Area:** Security Post, Gate-Out Inspection, Gate-In Check, Overdue Monitoring  
**Version:** 2.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Diagram Alur Pos Satpam Gerbang (Flowchart)

```mermaid
flowchart TD
    classDef gate fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef decide fill:#fffde7,stroke:#fbc02d,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;

    ARRIVE_GATE(["Armada Truk Tiba di Pos Gerbang Keluar (Membawa Muatan Manifest / Outbound)"]):::gate --> INSP_OUT["1. Pemeriksaan Fisik Keluar Pos Satpam (Cek: Surat Jalan Sah, Segel Box, Odometer, BBM)"]:::gate

    INSP_OUT --> VALID_DOC{"Dokumen Sah dan Terdaftar?"}:::decide
    VALID_DOC -->|Tidak Sah| REJECT_GATE["Tolak Keberangkatan - Tahan Truk di Pos Keamanan"]:::alert
    VALID_DOC -->|Sah| SUBMIT_GATE_OUT

    SUBMIT_GATE_OUT["2. Submit Gate-Out Log - Input: Odometer Out, BBM Out, Foto Depan Truk (Status Log: DEPARTED, Kendaraan: IN_USE)"]:::action

    SUBMIT_GATE_OUT --> TRIP["3. Armada Beroperasi di Luar Gudang"]:::action

    TRIP --> TIME_CHECK{"Waktu melebihi expected_return_time?"}:::decide
    TIME_CHECK -->|Ya| ALERT_OVERDUE["Alert: FLEET_OVERDUE (Notifikasi Manajer dan Security)"]:::alert
    TIME_CHECK -->|Tidak| GATE_IN

    ALERT_OVERDUE --> GATE_IN

    GATE_IN["4. Armada Tiba di Pos Gerbang Masuk (Cek: Kondisi Fisik Truk, Odometer In, BBM In)"]:::gate

    GATE_IN --> SUBMIT_GATE_IN["5. Submit Gate-In Log - Hitung Otomatis: Jarak Tempuh = Odo In dikurangi Odo Out (Status: RETURNED)"]:::action

    SUBMIT_GATE_IN --> COMPLETED(["6. Armada Selesai dan Parkir di Pool"]):::action
```

---

## 2. Diagram Sequence Pos Satpam Gerbang (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Pengemudi Truk
    actor Satpam as Petugas Satpam Gerbang
    actor Mgr as Warehouse Manager
    participant API as WMS Simple API
    participant DB as Host PostgreSQL
    participant Alert as Alerts Engine

    Driver->>Satpam: Tiba di Pos Keluar membawa Truk dan Surat Jalan
    Satpam->>API: GET /api/crossdock/:id atau /api/outbound/:id
    API-->>Satpam: Data Manifest Valid (MNF-XXXX / XDOC-XXXX)

    Note over Satpam,API: Inspeksi Fisik: Odometer 45.200 km, BBM FULL, Segel Aman
    Satpam->>API: POST /api/fleet/departure
    API->>DB: INSERT INTO fleet_exit_logs (Status: DEPARTED)
    API->>DB: UPDATE vehicles SET status = 'IN_USE', last_odometer_km = 45200
    API->>DB: INSERT INTO checkpoint_logs (FLEET_DEPARTED, actor_name: Satpam)
    DB-->>API: Gate Pass Out Approved (GATE-OUT-XXXX)
    API-->>Satpam: Buka Palang Gerbang Keluar

    Note over Driver: Armada Menjalankan Pengiriman (In-Transit)

    opt Jika Melewati Batas Waktu (Overdue)
        API->>Alert: Check Overdue Scheduler
        Alert->>DB: INSERT INTO alerts (FLEET_OVERDUE, Severity: CRITICAL)
        Alert-->>Mgr: Notifikasi: Truk B 9188 WMS Melewati Batas Kembali
    end

    Driver->>Satpam: Truk Tiba Kembali di Pos Gerbang Masuk
    Note over Satpam,API: Inspeksi Kembali: Odometer 45.420 km, BBM 3/4, Foto Truk
    Satpam->>API: POST /api/fleet/logs/:id/return
    API->>API: Hitung Jarak Tempuh: 45.420 dikurangi 45.200 = 220 KM
    API->>DB: UPDATE fleet_exit_logs (Status: RETURNED, distance: 220 km)
    API->>DB: UPDATE vehicles SET status = 'AVAILABLE', last_odometer_km = 45420
    API->>DB: INSERT INTO checkpoint_logs (FLEET_RETURNED, actor_name: Satpam)
    API-->>Satpam: Gate Pass In Selesai. Palang Dibuka.
```
