// Domain configs for scripts/generate-templates.mjs.
// Each config feeds a parameterized dashboard generator. Keep sample
// data realistic and representative — placeholder zeros pass the length
// gate but make preview builds look broken.
//
// Shape:
//   slug, title, moduleName, sidebarNav (7 items),
//   tabs (5 items: {id,label}),
//   kpis (6 items: {id,label,value,trend,direction}),
//   charts (4-5 items: {canvasId,tab,type,title,subtitle,sampleKey,sampleData}),
//   tables (2-3 items: {tableId,tab,title,subtitle,sampleKey,columns,sampleData}).
//
// Columns format: [{header,field,kind?}] where kind can be
// 'mono' | 'strong' | 'pill-ok-warn-danger' | 'pill-severity'.

const STD_SIDEBAR = (extra) => ['Dashboard', ...extra, 'Reports', 'Settings'];

function cfg({ slug, title, moduleName, sidebarNav, tabs, kpis, charts, tables }) {
  const sampleData = { kpis };
  for (const c of charts) sampleData[c.sampleKey] = c.sampleData;
  for (const t of tables) sampleData[t.sampleKey] = t.sampleData;
  return { slug, title, moduleName, sidebarNav, tabs, sampleData, charts, tables };
}

const MONTHS_12 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKS_12 = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'];
const DAYS_7 = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ─── 1. Executive Dashboard ──────────────────────────────────────────────
const executiveDashboard = cfg({
  slug: 'executive-dashboard',
  title: 'Executive Dashboard',
  moduleName: 'Executive',
  sidebarNav: STD_SIDEBAR(['Metrics','Customers','Growth','Team']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'growth',label:'Growth'},
    {id:'customers',label:'Customers'},
    {id:'financials',label:'Financials'},
    {id:'team',label:'Team'},
  ],
  kpis: [
    {id:'arr',label:'ARR',value:'$24.8M',trend:'+18.3%',direction:'up'},
    {id:'nrr',label:'Net Revenue Retention',value:'118%',trend:'+4pp',direction:'up'},
    {id:'customers',label:'Customers',value:'1,420',trend:'+92',direction:'up'},
    {id:'gross-margin',label:'Gross Margin',value:'74%',trend:'+2pp',direction:'up'},
    {id:'cash',label:'Cash on Hand',value:'$42M',trend:'+8%',direction:'up'},
    {id:'headcount',label:'Headcount',value:'318',trend:'+24',direction:'up'},
  ],
  charts: [
    {
      canvasId:'arrTrend',tab:'overview',type:'line',
      title:'ARR Trend',subtitle:'Trailing 12 months',
      sampleKey:'arrTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'ARR ($M)',data:[14.2,15.1,16.0,16.9,17.8,18.9,19.6,20.8,21.9,22.8,23.9,24.8],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'growthBySegment',tab:'growth',type:'bar',
      title:'Growth by Segment',subtitle:'YoY % by customer tier',
      sampleKey:'growthBySegment',
      sampleData:{labels:['Enterprise','Mid-Market','SMB','Startup'],datasets:[
        {label:'YoY %',data:[24,18,12,8],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'customerMix',tab:'customers',type:'doughnut',
      title:'Customer Mix',subtitle:'Revenue share by segment',
      sampleKey:'customerMix',
      sampleData:{labels:['Enterprise','Mid-Market','SMB','Startup'],counts:[52,28,14,6]}
    },
    {
      canvasId:'marginTrend',tab:'financials',type:'line',
      title:'Gross Margin',subtitle:'12-month trend',
      sampleKey:'marginTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'Gross Margin %',data:[68,68,69,70,70,71,72,72,73,73,74,74],borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'headcountTrend',tab:'team',type:'bar',
      title:'Headcount Growth',subtitle:'Net hires per quarter',
      sampleKey:'headcountTrend',
      sampleData:{labels:['Q1','Q2','Q3','Q4'],datasets:[
        {label:'Net Hires',data:[42,38,26,24],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'topAccounts',tab:'customers',title:'Top Accounts by ARR',subtitle:'Largest 8 customers',
      sampleKey:'topAccounts',
      columns:[
        {header:'Account',field:'name',kind:'strong'},
        {header:'Segment',field:'segment'},
        {header:'ARR',field:'arr'},
        {header:'Renewal',field:'renewal',kind:'mono'},
        {header:'Health',field:'health',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Acme Corp',segment:'Enterprise',arr:'$2.4M',renewal:'2026-09-15',health:'Healthy'},
        {name:'Globex',segment:'Enterprise',arr:'$1.8M',renewal:'2026-11-30',health:'Healthy'},
        {name:'Initech',segment:'Mid-Market',arr:'$920K',renewal:'2026-06-20',health:'At Risk'},
        {name:'Umbrella',segment:'Enterprise',arr:'$1.5M',renewal:'2027-01-10',health:'Healthy'},
        {name:'Stark Industries',segment:'Enterprise',arr:'$2.1M',renewal:'2026-08-05',health:'Healthy'},
        {name:'Wayne Enterprises',segment:'Enterprise',arr:'$1.9M',renewal:'2026-12-01',health:'Healthy'},
        {name:'Tyrell Corp',segment:'Mid-Market',arr:'$780K',renewal:'2026-05-22',health:'At Risk'},
        {name:'Soylent Corp',segment:'SMB',arr:'$240K',renewal:'2026-04-30',health:'Delayed'},
      ]
    },
    {
      tableId:'execPriorities',tab:'overview',title:'Q2 Priorities',subtitle:'OKR tracking',
      sampleKey:'execPriorities',
      columns:[
        {header:'Priority',field:'name',kind:'strong'},
        {header:'Owner',field:'owner'},
        {header:'Target',field:'target'},
        {header:'Progress',field:'progress'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Launch enterprise tier',owner:'S. Chen',target:'30 customers',progress:'22/30',status:'On Track'},
        {name:'Expand to EMEA',owner:'M. Patel',target:'5 countries',progress:'3/5',status:'On Track'},
        {name:'Reduce churn to 4%',owner:'R. Martinez',target:'4%',progress:'5.2%',status:'At Risk'},
        {name:'Ship v2 API',owner:'K. Liu',target:'Apr 30',progress:'85%',status:'On Track'},
        {name:'SOC2 Type II',owner:'J. Park',target:'Jun 15',progress:'40%',status:'Delayed'},
      ]
    },
  ],
});

// ─── 2. Executive Command Dashboard ──────────────────────────────────────
const executiveCommand = cfg({
  slug: 'executive-command-dashboard',
  title: 'Executive Command Center',
  moduleName: 'Command',
  sidebarNav: STD_SIDEBAR(['Health','Alerts','Initiatives','Teams']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'health',label:'System Health'},
    {id:'initiatives',label:'Initiatives'},
    {id:'alerts',label:'Alerts'},
    {id:'departments',label:'Departments'},
  ],
  kpis: [
    {id:'uptime',label:'Platform Uptime',value:'99.97%',trend:'+0.02%',direction:'up'},
    {id:'active-users',label:'Active Users',value:'12,482',trend:'+840',direction:'up'},
    {id:'open-alerts',label:'Open Alerts',value:'7',trend:'-3',direction:'down'},
    {id:'budget-burn',label:'Monthly Burn',value:'$1.8M',trend:'+2%',direction:'up'},
    {id:'delivery',label:'On-Time Delivery',value:'93%',trend:'+4pp',direction:'up'},
    {id:'nps',label:'Employee NPS',value:'62',trend:'+5',direction:'up'},
  ],
  charts: [
    {
      canvasId:'deptHealth',tab:'overview',type:'bar',
      title:'Department Health',subtitle:'Composite health score by department',
      sampleKey:'deptHealth',
      sampleData:{labels:['Engineering','Sales','Marketing','Ops','Finance','HR'],datasets:[
        {label:'Health %',data:[94,88,91,85,96,89],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'alertTrend',tab:'alerts',type:'line',
      title:'Alert Volume',subtitle:'Trailing 12 weeks',
      sampleKey:'alertTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'P1',data:[2,3,1,2,1,0,2,1,0,1,2,1],borderColor:'#EF4444',tension:.3,fill:false},
        {label:'P2',data:[8,10,7,9,6,5,8,6,5,7,8,6],borderColor:'#F59E0B',tension:.3,fill:false},
      ]}
    },
    {
      canvasId:'initiativeProgress',tab:'initiatives',type:'bar',
      title:'Strategic Initiative Progress',subtitle:'Q2 completion %',
      sampleKey:'initiativeProgress',
      sampleData:{labels:['Platform v2','EMEA Launch','SOC2','Mobile App','AI Features'],datasets:[
        {label:'Completion %',data:[72,55,40,85,30],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'systemLoad',tab:'health',type:'line',
      title:'System Load',subtitle:'Requests per second, trailing 24h',
      sampleKey:'systemLoad',
      sampleData:{labels:['00','02','04','06','08','10','12','14','16','18','20','22'],datasets:[
        {label:'RPS',data:[1200,900,700,1400,3200,4800,5200,5400,4900,4200,3100,2100],borderColor:'#7B61FF',backgroundColor:'rgba(123,97,255,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'deptBudget',tab:'departments',type:'doughnut',
      title:'Budget Allocation',subtitle:'FY 2026 by department',
      sampleKey:'deptBudget',
      sampleData:{labels:['Engineering','Sales','Marketing','Ops','G&A'],counts:[48,22,15,9,6]}
    },
  ],
  tables: [
    {
      tableId:'activeAlerts',tab:'alerts',title:'Active Alerts',subtitle:'P1/P2 incidents',
      sampleKey:'activeAlerts',
      columns:[
        {header:'ID',field:'id',kind:'mono'},
        {header:'Alert',field:'title',kind:'strong'},
        {header:'Severity',field:'severity',kind:'pill-severity'},
        {header:'Owner',field:'owner'},
        {header:'Opened',field:'opened',kind:'mono'},
      ],
      sampleData:[
        {id:'ALT-1247',title:'Payment processing latency',severity:'P1',owner:'Platform',opened:'2026-04-14 08:12'},
        {id:'ALT-1246',title:'EU region elevated errors',severity:'P2',owner:'DevOps',opened:'2026-04-14 06:45'},
        {id:'ALT-1245',title:'Customer data export queue backed up',severity:'P2',owner:'Data',opened:'2026-04-13 22:30'},
        {id:'ALT-1244',title:'SSO provider intermittent timeouts',severity:'P2',owner:'Platform',opened:'2026-04-13 17:10'},
        {id:'ALT-1243',title:'Search index staleness > 5min',severity:'P3',owner:'Search',opened:'2026-04-13 14:22'},
      ]
    },
    {
      tableId:'keyInitiatives',tab:'initiatives',title:'Key Initiatives',subtitle:'Q2 strategic bets',
      sampleKey:'keyInitiatives',
      columns:[
        {header:'Initiative',field:'name',kind:'strong'},
        {header:'Owner',field:'owner'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
        {header:'Due',field:'due',kind:'mono'},
        {header:'Progress',field:'progress'},
      ],
      sampleData:[
        {name:'Platform v2 rollout',owner:'Eng',status:'On Track',due:'2026-05-15',progress:'72%'},
        {name:'EMEA market entry',owner:'GTM',status:'On Track',due:'2026-06-30',progress:'55%'},
        {name:'SOC2 Type II audit',owner:'Security',status:'Delayed',due:'2026-06-15',progress:'40%'},
        {name:'Mobile app launch',owner:'Product',status:'On Track',due:'2026-04-30',progress:'85%'},
        {name:'AI agent features',owner:'ML',status:'At Risk',due:'2026-05-22',progress:'30%'},
        {name:'Enterprise SSO v2',owner:'Platform',status:'On Track',due:'2026-05-10',progress:'62%'},
      ]
    },
  ],
});

// ─── 3. ABM Dashboard ────────────────────────────────────────────────────
const abmDashboard = cfg({
  slug: 'abm-dashboard',
  title: 'ABM Dashboard',
  moduleName: 'ABM',
  sidebarNav: STD_SIDEBAR(['Accounts','Campaigns','Engagement','Pipeline']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'accounts',label:'Target Accounts'},
    {id:'campaigns',label:'Campaigns'},
    {id:'engagement',label:'Engagement'},
    {id:'pipeline',label:'Pipeline'},
  ],
  kpis: [
    {id:'target-accounts',label:'Target Accounts',value:'420',trend:'+18',direction:'up'},
    {id:'engaged',label:'Engaged Accounts',value:'184',trend:'+24',direction:'up'},
    {id:'opps',label:'Open Opps',value:'62',trend:'+9',direction:'up'},
    {id:'pipeline',label:'Pipeline Value',value:'$18.4M',trend:'+22%',direction:'up'},
    {id:'avg-deal',label:'Avg Deal Size',value:'$142K',trend:'+8%',direction:'up'},
    {id:'cycle',label:'Avg Cycle',value:'68 days',trend:'-6 days',direction:'down'},
  ],
  charts: [
    {
      canvasId:'accountEngagement',tab:'overview',type:'bar',
      title:'Engagement by Tier',subtitle:'Target account engagement level',
      sampleKey:'accountEngagement',
      sampleData:{labels:['Tier 1','Tier 2','Tier 3'],datasets:[
        {label:'Engaged',data:[48,62,74],backgroundColor:'#00E5A0',borderRadius:4},
        {label:'Dormant',data:[12,38,186],backgroundColor:'#6B7280',borderRadius:4},
      ]}
    },
    {
      canvasId:'campaignPerformance',tab:'campaigns',type:'bar',
      title:'Campaign Performance',subtitle:'Engagement rate by campaign',
      sampleKey:'campaignPerformance',
      sampleData:{labels:['Direct Mail','Targeted Ads','Exec Dinners','Webinars','Cold Outbound'],datasets:[
        {label:'Engagement %',data:[32,18,62,28,12],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'pipelineBySource',tab:'pipeline',type:'doughnut',
      title:'Pipeline by Source',subtitle:'Open opps by generation channel',
      sampleKey:'pipelineBySource',
      sampleData:{labels:['Inbound','Outbound','Events','Partners','Referral'],counts:[42,28,15,10,5]}
    },
    {
      canvasId:'engagementTrend',tab:'engagement',type:'line',
      title:'Engagement Trend',subtitle:'Weekly engaged accounts',
      sampleKey:'engagementTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'Engaged Accounts',data:[120,128,132,140,146,152,158,164,170,175,180,184],borderColor:'#7B61FF',backgroundColor:'rgba(123,97,255,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'targetAccounts',tab:'accounts',title:'Top Target Accounts',subtitle:'Highest intent scores',
      sampleKey:'targetAccounts',
      columns:[
        {header:'Account',field:'name',kind:'strong'},
        {header:'Tier',field:'tier'},
        {header:'Intent',field:'intent'},
        {header:'Owner',field:'owner'},
        {header:'Stage',field:'stage',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Acme Corp',tier:'Tier 1',intent:'92',owner:'S. Chen',stage:'On Track'},
        {name:'Globex',tier:'Tier 1',intent:'88',owner:'M. Patel',stage:'On Track'},
        {name:'Initech',tier:'Tier 2',intent:'76',owner:'R. Martinez',stage:'At Risk'},
        {name:'Umbrella',tier:'Tier 1',intent:'84',owner:'J. Park',stage:'On Track'},
        {name:'Stark Industries',tier:'Tier 1',intent:'90',owner:'A. Nguyen',stage:'On Track'},
        {name:'Tyrell Corp',tier:'Tier 2',intent:'72',owner:'T. Ross',stage:'At Risk'},
        {name:'Wayne Enterprises',tier:'Tier 1',intent:'86',owner:'K. Liu',stage:'On Track'},
        {name:'Cyberdyne',tier:'Tier 2',intent:'68',owner:'V. Gupta',stage:'At Risk'},
      ]
    },
    {
      tableId:'activeCampaigns',tab:'campaigns',title:'Active Campaigns',subtitle:'In-flight ABM plays',
      sampleKey:'activeCampaigns',
      columns:[
        {header:'Campaign',field:'name',kind:'strong'},
        {header:'Type',field:'type'},
        {header:'Targets',field:'targets'},
        {header:'Engaged',field:'engaged'},
        {header:'Pipeline',field:'pipeline'},
      ],
      sampleData:[
        {name:'Q2 Enterprise Push',type:'Multi-Touch',targets:'80',engaged:'42',pipeline:'$4.2M'},
        {name:'CFO Direct Mail',type:'Direct Mail',targets:'120',engaged:'38',pipeline:'$2.8M'},
        {name:'Exec Dinner Series',type:'Event',targets:'45',engaged:'28',pipeline:'$5.1M'},
        {name:'Platform Webinar',type:'Webinar',targets:'200',engaged:'56',pipeline:'$3.2M'},
        {name:'Compliance Play',type:'Content',targets:'150',engaged:'32',pipeline:'$2.1M'},
      ]
    },
  ],
});

// ─── 4. Sales CRM Dashboard ──────────────────────────────────────────────
const salesCrmDashboard = cfg({
  slug: 'sales-crm-dashboard',
  title: 'Sales CRM Dashboard',
  moduleName: 'Sales',
  sidebarNav: STD_SIDEBAR(['Pipeline','Deals','Forecast','Reps']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'pipeline',label:'Pipeline'},
    {id:'deals',label:'Deals'},
    {id:'forecast',label:'Forecast'},
    {id:'reps',label:'Reps'},
  ],
  kpis: [
    {id:'pipeline',label:'Pipeline',value:'$28.4M',trend:'+12%',direction:'up'},
    {id:'closed',label:'Closed Won MTD',value:'$2.1M',trend:'+18%',direction:'up'},
    {id:'win-rate',label:'Win Rate',value:'32%',trend:'+3pp',direction:'up'},
    {id:'avg-deal',label:'Avg Deal Size',value:'$84K',trend:'+5%',direction:'up'},
    {id:'cycle',label:'Avg Cycle',value:'54 days',trend:'-4 days',direction:'down'},
    {id:'quota',label:'Quota Attainment',value:'108%',trend:'+8pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'pipelineByStage',tab:'pipeline',type:'bar',
      title:'Pipeline by Stage',subtitle:'Value in each stage',
      sampleKey:'pipelineByStage',
      sampleData:{labels:['Qualified','Discovery','Proposal','Negotiation','Commit'],datasets:[
        {label:'Value ($M)',data:[8.2,6.4,5.8,4.1,3.9],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'revenueTrend',tab:'overview',type:'line',
      title:'Closed Revenue',subtitle:'Monthly closed won',
      sampleKey:'revenueTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'Closed Won ($K)',data:[1200,1380,1520,1640,1720,1890,1920,2050,2180,2240,2320,2100],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'forecastAttainment',tab:'forecast',type:'bar',
      title:'Quota Attainment by Rep',subtitle:'Current quarter',
      sampleKey:'forecastAttainment',
      sampleData:{labels:['Chen','Patel','Martinez','Park','Liu','Nguyen','Ross','Gupta'],datasets:[
        {label:'% Quota',data:[142,128,118,108,104,98,92,88],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'winLossMix',tab:'deals',type:'doughnut',
      title:'Win/Loss Reasons',subtitle:'Closed deals last 90 days',
      sampleKey:'winLossMix',
      sampleData:{labels:['Won - Product','Won - Price','Won - Relationship','Lost - Price','Lost - Timing','Lost - Competitor'],counts:[28,14,18,12,10,18]}
    },
  ],
  tables: [
    {
      tableId:'topDeals',tab:'deals',title:'Top Open Deals',subtitle:'Largest in pipeline',
      sampleKey:'topDeals',
      columns:[
        {header:'Deal',field:'name',kind:'strong'},
        {header:'Account',field:'account'},
        {header:'Value',field:'value'},
        {header:'Stage',field:'stage',kind:'pill-ok-warn-danger'},
        {header:'Close',field:'close',kind:'mono'},
        {header:'Owner',field:'owner'},
      ],
      sampleData:[
        {name:'Platform License',account:'Acme Corp',value:'$420K',stage:'On Track',close:'2026-05-30',owner:'S. Chen'},
        {name:'Enterprise Expansion',account:'Globex',value:'$380K',stage:'On Track',close:'2026-05-15',owner:'M. Patel'},
        {name:'Renewal + Upsell',account:'Umbrella',value:'$320K',stage:'On Track',close:'2026-06-01',owner:'J. Park'},
        {name:'New Logo - Stark',account:'Stark Ind.',value:'$290K',stage:'At Risk',close:'2026-05-22',owner:'R. Martinez'},
        {name:'Multi-Region Deal',account:'Wayne Ent.',value:'$540K',stage:'On Track',close:'2026-06-15',owner:'K. Liu'},
        {name:'Tyrell Replatform',account:'Tyrell Corp',value:'$180K',stage:'At Risk',close:'2026-05-08',owner:'A. Nguyen'},
        {name:'Soylent Contract',account:'Soylent',value:'$85K',stage:'Delayed',close:'2026-04-30',owner:'T. Ross'},
      ]
    },
    {
      tableId:'repLeaderboard',tab:'reps',title:'Rep Leaderboard',subtitle:'Quarter to date',
      sampleKey:'repLeaderboard',
      columns:[
        {header:'Rep',field:'name',kind:'strong'},
        {header:'Closed',field:'closed'},
        {header:'Pipeline',field:'pipeline'},
        {header:'Quota',field:'quota'},
        {header:'Attainment',field:'attainment'},
      ],
      sampleData:[
        {name:'S. Chen',closed:'$820K',pipeline:'$4.2M',quota:'$580K',attainment:'142%'},
        {name:'M. Patel',closed:'$640K',pipeline:'$3.8M',quota:'$500K',attainment:'128%'},
        {name:'R. Martinez',closed:'$530K',pipeline:'$3.1M',quota:'$450K',attainment:'118%'},
        {name:'J. Park',closed:'$486K',pipeline:'$2.9M',quota:'$450K',attainment:'108%'},
        {name:'K. Liu',closed:'$416K',pipeline:'$2.4M',quota:'$400K',attainment:'104%'},
        {name:'A. Nguyen',closed:'$392K',pipeline:'$2.2M',quota:'$400K',attainment:'98%'},
        {name:'T. Ross',closed:'$368K',pipeline:'$2.0M',quota:'$400K',attainment:'92%'},
        {name:'V. Gupta',closed:'$352K',pipeline:'$1.8M',quota:'$400K',attainment:'88%'},
      ]
    },
  ],
});

// ─── 5. HR Dashboard ─────────────────────────────────────────────────────
const hrDashboard = cfg({
  slug: 'hr-dashboard',
  title: 'HR Dashboard',
  moduleName: 'People',
  sidebarNav: STD_SIDEBAR(['Workforce','Hiring','Engagement','Compliance']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'workforce',label:'Workforce'},
    {id:'hiring',label:'Hiring'},
    {id:'engagement',label:'Engagement'},
    {id:'compliance',label:'Compliance'},
  ],
  kpis: [
    {id:'headcount',label:'Headcount',value:'1,247',trend:'+28',direction:'up'},
    {id:'open-reqs',label:'Open Reqs',value:'42',trend:'+6',direction:'up'},
    {id:'time-to-fill',label:'Time to Fill',value:'38 days',trend:'-4 days',direction:'down'},
    {id:'turnover',label:'Turnover (LTM)',value:'8.4%',trend:'-1.2pp',direction:'down'},
    {id:'enps',label:'Employee NPS',value:'58',trend:'+6',direction:'up'},
    {id:'offer-accept',label:'Offer Accept Rate',value:'86%',trend:'+4pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'headcountTrend',tab:'workforce',type:'line',
      title:'Headcount Trend',subtitle:'Trailing 12 months',
      sampleKey:'headcountTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'Total',data:[1120,1140,1155,1170,1180,1195,1205,1215,1225,1230,1238,1247],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'deptMix',tab:'workforce',type:'doughnut',
      title:'Headcount by Department',subtitle:'Distribution',
      sampleKey:'deptMix',
      sampleData:{labels:['Engineering','Sales','Marketing','Ops','G&A','Customer Success'],counts:[420,240,120,180,90,197]}
    },
    {
      canvasId:'hiringFunnel',tab:'hiring',type:'bar',
      title:'Hiring Funnel',subtitle:'Last 90 days',
      sampleKey:'hiringFunnel',
      sampleData:{labels:['Applied','Screen','Interview','Offer','Hired'],datasets:[
        {label:'Candidates',data:[2840,620,180,64,48],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'engagementTrend',tab:'engagement',type:'line',
      title:'eNPS Trend',subtitle:'Quarterly survey',
      sampleKey:'engagementTrend',
      sampleData:{labels:['Q1 25','Q2 25','Q3 25','Q4 25','Q1 26'],datasets:[
        {label:'eNPS',data:[42,46,50,52,58],borderColor:'#7B61FF',backgroundColor:'rgba(123,97,255,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'openReqs',tab:'hiring',title:'Open Requisitions',subtitle:'Top priority roles',
      sampleKey:'openReqs',
      columns:[
        {header:'Role',field:'role',kind:'strong'},
        {header:'Department',field:'dept'},
        {header:'Level',field:'level'},
        {header:'Days Open',field:'days'},
        {header:'Stage',field:'stage',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {role:'Staff Platform Engineer',dept:'Engineering',level:'L6',days:28,stage:'On Track'},
        {role:'Senior Product Designer',dept:'Product',level:'L5',days:42,stage:'At Risk'},
        {role:'VP of Marketing',dept:'Marketing',level:'VP',days:65,stage:'Delayed'},
        {role:'Sales Engineer',dept:'Sales',level:'L4',days:18,stage:'On Track'},
        {role:'Security Engineer',dept:'Security',level:'L5',days:52,stage:'At Risk'},
        {role:'Data Scientist',dept:'Data',level:'L4',days:24,stage:'On Track'},
      ]
    },
    {
      tableId:'recentHires',tab:'workforce',title:'Recent Hires',subtitle:'Last 30 days',
      sampleKey:'recentHires',
      columns:[
        {header:'Name',field:'name',kind:'strong'},
        {header:'Role',field:'role'},
        {header:'Department',field:'dept'},
        {header:'Start',field:'start',kind:'mono'},
        {header:'Source',field:'source'},
      ],
      sampleData:[
        {name:'Alice Chen',role:'Senior SWE',dept:'Platform',start:'2026-04-01',source:'Referral'},
        {name:'Bob Patel',role:'Product Manager',dept:'Product',start:'2026-04-01',source:'Inbound'},
        {name:'Cara Martinez',role:'Account Executive',dept:'Sales',start:'2026-04-08',source:'Recruiter'},
        {name:'David Park',role:'DevOps Engineer',dept:'Infra',start:'2026-04-08',source:'LinkedIn'},
        {name:'Ellen Liu',role:'UX Researcher',dept:'Design',start:'2026-04-14',source:'Referral'},
      ]
    },
  ],
});

// To keep this file manageable, the remaining 14 configs are factored
// into smaller modules imported below. See ./configs-part-2.mjs.
import { PART_2_CONFIGS } from './configs-part-2.mjs';

export const CONFIGS = [
  executiveDashboard,
  executiveCommand,
  abmDashboard,
  salesCrmDashboard,
  hrDashboard,
  ...PART_2_CONFIGS,
];
