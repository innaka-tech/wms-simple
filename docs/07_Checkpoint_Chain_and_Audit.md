# 07_Checkpoint_Chain_and_Audit.md

**Document:** Immutable Checkpoint Chain & Audit Trail Architecture  
**Core Principles:** Cryptographic/Linked-List Integrity, Mandatory Petugas Name, Zero Ambiguity  
**Version:** 2.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Arsitektur Rantai Audit Checkpoint (Linked-List Chain)

Setiap aksi perpindahan status atau pemutakhiran fisik dalam WMS Simple secara otomatis dicatat dalam rantai log yang menunjuk ke ID checkpoint sebelumnya (`prev_checkpoint_id`). Hal ini menjamin bahwa seluruh riwayat transaksi tidak dapat disisipkan atau dimanipulasi di tengah jalan.

```mermaid
flowchart LR
    classDef cp fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;

    CP1["1. PO_CREATED (Actor: Siti, prev: NULL)"]:::cp --> 
    CP2["2. PO_RECEIVED (Actor: Joko, Evidence: Foto Bongkar, prev: ID_CP1)"]:::cp --> 
    CP3["3. CROSS_DOC_ISSUED (Actor: Siti, Evidence: Swap SJ, prev: ID_CP2)"]:::cp --> 
    CP4["4. MANIFEST_LOADED (Actor: Joko, prev: ID_CP3)"]:::cp --> 
    CP5["5. FLEET_DEPARTED (Actor: Hendro, Evidence: Foto dan Odo, prev: ID_CP4)"]:::cp
```

### 1.1 Struktur Data Rekaman Checkpoint (`checkpoint_logs`)
- `id`: UUID Primary Key.
- `entity_type`: Tipe entitas bisnis (`INBOUND_ORDER`, `STOCK_CONVERSION`, `CROSS_DOCK_MANIFEST`, `CROSS_DOCUMENT`, `OUTBOUND_ORDER`, `FLEET_EXIT_LOG`).
- `entity_id`: UUID referensi dokumen induk.
- `entity_number`: Nomor identitas dokumen resmi yang mudah dibaca manusia (misal: `PO-12345678`, `XDOC-88991122`, `GATE-OUT-55443322`).
- `step_code` & `step_label`: Kode langkah terstandarisasi.
- `actor_name` (*Mandatory Petugas Name*): Nama personel pelaksana fisik (validasi wajib minimal 2 karakter).
- `actor_role`: Peran pengguna saat aksi dilakukan.
- `photo_urls` (JSONB): Array URL bukti fisik.
- `metadata` (JSONB): Parameter numerik atau catatan teknis tambahan.
- `prev_checkpoint_id`: Pointer ke baris log audit sebelumnya.

---

## 2. Diagram Sequence Pembuatan Checkpoint (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Petugas Lapangan / Admin
    participant API as WMS Simple API
    participant Service as Checkpoint Service
    participant DB as Host PostgreSQL

    Officer->>API: Submit Tindakan Operasional (Contoh: Putaway / Gate-Out)
    Note over Officer,API: Wajib menyertakan actor_name: Joko Susanto dan Evidence Foto

    API->>Service: recordCheckpoint(params)
    
    Service->>Service: Validasi: actor_name tidak boleh kosong
    alt actor_name kosong
        Service-->>API: Throw Error: Nama petugas pelaksana wajib diisi
        API-->>Officer: 400 Bad Request
    else actor_name valid
        Service->>DB: Query prev_checkpoint_id terakhir dari entity_id ini
        DB-->>Service: Return prev_id (atau NULL jika langkah 1)
        Service->>DB: INSERT INTO checkpoint_logs (entity_type, entity_id, actor_name, prev_checkpoint_id)
        DB-->>Service: Return new Checkpoint Record
        Service-->>API: Checkpoint Saved & Linked
        API-->>Officer: Response 200 OK (Audit Trail Updated)
    end
```
