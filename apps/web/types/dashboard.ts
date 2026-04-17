export interface DashboardTheme {
  mode: 'light' | 'dark' | 'system';
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  logoUrl?: string;
  companyName?: string;
}

export interface DashboardMeta {
  title: string;
  subtitle?: string;
  department: string;
  generated_at: string;
  data_source: 'sample' | 'connected' | 'empty';
  connector?: string;
  theme?: DashboardTheme;
}

export interface KPICard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  change_period?: string;
  trend?: 'up' | 'down' | 'flat';
  format?: 'currency' | 'percent' | 'number' | 'text';
  /** Optional array of historical values for inline sparkline rendering. */
  sparkline?: number[];
}

export interface ChartBlock {
  id: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'funnel';
  title: string;
  data: Record<string, unknown>[];
  x_key: string;
  y_keys: string[];
}

export interface TableColumn {
  key: string;
  label: string;
  format?: string;
}

export interface TableBlock {
  id: string;
  title: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

export interface AlertBlock {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action_label?: string;
}

export interface ActionBlock {
  id: string;
  label: string;
  action: 'accept' | 'dismiss' | 'modify' | 'navigate';
  payload?: Record<string, unknown>;
}

export interface DashboardData {
  meta: DashboardMeta;
  kpis: KPICard[];
  charts: ChartBlock[];
  tables?: TableBlock[];
  alerts?: AlertBlock[];
  actions?: ActionBlock[];
}
