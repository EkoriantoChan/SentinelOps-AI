-- SentinelOps AI (Ide 9 · Smart Manufacturing & Maintenance Governance)
DROP SCHEMA IF EXISTS ide09 CASCADE;
CREATE SCHEMA ide09;

-- ============================================================================
-- 1. GOVERNANCE & SECURITY TABLES (Exact Instructor Architecture)
-- ============================================================================
CREATE TABLE ide09.allowed_chats (
    chat_id     TEXT PRIMARY KEY,
    nama        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'supervisor' -- 'technician' | 'supervisor'
);

CREATE TABLE ide09.allowed_tools (
    tool        TEXT PRIMARY KEY,
    tulis       BOOLEAN NOT NULL,
    deskripsi   TEXT NOT NULL
);

CREATE TABLE ide09.pending_actions (
    id              BIGSERIAL PRIMARY KEY,
    request_id      TEXT NOT NULL,
    chat_id         TEXT NOT NULL,
    tool            TEXT NOT NULL,
    args            JSONB NOT NULL,
    ringkasan       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled' | 'rejected'
    dibuat_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    diputuskan_at   TIMESTAMPTZ
);
CREATE INDEX ON ide09.pending_actions (request_id);

CREATE TABLE ide09.audit_log (
    id          BIGSERIAL PRIMARY KEY,
    waktu       TIMESTAMPTZ NOT NULL DEFAULT now(),
    chat_id     TEXT,
    event       TEXT NOT NULL,
    detail      JSONB
);

