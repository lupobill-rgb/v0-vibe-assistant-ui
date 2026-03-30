-- GTM Scoring tables + UbiGrowth pipeline seed data
-- Idempotent: IF NOT EXISTS on DDL, NOT EXISTS guards on INSERTs

-- ============================================================
-- PART A: Scoring tables
-- ============================================================
CREATE TABLE IF NOT EXISTS gtm_prospect_scores (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        REFERENCES organizations(id),
  lead_id               uuid        REFERENCES gtm_leads(id) ON DELETE CASCADE,
  score                 integer,
  band                  text        CHECK (band IN ('hot','warm','cold')),
  key_signals           text[],
  pain_points           text[],
  rationale             text,
  recommended_angle     text,
  tone_recommendation   text,
  scored_at             timestamptz DEFAULT now()
);

ALTER TABLE gtm_prospect_scores ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gtm_prospect_signals (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        REFERENCES organizations(id),
  lead_id           uuid        REFERENCES gtm_leads(id) ON DELETE CASCADE,
  signal_type       text,
  signal_data       jsonb,
  signal_strength   text        CHECK (signal_strength IN ('high','medium','low')),
  source            text,
  detected_at       timestamptz DEFAULT now()
);

ALTER TABLE gtm_prospect_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies (org members only, same pattern as gtm_deals)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gtm_prospect_scores' AND policyname='gtm_prospect_scores_org_member') THEN
    CREATE POLICY gtm_prospect_scores_org_member ON gtm_prospect_scores FOR ALL
      USING (organization_id IN (
        SELECT o.id FROM organizations o JOIN teams t ON t.org_id=o.id JOIN team_members tm ON tm.team_id=t.id WHERE tm.user_id=auth.uid()))
      WITH CHECK (organization_id IN (
        SELECT o.id FROM organizations o JOIN teams t ON t.org_id=o.id JOIN team_members tm ON tm.team_id=t.id WHERE tm.user_id=auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gtm_prospect_signals' AND policyname='gtm_prospect_signals_org_member') THEN
    CREATE POLICY gtm_prospect_signals_org_member ON gtm_prospect_signals FOR ALL
      USING (organization_id IN (
        SELECT o.id FROM organizations o JOIN teams t ON t.org_id=o.id JOIN team_members tm ON tm.team_id=t.id WHERE tm.user_id=auth.uid()))
      WITH CHECK (organization_id IN (
        SELECT o.id FROM organizations o JOIN teams t ON t.org_id=o.id JOIN team_members tm ON tm.team_id=t.id WHERE tm.user_id=auth.uid()));
  END IF;
END $$;

-- ============================================================
-- PART B: Seed UbiGrowth pipeline
-- ============================================================
DO $$
DECLARE
  _org uuid := '3de82e57-4813-4ad6-83bd-2adb461604f0';
BEGIN
  -- B1: Seed gtm_leads (8 rows)
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Advanced Decisions' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Advanced Decisions','pharma','VP Technology','qualified',92,'referral','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Brain Surgery Worldwide' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Brain Surgery Worldwide','analytics','COO','qualified',88,'inbound','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='PlayKout' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'PlayKout','entertainment/education','Founder','contacted',78,'outbound','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Meridian Growth Partners' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Meridian Growth Partners','PE','Managing Director','qualified',85,'referral','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Vertex Analytics' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Vertex Analytics','SaaS','Head of Ops','contacted',74,'outbound','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Clearpath Biotech' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Clearpath Biotech','biotech','CTO','new',71,'inbound','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Northgate Capital' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Northgate Capital','PE','VP Portfolio Ops','new',68,'outbound','','');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_leads WHERE company='Horizon Media Group' AND organization_id=_org) THEN
    INSERT INTO gtm_leads (organization_id,company,industry,job_title,status,score,source,first_name,last_name)
    VALUES (_org,'Horizon Media Group','media','Chief Digital Officer','new',55,'outbound','','');
  END IF;

  -- B2: Seed gtm_deals (8 rows, matched by company)
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Advanced Decisions' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'Advanced Decisions – VIBE Platform','Advanced Decisions','demo_scheduled',79000,75,'referral');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Brain Surgery Worldwide' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'BSW – Analytics Dashboard','Brain Surgery Worldwide','proposal_sent',95000,65,'inbound');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='PlayKout' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'PlayKout – Content Platform','PlayKout','discovery',45000,40,'outbound');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Meridian Growth Partners' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'Meridian – Portfolio Ops','Meridian Growth Partners','demo_scheduled',65000,70,'referral');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Vertex Analytics' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'Vertex – Ops Automation','Vertex Analytics','discovery',38000,35,'outbound');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Clearpath Biotech' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'Clearpath – Lab Dashboard','Clearpath Biotech','prospect',52000,20,'inbound');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Northgate Capital' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'Northgate – Fund Reporting','Northgate Capital','prospect',42000,15,'outbound');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_deals WHERE company='Horizon Media Group' AND organization_id=_org) THEN
    INSERT INTO gtm_deals (organization_id,name,company,stage,value,probability,source)
    VALUES (_org,'Horizon – Digital Ops','Horizon Media Group','prospect',29000,10,'outbound');
  END IF;

  -- B3: Seed gtm_prospect_scores (8 rows, referencing leads by company)
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Advanced Decisions' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Advanced Decisions' AND organization_id=_org LIMIT 1),92,'hot',ARRAY['Active evaluation','Budget approved'],ARRAY['Manual reporting','Compliance gaps'],'Strong buying signals with budget authority','ROI + compliance automation','Executive, data-driven');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Brain Surgery Worldwide' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Brain Surgery Worldwide' AND organization_id=_org LIMIT 1),88,'hot',ARRAY['Proposal requested','COO sponsor'],ARRAY['Fragmented analytics','Slow dashboards'],'C-suite engaged, proposal stage','Unified analytics platform','Strategic, outcome-focused');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='PlayKout' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='PlayKout' AND organization_id=_org LIMIT 1),78,'warm',ARRAY['Founder-led','Growing team'],ARRAY['Content ops scaling','Manual workflows'],'Founder interested, needs proof of scale','Speed to market','Collaborative, founder-friendly');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Meridian Growth Partners' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Meridian Growth Partners' AND organization_id=_org LIMIT 1),85,'hot',ARRAY['Multi-portfolio need','Demo booked'],ARRAY['Portfolio visibility','Manual roll-ups'],'PE firm with portfolio-wide pain','Portfolio ops at scale','Professional, metrics-driven');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Vertex Analytics' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Vertex Analytics' AND organization_id=_org LIMIT 1),74,'warm',ARRAY['SaaS operator','Ops focus'],ARRAY['Tool sprawl','Integration gaps'],'Mid-funnel, needs integration story','Unified ops layer','Technical, integration-focused');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Clearpath Biotech' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Clearpath Biotech' AND organization_id=_org LIMIT 1),71,'warm',ARRAY['CTO exploring','Biotech growth'],ARRAY['Regulatory reporting','Data silos'],'Technical buyer exploring options','Compliance + speed','Technical, compliance-aware');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Northgate Capital' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Northgate Capital' AND organization_id=_org LIMIT 1),68,'warm',ARRAY['PE operator','Cost conscious'],ARRAY['Manual fund reporting','LP updates'],'Early stage, price sensitive','Cost reduction + LP transparency','Conservative, ROI-focused');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM gtm_prospect_scores ps JOIN gtm_leads l ON l.id=ps.lead_id WHERE l.company='Horizon Media Group' AND ps.organization_id=_org) THEN
    INSERT INTO gtm_prospect_scores (organization_id,lead_id,score,band,key_signals,pain_points,rationale,recommended_angle,tone_recommendation)
    VALUES (_org,(SELECT id FROM gtm_leads WHERE company='Horizon Media Group' AND organization_id=_org LIMIT 1),55,'cold',ARRAY['Digital transformation'],ARRAY['Legacy systems','Slow adoption'],'Low urgency, long sales cycle','Future-proofing narrative','Patient, educational');
  END IF;
END $$;
