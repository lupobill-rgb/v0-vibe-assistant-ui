# NAV INVENTORY — UbiVibe UI Surface Map

Generated: 2026-04-08 | Source: `apps/web/app/` file audit

---

## 1. PRIMARY NAV

Sidebar rendered by `components/app-sidebar.tsx`. Visible to all authenticated users unless noted.

| Label | Route | Status | What user sees | Backend dependency | Notes |
|-------|-------|--------|----------------|-------------------|-------|
| Home | `/` | ✅ WORKS | Hero banner, recommendation banner, prompt card, projects grid | Supabase: `org_feature_flags` | Redirects to `/onboarding` if feature flag set |
| Projects | `/projects` | ✅ WORKS | Project cards grid with New Project + Import from GitHub buttons | API: `fetchProjects()` | Empty grid for fresh user — expected |
| Chat | `/chat` | ✅ WORKS | Prompt submission card + job history list with status badges | API: `fetchProjectJobs()` | Empty history for fresh user — expected |
| Marketplace | `/marketplace` | ✅ WORKS | Browse/Installed tabs, connectors + skills sections, category filter | Supabase: `skills`; Nango: connector status | OAuth badges for HubSpot, Airtable, Slack, GA4, Mixpanel, Salesforce |
| Feed | `/feed` | 🟡 PARTIAL | Hero banner + FeedSubscribeCard | API: `GET /assets/feed?team_id=` | Shows "No data yet" unless teams have published assets via `published_assets` |
| Operations | `/operations` | 🟡 PARTIAL | KPI cards: connectors, AI usage, jobs, spend | Supabase: `team_integrations`, `jobs`, `autonomous_executions`, `team_spend` | **Only visible when team name = "Operations".** Shows "No data yet" if tables empty |
| Executive | `/executive` | 🟡 PARTIAL | KPI cards: pipeline, usage, team perf, AI insights | Supabase: `skill_recommendations`; API: exec endpoints | **Only visible when team name = "Executive".** Needs populated data to show anything |
| Settings | `/settings` | ✅ WORKS | API connection status, LLM provider toggle, preflight pipeline config, integration keys | `localStorage` (LLM pref); API health check | Read-only except LLM provider toggle |
| Compliance | `/compliance` | 🟡 PARTIAL | Audit log table + governance version card with tamper detection | Supabase: `compliance_audit_log`, `approval_signatures`, `governance_versions` | **Tables not on main** — page will render empty until migrations merged |
| Help & Support | `/help` | ✅ WORKS | Static FAQ accordion + external links | None (static) | — |
| Billing | `/billing` | ✅ WORKS | Plan details, usage stats, feature comparison | `BillingDashboard` component; Stripe via API | Shows Starter tier for free users |

---

## 2. SECONDARY / NESTED ROUTES

| Route | Status | What user sees | Backend | Notes |
|-------|--------|----------------|---------|-------|
| `/building/[id]` | ✅ WORKS | Full build view: pipeline stages, thought stream, terminal, preview iframe, publish button | Supabase realtime: `jobs`; API: `createJob`, `publishJob` | Core build experience |
| `/task/[id]` | ✅ WORKS | Pipeline tracker sidebar + preview iframe or terminal | API: `fetchJob()` (polls 2s) | Alternative build view |
| `/projects/[id]` | ✅ WORKS | Passthrough — redirects to `/building/[id]` | None | Not a real page |
| `/pricing` | ✅ WORKS | Plan comparison page | `PricingPage` component | Linked from billing banner in sidebar |
| `/login` | ✅ WORKS | Email/password sign-in + sign-up | `supabase.auth` | No OAuth/SSO |
| `/select-team` | ✅ WORKS | Team picker cards + team creation form + role modal | Supabase: `team_members`, `org_members`, `teams` | Shown after first login or when user has no team |
| `/onboarding` | 🟡 PARTIAL | 5-step enterprise onboarding wizard with Nango connector flow | Supabase: `onboarding_sessions`, `onboarding_steps`, `onboarding_connectors` | **Tables not on main** — will error unless migrations merged |

---

## 3. MODALS / DRAWERS / OVERLAYS