-- ============================================================================
-- 2. SMART MANUFACTURING ASSET REGISTRY & OPERATIONAL TABLES
-- ============================================================================
CREATE TABLE ide09.equipment_registry (
    asset_tag           TEXT PRIMARY KEY,
    nama_mesin          TEXT NOT NULL,
    line_area           TEXT NOT NULL,
    bay_name            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'ACTIVE',
    dibuat_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ide09.equipment_faults (
    id                  SERIAL PRIMARY KEY,
    asset_tag           TEXT NOT NULL REFERENCES ide09.equipment_registry(asset_tag),
    line_area           TEXT NOT NULL,              -- e.g. 'Rolling Mill Line 2'
    deskripsi           TEXT NOT NULL,
    severity            TEXT NOT NULL DEFAULT 'MEDIUM', -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    maintenance_type    TEXT NOT NULL DEFAULT 'corrective', -- 'corrective' | 'preventive' | 'inspection'
    downtime_mins       INTEGER NOT NULL DEFAULT 0,
    tenggat             DATE,
    status              TEXT NOT NULL DEFAULT 'terbuka', -- 'terbuka' | 'selesai'
    dibuat_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ide09.sparepart_expenses (
    id          SERIAL PRIMARY KEY,
    asset_tag   TEXT,
    part_name   TEXT NOT NULL,
    jumlah      INTEGER NOT NULL,
    kategori    TEXT NOT NULL,                      -- 'elektrik' | 'mekanik' | 'instrumentasi' | 'consumable'
    vendor      TEXT,
    tanggal     DATE NOT NULL,
    catatan     TEXT,
    sumber      TEXT NOT NULL DEFAULT 'agent',
    dibuat_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ide09.inspection_reminders (
    id          SERIAL PRIMARY KEY,
    chat_id     TEXT NOT NULL,
    asset_tag   TEXT,
    teks        TEXT NOT NULL,
    waktu       TIMESTAMPTZ NOT NULL,
    status      TEXT NOT NULL DEFAULT 'aktif',      -- 'aktif' | 'terkirim'
    dibuat_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. SEED DATA (Allowlist, Least-Privilege Tools & Plant Sample Records)
-- ============================================================================
INSERT INTO ide09.allowed_chats (chat_id, nama, role) VALUES
 ('1845199518', 'Supervisor Utama', 'supervisor');

INSERT INTO ide09.allowed_tools (tool, tulis, deskripsi) VALUES
 ('daftar_faults',   false, 'Baca daftar equipment fault yang masih terbuka'),
 ('lapor_fault',     true,  'Usulkan pencatatan laporan kerusakan mesin baru'),
 ('catat_sparepart', true,  'Usulkan pencatatan biaya spare-part atau perbaikan darurat'),
 ('buat_inspeksi',   true,  'Usulkan jadwal pengingat inspeksi ulang peralatan'),
 ('tutup_fault',     true,  'Usulkan penutupan SATU laporan fault berdasarkan id');

INSERT INTO ide09.equipment_registry (asset_tag, nama_mesin, line_area, bay_name) VALUES
 ('CONV-L1',       'Feed Line Conveyor 1',       'Rolling Mill Line 1',     'Bay 1: Rolling Mill'),
 ('CONV-L2',       'Main Heavy Conveyor 2',      'Rolling Mill Line 2',     'Bay 1: Rolling Mill'),
 ('CONV-L3',       'Finishing Conveyor 3',       'Rolling Mill Line 3',     'Bay 1: Rolling Mill'),
 ('FURNACE-01',    'Electric Arc Furnace 01',    'Melting Shop Bay A1',     'Bay 2: Melting Shop'),
 ('FURNACE-02',    'Electric Arc Furnace 02',    'Melting Shop Bay A2',     'Bay 2: Melting Shop'),
 ('FURNACE-03',    'Electric Arc Furnace 03',    'Melting Shop Bay A3',     'Bay 2: Melting Shop'),
 ('MCC-PANEL-A',   'Substation Feeder Panel A',  'Substation Feeder A',     'Bay 3: Substation'),
 ('MCC-PANEL-B',   'Substation Feeder Panel B',  'Substation Feeder B',     'Bay 3: Substation'),
 ('MCC-PANEL-C',   'Substation Feeder Panel C',  'Substation Feeder C',     'Bay 3: Substation'),
 ('HYD-PRESS-03',  'Hydraulic Forging Press 03', 'Heavy Forging Press Bay', 'Bay 4: Utilities'),
 ('MOTOR-PUMP-04', 'Water Treatment Pump 04',   'Water Treatment Station', 'Bay 4: Utilities')
ON CONFLICT (asset_tag) DO NOTHING;

INSERT INTO ide09.equipment_faults (asset_tag, line_area, deskripsi, severity, maintenance_type, downtime_mins, tenggat) VALUES
 ('CONV-L2', 'Rolling Mill Line 2', 'Motor conveyor trip overcurrent saat beban penuh, kontaktor utama bergetar', 'HIGH', 'corrective', 45, '2026-11-20'),
 ('FURNACE-01', 'Melting Shop Bay A', 'Drift pembacaan sensor thermocouple zona 3 (+14C), perlu kalibrasi ulang', 'MEDIUM', 'preventive', 0, '2026-11-19'),
 ('MCC-PANEL-A', 'Substation Utama', 'Inspeksi thermography rutin busbar feeder 380V', 'LOW', 'inspection', 0, '2026-11-21');

INSERT INTO ide09.sparepart_expenses (asset_tag, part_name, jumlah, kategori, vendor, tanggal, catatan, sumber) VALUES
 ('CONV-L2', 'Magnetic Contactor 3-Phase 65A', 450000, 'elektrik', 'PT Sumber Teknik Medan', '2026-11-15', 'Penggantian darurat shift 2', 'seed'),
 ('HYD-PRESS-03', 'Bearing SKF 6205-2RS & Seal Kit', 285000, 'mekanik', 'CV Mitra Industri', '2026-11-16', 'Preventive overhaul pompa hidrolik', 'seed'),
 ('FURNACE-01', 'Thermocouple Type-K High Temp', 620000, 'instrumentasi', 'PT Jaya Kontrol', '2026-11-17', 'Stok cadangan zona melting', 'seed');