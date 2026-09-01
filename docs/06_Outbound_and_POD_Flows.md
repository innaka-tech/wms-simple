# 06_Outbound_and_POD_Flows.md

**Document:** Outbound Fulfillment & Digital POD Flow Specification  
**Operations Area:** Order Processing, Bin Picking, Packing/Boxing, Shipping, Delivery POD  
**Version:** 2.0.0  
**Status:** LOCKED & ACTIVE  

---

## 1. Diagram Alur Outbound (Flowchart)

```mermaid
flowchart TD
    classDef action fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef staff fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef gate fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef pod fill:#fff3e0,stroke:#f57c00,stroke-width:2px;
    classDef alert fill:#ffebee,stroke:#c62828,stroke-width:2px;

    REQ(["Order Pelanggan / Permintaan Kirim"]) --> STEP1["1. Order Dibuat di Sistem (Validasi: Stok Tersedia on_hand dikurangi reserved)"]:::action

    STEP1 --> STEP2["2. Picking dari Lokasi Rak / Bin (Stock: on_hand berkurang, reserved bertambah)"]:::staff

    STEP2 --> STEP3["3. Packing, Box Sealing, Labeling (Input: box_code, weight_kg, dimensions)"]:::staff

    STEP3 --> STEP4["4. Pos Satpam Gerbang Keluar - Pencatatan Armada Keluar (Status Order: SHIPPED)"]:::gate

    STEP4 --> STEP5["5. Pengiriman Last-Mile ke Penerima (Actor: DRIVER Ekspedisi)"]:::action

    STEP5 --> STEP6["6. Serah Terima dan Submit POD Digital - TTD Layar Sentuh dan Foto Fisik (Status: DELIVERED)"]:::pod

    STEP6 --> STEP7["7. Verifikasi Dokumen POD oleh Admin (Status: POD_VERIFIED dan Siap Invoicing)"]:::action

    STEP7 --> COMPLETED(["Fulfillment Outbound Selesai"]):::action

    %% SLA Alert
    ALERT_SLA["Alert: POD Belum Diverifikasi (Lewat H+1 dari Delivered)"]:::alert -.-> STEP7
```

---

## 2. Diagram Sequence Outbound & POD (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Cust as Customer / Admin
    actor Picker as WH Staff (Picker)
    actor Packer as WH Staff (Packer)
    actor Driver as Driver
    actor Recipient as Penerima Barang
    actor Admin as Admin Adm
    participant API as WMS Simple API
    participant DB as Host PostgreSQL

    Cust->>API: POST /api/outbound (Order ORD-XXXX)
    API->>DB: INSERT INTO outbound_orders & outbound_items (Status: CREATED)
    API->>DB: INSERT INTO checkpoint_logs (ORDER_CREATED)

    Picker->>API: POST /api/outbound/:id/pick (Ambil dari Bin)
    API->>DB: UPDATE stock_levels (on_hand -, reserved +)
    API->>DB: INSERT stock_movements (OUTBOUND_PICK)
    API->>DB: INSERT INTO checkpoint_logs (PICKING_COMPLETED)

    Packer->>API: POST /api/outbound/:id/pack (Kemas & Segel)
    API->>DB: INSERT INTO packages (box_code, weight_kg)
    API->>DB: INSERT INTO checkpoint_logs (PACKING_COMPLETED)

    Note over Driver,API: Driver Berangkat via Pos Satpam (Status: SHIPPED)
    Driver->>Recipient: Antar Barang ke Alamat Tujuan
    Recipient->>Driver: Tanda Tangan Digital & Terima Fisik

    Driver->>API: POST /api/outbound/:id/pod
    Note over Driver,API: Upload Foto Serah Terima & TTD Digital Penerima
    API->>DB: INSERT INTO pod_documents (Status: ACCEPTED)
    API->>DB: UPDATE outbound_orders (Status: DELIVERED)
    API->>DB: INSERT INTO checkpoint_logs (DELIVERED)

    Admin->>API: POST /api/outbound/:id/verify-pod (Verifikasi Admin)
    API->>DB: UPDATE pod_documents (verified_at: NOW)
    API->>DB: UPDATE outbound_orders (Status: POD_VERIFIED)
    API->>DB: INSERT INTO checkpoint_logs (POD_VERIFIED, actor_name: Admin)
    API-->>Admin: Order Outbound Resmi Selesai
```