| Component | Trigger location | What it does | Status |
|-----------|-----------------|-------------|--------|
| `CreateProjectDialog` | Sidebar "New Project" button; `/projects` page button | Name input → `createProject()` → routes to `/chat?project=<id>` | ✅ WORKS |
| `ConnectDatasourceDialog` | Sidebar "Connect Data Source" button; `/marketplace` connector cards | Dropdown: 11 connectors. Initiates OAuth via Nango, stores `connection_id` | ✅ WORKS (HubSpot + Decipher verified) |
| `ImportGithubDialog` | `/projects` page "Import from GitHub" button | GitHub repo URL input → `importGithubProject()` | UNVERIFIED — needs manual click-through |
| `CustomConnectorDialog` | Available as component, trigger not wired in nav | Name, base URL, auth method, description → `POST /api/connectors/custom` | 🔵 PLACEHOLDER — not reachable from UI |
| Domain/Publish Modal | `/building/[id]` "Publish" button | Publish flow + custom domain DNS instructions | ✅ WORKS |
| `UpgradeModal` | Hitting plan limits (projects/credits) | Shows usage, next tier, redirects to Stripe checkout | ✅ WORKS |
| Skill Detail Drawer | `/marketplace` skill card click | Right-side slide-in panel with skill details | ✅ WORKS |
| Role Picker | `/select-team` team card click | Role selection (IC/Lead/Manager/Director/Executive/Admin) before team join | ✅ WORKS |
| `CommandPalette` | Press `/` key anywhere | Global search/command palette | UNVERIFIED — needs manual click-through |
| Team Switcher | Sidebar dropdown | Lists all org teams, switches active team | ✅ WORKS — "New Team" button disabled |

---

## 4. SETTINGS / PROFILE / ACCOUNT

**Settings page** (`/settings`) has 4 sections — all read-only display except LLM toggle:

| Section | What it shows | Persists? | Notes |
|---------|--------------|-----------|-------|
| API Connection | API URL + live health badge, Tenant ID, timestamp | N/A (read-only) | ✅ |
| LLM Configuration | GPT-4 vs Claude toggle; max iterations/context/diff (read-only) | Yes (`localStorage`) | ✅ |
| Preflight Pipeline | 4 stages: Lint, Typecheck, Test, Smoke + timeout | N/A (read-only, env-controlled) | ✅ |
| Integrations | Masked OpenAI key + GitHub token | N/A (server-side only display) | ✅ |

**`CustomDomainSettings` component exists** but is NOT rendered on the settings page.

**No profile/account page exists.** User identity is sidebar-only (team switcher + sign out).

---

## 5. AUTH SURFACES

| Surface | Route | Status | Notes |
|---------|-------|--------|-------|
| Login (email/password) | `/login` | ✅ WORKS | `signInWithPassword` + `signUp` via Supabase Auth |
| Team selection | `/select-team` | ✅ WORKS | Team picker + creation + role assignment |
| Onboarding wizard | `/onboarding` | 🟡 PARTIAL | Depends on `onboarding_*` tables not yet on main |
| Password reset | — | ❌ NOT BUILT | No reset flow in the app |
| OAuth / SSO | — | ❌ NOT BUILT | No Google/GitHub/WorkOS SSO |
| Sign out | Sidebar button | ✅ WORKS | `supabase.auth.signOut()` → redirect `/login` |

---

## 6. ORPHAN ROUTES

Routes with `page.tsx` that are **not linked from sidebar nav**:

| Route | Reachable via | Notes |
|-------|--------------|-------|
| `/task/[id]` | Direct URL only | Alternative build view — not in sidebar, no in-app link found |
| `/pricing` | Billing banner "Upgrade" link | Not a sidebar item |
| `/onboarding` | Redirect from `/` when feature flag set | Not a sidebar item |
| `/select-team` | Redirect after login when no team | Not a sidebar item |
| `/login` | Unauthenticated redirect | Not a sidebar item (expected) |

---

## 7. DEAD LINKS

| Surface | Link target | Issue |
|---------|------------|-------|
| None found | — | All sidebar nav items resolve to existing `page.tsx` files |

**Note:** `CustomDomainSettings` component exists but is not mounted anywhere — it's unreachable. Not a dead link but dead code.

---

## 8. EMPTY STATES vs. REAL DATA

| Surface | Fresh user sees | Bug or expected? |
|---------|----------------|-----------------|
| `/` (Home) | Empty projects grid, prompt card visible | Expected — no projects yet |
| `/projects` | Empty grid with "New Project" button | Expected |
| `/chat` | Prompt card, empty job history | Expected |
| `/marketplace` | All connectors visible (none connected), all skills visible | Expected — connect to populate |
| `/feed` | "No data yet" or empty subscribe list | Expected — no published assets |
| `/operations` | "No data yet" across all KPI cards | Expected — needs job/connector activity |
| `/executive` | "No data yet" across all sections | Expected — needs org-wide activity |
| `/compliance` | Empty audit log table | Expected (also: tables not on main yet) |
| `/billing` | Starter (free) tier, 0 credits used | Expected |
| `/building/[id]` | Build stages + real-time progress | Real data — active build |
| `/settings` | API status badge, default LLM config | Real data (health check is live) |
