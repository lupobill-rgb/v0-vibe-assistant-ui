-- Pharma research studies demo dataset for Advanced Decisions
-- RLS enabled, public read access

CREATE TABLE IF NOT EXISTS research_studies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_code    text NOT NULL UNIQUE,
  title         text NOT NULL,
  therapeutic_area text NOT NULL CHECK (therapeutic_area IN (
    'Oncology', 'Cardiology', 'Neurology', 'Immunology', 'Rare Disease', 'Infectious Disease'
  )),
  phase         text NOT NULL CHECK (phase IN ('Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Preclinical')),
  status        text NOT NULL CHECK (status IN ('Recruiting', 'Active', 'Completed', 'Suspended', 'Terminated')),
  principal_investigator text NOT NULL,
  site_count    integer NOT NULL DEFAULT 1,
  enrolled      integer NOT NULL DEFAULT 0,
  target_enrollment integer NOT NULL DEFAULT 0,
  start_date    date NOT NULL,
  estimated_completion date,
  budget_usd    numeric(12,2) NOT NULL DEFAULT 0,
  sponsor       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: public read, authenticated write
ALTER TABLE research_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON research_studies
  FOR SELECT USING (true);

CREATE POLICY "Authenticated insert" ON research_studies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update" ON research_studies
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed 30 realistic pharma research studies
INSERT INTO research_studies (study_code, title, therapeutic_area, phase, status, principal_investigator, site_count, enrolled, target_enrollment, start_date, estimated_completion, budget_usd, sponsor) VALUES
  ('ADV-ONC-001', 'BEACON-1: PD-L1 Checkpoint Inhibitor in Advanced NSCLC', 'Oncology', 'Phase III', 'Active', 'Dr. Sarah Chen', 42, 312, 450, '2024-03-15', '2026-09-30', 28500000.00, 'Advanced Decisions Pharma'),
  ('ADV-ONC-002', 'PRISM: Bispecific Antibody in Relapsed DLBCL', 'Oncology', 'Phase II', 'Recruiting', 'Dr. Marcus Rivera', 18, 67, 200, '2025-01-10', '2027-06-15', 14200000.00, 'Advanced Decisions Pharma'),
  ('ADV-ONC-003', 'AURORA-3: ADC Targeting HER2-Low Breast Cancer', 'Oncology', 'Phase III', 'Active', 'Dr. Priya Kapoor', 55, 489, 600, '2023-11-01', '2026-05-01', 42000000.00, 'Advanced Decisions Pharma'),
  ('ADV-ONC-004', 'APEX: KRAS G12C Inhibitor in Pancreatic Adenocarcinoma', 'Oncology', 'Phase I', 'Recruiting', 'Dr. James Whitfield', 8, 24, 60, '2025-06-01', '2027-01-31', 6800000.00, 'Advanced Decisions Pharma'),
  ('ADV-ONC-005', 'MERIDIAN: CAR-T Therapy for Refractory Multiple Myeloma', 'Oncology', 'Phase II', 'Active', 'Dr. Aisha Okonkwo', 12, 88, 120, '2024-09-20', '2026-12-15', 22300000.00, 'Advanced Decisions Pharma'),
  ('ADV-CRD-001', 'PULSE-HF: SGLT2 Inhibitor in Preserved EF Heart Failure', 'Cardiology', 'Phase III', 'Active', 'Dr. Robert Yamamoto', 65, 1204, 1500, '2023-06-01', '2026-06-30', 38700000.00, 'Advanced Decisions Pharma'),
  ('ADV-CRD-002', 'RHYTHM: Novel Anticoagulant for AF Stroke Prevention', 'Cardiology', 'Phase III', 'Recruiting', 'Dr. Elena Vasquez', 38, 560, 900, '2024-08-15', '2027-03-01', 31200000.00, 'Advanced Decisions Pharma'),
  ('ADV-CRD-003', 'RESTORE: siRNA Therapy for Familial Hypercholesterolemia', 'Cardiology', 'Phase II', 'Active', 'Dr. Thomas Fischer', 14, 98, 150, '2025-02-01', '2027-02-28', 11500000.00, 'Advanced Decisions Pharma'),
  ('ADV-CRD-004', 'SHIELD-MI: Anti-Inflammatory in Post-MI Remodeling', 'Cardiology', 'Phase II', 'Completed', 'Dr. Mei-Lin Chang', 22, 180, 180, '2023-01-15', '2025-07-31', 15800000.00, 'Advanced Decisions Pharma'),
  ('ADV-CRD-005', 'VALVE: Percutaneous Repair Device Pivotal Trial', 'Cardiology', 'Phase III', 'Recruiting', 'Dr. David Nkemelu', 30, 210, 500, '2025-04-01', '2028-01-15', 44600000.00, 'Advanced Decisions Pharma'),
  ('ADV-NEU-001', 'CLARITY: Anti-Tau Antibody in Early Alzheimer Disease', 'Neurology', 'Phase III', 'Active', 'Dr. Helen Park', 50, 780, 1000, '2023-09-01', '2027-03-31', 52000000.00, 'Advanced Decisions Pharma'),
  ('ADV-NEU-002', 'SYNAPSE: Gene Therapy for Spinal Muscular Atrophy Type 2', 'Neurology', 'Phase II', 'Recruiting', 'Dr. Francisco Gutierrez', 10, 18, 40, '2025-07-01', '2028-06-30', 19400000.00, 'Advanced Decisions Pharma'),
  ('ADV-NEU-003', 'TREMOR-X: Deep Brain Stimulation Optimization in PD', 'Neurology', 'Phase III', 'Active', 'Dr. Ingrid Solberg', 28, 345, 400, '2024-02-15', '2026-08-31', 25100000.00, 'Advanced Decisions Pharma'),
  ('ADV-NEU-004', 'MIGRATE: CGRP Antagonist for Chronic Migraine', 'Neurology', 'Phase III', 'Completed', 'Dr. Raj Patel', 44, 620, 620, '2022-11-01', '2025-05-15', 29800000.00, 'Advanced Decisions Pharma'),
  ('ADV-NEU-005', 'CIRCUIT: ASO for Huntington Disease', 'Neurology', 'Preclinical', 'Active', 'Dr. Lisa Tanaka', 3, 0, 30, '2025-10-01', '2028-12-31', 8200000.00, 'Advanced Decisions Pharma'),
  ('ADV-IMM-001', 'SHIELD-RA: JAK1 Selective Inhibitor in Rheumatoid Arthritis', 'Immunology', 'Phase III', 'Active', 'Dr. Karen O''Brien', 36, 510, 650, '2024-01-20', '2026-07-31', 33400000.00, 'Advanced Decisions Pharma'),
  ('ADV-IMM-002', 'CALM: IL-23 Antibody in Moderate-to-Severe Crohn Disease', 'Immunology', 'Phase III', 'Recruiting', 'Dr. Ahmed Hassan', 32, 280, 500, '2024-11-01', '2027-05-15', 27600000.00, 'Advanced Decisions Pharma'),
  ('ADV-IMM-003', 'CLEAR: TYK2 Inhibitor in Plaque Psoriasis', 'Immunology', 'Phase II', 'Completed', 'Dr. Julia Sorensen', 20, 240, 240, '2023-05-01', '2025-04-30', 12900000.00, 'Advanced Decisions Pharma'),
  ('ADV-IMM-004', 'PROTECT-MS: BTK Inhibitor in Relapsing MS', 'Immunology', 'Phase II', 'Active', 'Dr. William Adeyemi', 16, 105, 160, '2025-03-01', '2027-09-30', 16700000.00, 'Advanced Decisions Pharma'),
  ('ADV-IMM-005', 'COMFORT: Anti-TSLP Antibody in Severe Atopic Dermatitis', 'Immunology', 'Phase III', 'Recruiting', 'Dr. Natalie Krueger', 40, 390, 700, '2024-06-15', '2027-01-31', 35200000.00, 'Advanced Decisions Pharma'),
  ('ADV-RD-001', 'HORIZON: Enzyme Replacement in Fabry Disease', 'Rare Disease', 'Phase III', 'Active', 'Dr. Christopher Lam', 15, 72, 90, '2024-04-01', '2027-04-30', 18600000.00, 'Advanced Decisions Pharma'),
  ('ADV-RD-002', 'GENESIS: Gene Therapy for Duchenne Muscular Dystrophy', 'Rare Disease', 'Phase I', 'Recruiting', 'Dr. Sandra Moreau', 6, 8, 24, '2025-09-01', '2028-08-31', 24500000.00, 'Advanced Decisions Pharma'),
  ('ADV-RD-003', 'BRIDGE: Substrate Reduction in Gaucher Disease Type 3', 'Rare Disease', 'Phase II', 'Active', 'Dr. Kenji Watanabe', 9, 31, 50, '2025-01-15', '2027-07-31', 10300000.00, 'Advanced Decisions Pharma'),
  ('ADV-RD-004', 'PEARL: mRNA Therapy for Phenylketonuria', 'Rare Disease', 'Preclinical', 'Active', 'Dr. Amanda Sterling', 2, 0, 20, '2026-01-01', '2029-06-30', 7100000.00, 'Advanced Decisions Pharma'),
  ('ADV-RD-005', 'ALPHA-1: Augmentation Therapy in Alpha-1 Antitrypsin Deficiency', 'Rare Disease', 'Phase III', 'Completed', 'Dr. Olaf Henriksen', 25, 340, 340, '2022-08-01', '2025-12-31', 21800000.00, 'Advanced Decisions Pharma'),
  ('ADV-INF-001', 'GUARD: Broad-Spectrum Antiviral for Respiratory Viruses', 'Infectious Disease', 'Phase II', 'Active', 'Dr. Maria Santos', 20, 145, 250, '2024-10-01', '2026-10-31', 13400000.00, 'Advanced Decisions Pharma'),
  ('ADV-INF-002', 'RESIST: Novel Antibiotic for Carbapenem-Resistant Infections', 'Infectious Disease', 'Phase III', 'Recruiting', 'Dr. Brian Osei', 34, 280, 450, '2024-07-01', '2027-01-15', 26900000.00, 'Advanced Decisions Pharma'),
  ('ADV-INF-003', 'PREVENT: Universal Influenza Vaccine', 'Infectious Disease', 'Phase II', 'Active', 'Dr. Catherine Dumont', 12, 600, 1000, '2025-05-01', '2027-04-30', 19700000.00, 'Advanced Decisions Pharma'),
  ('ADV-INF-004', 'CURE-HBV: Functional Cure for Chronic Hepatitis B', 'Infectious Disease', 'Phase I', 'Recruiting', 'Dr. Takeshi Mori', 7, 15, 45, '2025-11-01', '2028-05-31', 9800000.00, 'Advanced Decisions Pharma'),
  ('ADV-INF-005', 'SHIELD-TB: Short-Course Regimen for Drug-Resistant TB', 'Infectious Disease', 'Phase III', 'Active', 'Dr. Fatima Al-Rashid', 48, 520, 750, '2023-12-01', '2026-11-30', 32100000.00, 'Advanced Decisions Pharma');
