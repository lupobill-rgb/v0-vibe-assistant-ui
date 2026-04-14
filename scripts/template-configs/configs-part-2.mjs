// Part 2 of domain configs. See ./index.mjs for the primary file and
// the cfg() / config-shape documentation.

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

// ─── 6. Legal Dashboard ──────────────────────────────────────────────────
const legalDashboard = cfg({
  slug: 'legal-dashboard',
  title: 'Legal Dashboard',
  moduleName: 'Legal',
  sidebarNav: STD_SIDEBAR(['Matters','Contracts','Compliance','Risk']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'matters',label:'Matters'},
    {id:'contracts',label:'Contracts'},
    {id:'compliance',label:'Compliance'},
    {id:'risk',label:'Risk'},
  ],
  kpis: [
    {id:'active-matters',label:'Active Matters',value:'42',trend:'+4',direction:'up'},
    {id:'contracts-review',label:'In Review',value:'28',trend:'-6',direction:'down'},
    {id:'avg-review',label:'Avg Review Time',value:'3.2 days',trend:'-0.4',direction:'down'},
    {id:'compliance',label:'Compliance Score',value:'94%',trend:'+2pp',direction:'up'},
    {id:'open-risks',label:'Open Risks',value:'11',trend:'-2',direction:'down'},
    {id:'spend',label:'Legal Spend MTD',value:'$480K',trend:'-8%',direction:'down'},
  ],
  charts: [
    {
      canvasId:'mattersByType',tab:'matters',type:'doughnut',
      title:'Matters by Type',subtitle:'Active matters distribution',
      sampleKey:'mattersByType',
      sampleData:{labels:['Commercial','IP','Employment','Regulatory','Litigation','M&A'],counts:[14,8,6,5,5,4]}
    },
    {
      canvasId:'contractVolume',tab:'contracts',type:'line',
      title:'Contract Volume',subtitle:'Trailing 12 weeks',
      sampleKey:'contractVolume',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'Submitted',data:[18,22,20,24,26,22,24,28,30,26,28,24],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true},
        {label:'Executed',data:[16,20,18,22,24,20,22,26,28,24,26,22],borderColor:'#00B4D8',backgroundColor:'rgba(0,180,216,.12)',tension:.35,fill:true},
      ]}
    },
    {
      canvasId:'complianceByArea',tab:'compliance',type:'bar',
      title:'Compliance by Area',subtitle:'Control coverage',
      sampleKey:'complianceByArea',
      sampleData:{labels:['Data Privacy','Security','Financial','Employment','IP','Export'],datasets:[
        {label:'Compliance %',data:[96,94,98,92,90,88],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'riskHeatmap',tab:'risk',type:'bar',
      title:'Risk Exposure',subtitle:'Open risks by severity',
      sampleKey:'riskHeatmap',
      sampleData:{labels:['Critical','High','Medium','Low'],datasets:[
        {label:'Count',data:[2,4,12,22],backgroundColor:'#EF4444',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'activeMatters',tab:'matters',title:'Active Matters',subtitle:'Priority legal work',
      sampleKey:'activeMatters',
      columns:[
        {header:'ID',field:'id',kind:'mono'},
        {header:'Matter',field:'name',kind:'strong'},
        {header:'Type',field:'type'},
        {header:'Counsel',field:'counsel'},
        {header:'Priority',field:'priority',kind:'pill-severity'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {id:'MTR-441',name:'Vendor Master Agreement',type:'Commercial',counsel:'J. Park',priority:'P1',status:'On Track'},
        {id:'MTR-440',name:'EU GDPR Compliance Review',type:'Regulatory',counsel:'R. Martinez',priority:'P0',status:'At Risk'},
        {id:'MTR-438',name:'Patent Filing - Core Engine',type:'IP',counsel:'K. Liu',priority:'P1',status:'On Track'},
        {id:'MTR-435',name:'Employment Dispute - Former VP',type:'Employment',counsel:'M. Patel',priority:'P0',status:'Delayed'},
        {id:'MTR-432',name:'M&A Due Diligence - Target X',type:'M&A',counsel:'S. Chen',priority:'P1',status:'On Track'},
        {id:'MTR-428',name:'Customer Contract Dispute',type:'Commercial',counsel:'A. Nguyen',priority:'P2',status:'On Track'},
      ]
    },
    {
      tableId:'pendingContracts',tab:'contracts',title:'Contracts in Review',subtitle:'Awaiting legal sign-off',
      sampleKey:'pendingContracts',
      columns:[
        {header:'Contract',field:'name',kind:'strong'},
        {header:'Counterparty',field:'party'},
        {header:'Value',field:'value'},
        {header:'Received',field:'received',kind:'mono'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Enterprise MSA',party:'Acme Corp',value:'$2.4M',received:'2026-04-10',status:'On Track'},
        {name:'Cloud Infrastructure SLA',party:'CloudVendor',value:'$1.8M',received:'2026-04-08',status:'On Track'},
        {name:'Partnership Agreement',party:'Globex',value:'$960K',received:'2026-04-05',status:'At Risk'},
        {name:'Data Processing Addendum',party:'Initech',value:'-',received:'2026-04-12',status:'On Track'},
        {name:'Reseller Agreement',party:'ChannelPartner Inc',value:'$540K',received:'2026-03-28',status:'Delayed'},
      ]
    },
  ],
});

// ─── 7. Sprint Dashboard ─────────────────────────────────────────────────
const sprintDashboard = cfg({
  slug: 'sprint-dashboard',
  title: 'Sprint Dashboard',
  moduleName: 'Engineering',
  sidebarNav: STD_SIDEBAR(['Sprint','Backlog','Velocity','Team']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'backlog',label:'Backlog'},
    {id:'velocity',label:'Velocity'},
    {id:'team',label:'Team'},
    {id:'blockers',label:'Blockers'},
  ],
  kpis: [
    {id:'sprint-goal',label:'Sprint Progress',value:'72%',trend:'+12pp',direction:'up'},
    {id:'velocity',label:'Velocity',value:'84 pts',trend:'+6',direction:'up'},
    {id:'commit',label:'Committed',value:'128 pts',trend:'+4',direction:'up'},
    {id:'done',label:'Done',value:'92 pts',trend:'+18',direction:'up'},
    {id:'blockers',label:'Blockers',value:'3',trend:'-2',direction:'down'},
    {id:'bugs',label:'Open Bugs',value:'14',trend:'-5',direction:'down'},
  ],
  charts: [
    {
      canvasId:'burndown',tab:'overview',type:'line',
      title:'Sprint Burndown',subtitle:'Remaining points per day',
      sampleKey:'burndown',
      sampleData:{labels:['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'],datasets:[
        {label:'Ideal',data:[128,115,102,90,77,64,51,39,26,13],borderColor:'#6B7280',borderDash:[5,5],tension:0,fill:false},
        {label:'Actual',data:[128,118,110,98,88,78,62,48,36],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true},
      ]}
    },
    {
      canvasId:'velocityTrend',tab:'velocity',type:'bar',
      title:'Velocity Trend',subtitle:'Last 8 sprints',
      sampleKey:'velocityTrend',
      sampleData:{labels:['S32','S33','S34','S35','S36','S37','S38','S39'],datasets:[
        {label:'Points Completed',data:[72,68,78,82,76,80,84,92],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'storyStatus',tab:'backlog',type:'doughnut',
      title:'Story Status',subtitle:'Current sprint breakdown',
      sampleKey:'storyStatus',
      sampleData:{labels:['Done','In Progress','Review','Blocked','To Do'],counts:[18,8,4,3,6]}
    },
    {
      canvasId:'teamLoad',tab:'team',type:'bar',
      title:'Team Load',subtitle:'Points assigned per engineer',
      sampleKey:'teamLoad',
      sampleData:{labels:['Chen','Patel','Martinez','Park','Liu','Nguyen'],datasets:[
        {label:'Points',data:[24,22,18,20,16,28],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'sprintStories',tab:'backlog',title:'Sprint Stories',subtitle:'Current sprint backlog',
      sampleKey:'sprintStories',
      columns:[
        {header:'Key',field:'key',kind:'mono'},
        {header:'Title',field:'title',kind:'strong'},
        {header:'Owner',field:'owner'},
        {header:'Points',field:'points'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {key:'VIBE-2412',title:'Add sample_data plumbing to deterministic template',owner:'S. Chen',points:5,status:'On Track'},
        {key:'VIBE-2415',title:'Ops dashboard rewrite',owner:'M. Patel',points:8,status:'On Track'},
        {key:'VIBE-2418',title:'Template generator script',owner:'R. Martinez',points:13,status:'On Track'},
        {key:'VIBE-2421',title:'Nango connection ID resolution',owner:'J. Park',points:3,status:'On Track'},
        {key:'VIBE-2424',title:'Planner skill validation',owner:'K. Liu',points:5,status:'On Track'},
        {key:'VIBE-2427',title:'Layout shim regression fix',owner:'A. Nguyen',points:8,status:'At Risk'},
        {key:'VIBE-2430',title:'Pharma skeleton parse fix',owner:'T. Ross',points:2,status:'On Track'},
      ]
    },
    {
      tableId:'blockers',tab:'blockers',title:'Active Blockers',subtitle:'Stories awaiting unblock',
      sampleKey:'blockers',
      columns:[
        {header:'Key',field:'key',kind:'mono'},
        {header:'Blocked',field:'story',kind:'strong'},
        {header:'Blocked By',field:'blocker'},
        {header:'Days',field:'days'},
        {header:'Severity',field:'severity',kind:'pill-severity'},
      ],
      sampleData:[
        {key:'VIBE-2390',story:'Stripe billing integration',blocker:'Waiting on Finance approval',days:4,severity:'P1'},
        {key:'VIBE-2401',story:'Mobile SDK auth flow',blocker:'External vendor SLA breach',days:7,severity:'P0'},
        {key:'VIBE-2408',story:'Kafka cluster upgrade',blocker:'Infra capacity constraint',days:2,severity:'P2'},
      ]
    },
  ],
});

// ─── 8. Support Dashboard ────────────────────────────────────────────────
const supportDashboard = cfg({
  slug: 'support-dashboard',
  title: 'Support Dashboard',
  moduleName: 'Support',
  sidebarNav: STD_SIDEBAR(['Tickets','Agents','SLA','CSAT']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'tickets',label:'Tickets'},
    {id:'agents',label:'Agents'},
    {id:'sla',label:'SLA'},
    {id:'csat',label:'CSAT'},
  ],
  kpis: [
    {id:'open-tickets',label:'Open Tickets',value:'284',trend:'-18',direction:'down'},
    {id:'mttr',label:'MTTR',value:'6.4h',trend:'-1.2h',direction:'down'},
    {id:'csat',label:'CSAT',value:'92%',trend:'+3pp',direction:'up'},
    {id:'sla-compliance',label:'SLA Compliance',value:'96%',trend:'+2pp',direction:'up'},
    {id:'first-response',label:'First Response',value:'14 min',trend:'-4 min',direction:'down'},
    {id:'deflection',label:'Deflection Rate',value:'42%',trend:'+6pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'ticketTrend',tab:'overview',type:'line',
      title:'Ticket Volume',subtitle:'Opened vs resolved, last 12 weeks',
      sampleKey:'ticketTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'Opened',data:[180,195,210,200,220,215,205,198,192,188,184,180],borderColor:'#EF4444',tension:.3,fill:false},
        {label:'Resolved',data:[172,188,202,196,214,210,202,198,194,192,188,186],borderColor:'#00E5A0',tension:.3,fill:false},
      ]}
    },
    {
      canvasId:'ticketsByCategory',tab:'tickets',type:'doughnut',
      title:'Tickets by Category',subtitle:'Open tickets breakdown',
      sampleKey:'ticketsByCategory',
      sampleData:{labels:['Auth','Billing','Feature Request','Bug','Integration','Performance'],counts:[48,62,42,68,38,26]}
    },
    {
      canvasId:'agentPerformance',tab:'agents',type:'bar',
      title:'Agent Performance',subtitle:'Tickets resolved this week',
      sampleKey:'agentPerformance',
      sampleData:{labels:['Chen','Patel','Martinez','Park','Liu','Nguyen','Ross','Gupta'],datasets:[
        {label:'Resolved',data:[42,38,36,34,32,30,28,26],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'csatTrend',tab:'csat',type:'line',
      title:'CSAT Trend',subtitle:'Weekly CSAT score',
      sampleKey:'csatTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'CSAT %',data:[86,87,88,89,88,89,90,91,90,91,92,92],borderColor:'#7B61FF',backgroundColor:'rgba(123,97,255,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'openTickets',tab:'tickets',title:'Open Tickets',subtitle:'Requiring attention',
      sampleKey:'openTickets',
      columns:[
        {header:'ID',field:'id',kind:'mono'},
        {header:'Subject',field:'subject',kind:'strong'},
        {header:'Customer',field:'customer'},
        {header:'Agent',field:'agent'},
        {header:'Priority',field:'priority',kind:'pill-severity'},
        {header:'Age',field:'age'},
      ],
      sampleData:[
        {id:'TKT-8421',subject:'API rate limit errors in production',customer:'Acme Corp',agent:'S. Chen',priority:'P1',age:'2h'},
        {id:'TKT-8420',subject:'SSO login failing for EU users',customer:'Globex',agent:'M. Patel',priority:'P1',age:'4h'},
        {id:'TKT-8419',subject:'Export timing out for large datasets',customer:'Initech',agent:'R. Martinez',priority:'P2',age:'6h'},
        {id:'TKT-8418',subject:'Webhook delivery delayed',customer:'Umbrella',agent:'J. Park',priority:'P2',age:'8h'},
        {id:'TKT-8417',subject:'Custom field not saving',customer:'Stark Ind.',agent:'K. Liu',priority:'P3',age:'1d'},
        {id:'TKT-8416',subject:'Report scheduling UI bug',customer:'Wayne Ent.',agent:'A. Nguyen',priority:'P3',age:'1d'},
      ]
    },
    {
      tableId:'agentScorecard',tab:'agents',title:'Agent Scorecard',subtitle:'Weekly metrics',
      sampleKey:'agentScorecard',
      columns:[
        {header:'Agent',field:'name',kind:'strong'},
        {header:'Resolved',field:'resolved'},
        {header:'CSAT',field:'csat'},
        {header:'Avg MTTR',field:'mttr'},
        {header:'SLA',field:'sla'},
      ],
      sampleData:[
        {name:'S. Chen',resolved:42,csat:'96%',mttr:'4.2h',sla:'98%'},
        {name:'M. Patel',resolved:38,csat:'94%',mttr:'5.1h',sla:'96%'},
        {name:'R. Martinez',resolved:36,csat:'92%',mttr:'5.8h',sla:'95%'},
        {name:'J. Park',resolved:34,csat:'93%',mttr:'6.4h',sla:'94%'},
        {name:'K. Liu',resolved:32,csat:'91%',mttr:'7.2h',sla:'92%'},
      ]
    },
  ],
});

// ─── 9. Portfolio Dashboard ──────────────────────────────────────────────
const portfolioDashboard = cfg({
  slug: 'portfolio-dashboard',
  title: 'Portfolio Dashboard',
  moduleName: 'Portfolio',
  sidebarNav: STD_SIDEBAR(['Companies','Performance','Valuations','Exits']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'companies',label:'Companies'},
    {id:'performance',label:'Performance'},
    {id:'valuations',label:'Valuations'},
    {id:'exits',label:'Exits'},
  ],
  kpis: [
    {id:'aum',label:'AUM',value:'$420M',trend:'+12%',direction:'up'},
    {id:'companies',label:'Portfolio Cos',value:'38',trend:'+3',direction:'up'},
    {id:'irr',label:'Net IRR',value:'24.8%',trend:'+2.1pp',direction:'up'},
    {id:'moic',label:'MOIC',value:'2.8x',trend:'+0.2',direction:'up'},
    {id:'exits-ytd',label:'Exits YTD',value:'4',trend:'+2',direction:'up'},
    {id:'dry-powder',label:'Dry Powder',value:'$180M',trend:'-5%',direction:'down'},
  ],
  charts: [
    {
      canvasId:'navTrend',tab:'overview',type:'line',
      title:'NAV Trend',subtitle:'Net asset value, 12 months',
      sampleKey:'navTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'NAV ($M)',data:[360,368,375,382,390,398,405,412,418,415,418,420],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'stageMix',tab:'companies',type:'doughnut',
      title:'Portfolio by Stage',subtitle:'Investment stage distribution',
      sampleKey:'stageMix',
      sampleData:{labels:['Seed','Series A','Series B','Series C','Growth','Late'],counts:[6,10,9,7,4,2]}
    },
    {
      canvasId:'sectorMix',tab:'companies',type:'bar',
      title:'Sector Allocation',subtitle:'Capital deployed by sector',
      sampleKey:'sectorMix',
      sampleData:{labels:['SaaS','Fintech','Healthtech','AI/ML','Climate','Consumer'],datasets:[
        {label:'$M',data:[140,85,62,48,52,33],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'irrByVintage',tab:'performance',type:'bar',
      title:'IRR by Vintage',subtitle:'Net IRR by fund year',
      sampleKey:'irrByVintage',
      sampleData:{labels:['2018','2019','2020','2021','2022','2023'],datasets:[
        {label:'IRR %',data:[32,28,24,22,18,15],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'topCompanies',tab:'companies',title:'Top Portfolio Companies',subtitle:'By current valuation',
      sampleKey:'topCompanies',
      columns:[
        {header:'Company',field:'name',kind:'strong'},
        {header:'Stage',field:'stage'},
        {header:'Sector',field:'sector'},
        {header:'Invested',field:'invested'},
        {header:'Current Value',field:'current'},
        {header:'MOIC',field:'moic'},
      ],
      sampleData:[
        {name:'Stripe Beta',stage:'Late',sector:'Fintech',invested:'$12M',current:'$48M',moic:'4.0x'},
        {name:'Neural Dynamics',stage:'Series C',sector:'AI/ML',invested:'$8M',current:'$32M',moic:'4.0x'},
        {name:'CarbonZero',stage:'Series B',sector:'Climate',invested:'$6M',current:'$22M',moic:'3.7x'},
        {name:'HealthSync',stage:'Series C',sector:'Healthtech',invested:'$10M',current:'$28M',moic:'2.8x'},
        {name:'DataForge',stage:'Series B',sector:'SaaS',invested:'$7M',current:'$19M',moic:'2.7x'},
        {name:'RetailGenie',stage:'Series A',sector:'Consumer',invested:'$4M',current:'$10M',moic:'2.5x'},
      ]
    },
    {
      tableId:'recentExits',tab:'exits',title:'Recent Exits',subtitle:'Last 18 months',
      sampleKey:'recentExits',
      columns:[
        {header:'Company',field:'name',kind:'strong'},
        {header:'Type',field:'type'},
        {header:'Proceeds',field:'proceeds'},
        {header:'MOIC',field:'moic'},
        {header:'Date',field:'date',kind:'mono'},
      ],
      sampleData:[
        {name:'CloudVault',type:'Acquisition',proceeds:'$240M',moic:'6.2x',date:'2026-02-18'},
        {name:'SignalFire',type:'IPO',proceeds:'$180M',moic:'4.8x',date:'2025-11-04'},
        {name:'MeshNet',type:'Acquisition',proceeds:'$95M',moic:'3.2x',date:'2025-09-22'},
        {name:'PulsarAI',type:'Acquisition',proceeds:'$140M',moic:'5.1x',date:'2025-07-11'},
      ]
    },
  ],
});

// ─── 10. P&L Dashboard ───────────────────────────────────────────────────
const pnlDashboard = cfg({
  slug: 'pnl-dashboard',
  title: 'P&L Dashboard',
  moduleName: 'Finance',
  sidebarNav: STD_SIDEBAR(['Revenue','Expenses','Margin','Forecast']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'revenue',label:'Revenue'},
    {id:'expenses',label:'Expenses'},
    {id:'margin',label:'Margin'},
    {id:'forecast',label:'Forecast'},
  ],
  kpis: [
    {id:'revenue-ytd',label:'Revenue YTD',value:'$18.2M',trend:'+24%',direction:'up'},
    {id:'gross-profit',label:'Gross Profit',value:'$13.4M',trend:'+28%',direction:'up'},
    {id:'opex',label:'OpEx YTD',value:'$9.8M',trend:'+12%',direction:'up'},
    {id:'ebitda',label:'EBITDA',value:'$3.6M',trend:'+42%',direction:'up'},
    {id:'net-income',label:'Net Income',value:'$2.9M',trend:'+38%',direction:'up'},
    {id:'ebitda-margin',label:'EBITDA Margin',value:'19.8%',trend:'+2.4pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'revenueVsOpex',tab:'overview',type:'line',
      title:'Revenue vs OpEx',subtitle:'12-month trend',
      sampleKey:'revenueVsOpex',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'Revenue',data:[1200,1280,1340,1420,1480,1540,1600,1680,1720,1780,1820,1880],borderColor:'#00E5A0',tension:.35,fill:false},
        {label:'OpEx',data:[780,810,840,860,880,890,910,920,940,960,980,1000],borderColor:'#EF4444',tension:.35,fill:false},
      ]}
    },
    {
      canvasId:'revenueBySegment',tab:'revenue',type:'doughnut',
      title:'Revenue by Segment',subtitle:'YTD mix',
      sampleKey:'revenueBySegment',
      sampleData:{labels:['Subscription','Services','Implementation','Training','Other'],counts:[68,16,10,4,2]}
    },
    {
      canvasId:'expenseBreakdown',tab:'expenses',type:'bar',
      title:'Expense Breakdown',subtitle:'Operating costs by category',
      sampleKey:'expenseBreakdown',
      sampleData:{labels:['Personnel','Cloud','Tools','Marketing','G&A','Other'],datasets:[
        {label:'$K',data:[5200,1400,680,1200,900,420],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'marginTrend',tab:'margin',type:'line',
      title:'Margin Trend',subtitle:'Gross and EBITDA margin %',
      sampleKey:'marginTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'Gross Margin %',data:[70,71,72,72,73,73,74,74,74,74,75,75],borderColor:'#00E5A0',tension:.35,fill:false},
        {label:'EBITDA Margin %',data:[12,13,14,15,16,16,17,18,18,19,19,20],borderColor:'#7B61FF',tension:.35,fill:false},
      ]}
    },
  ],
  tables: [
    {
      tableId:'pnlLines',tab:'overview',title:'P&L Summary',subtitle:'Current quarter',
      sampleKey:'pnlLines',
      columns:[
        {header:'Line Item',field:'name',kind:'strong'},
        {header:'Actual',field:'actual'},
        {header:'Plan',field:'plan'},
        {header:'Var',field:'variance'},
        {header:'% Plan',field:'pct'},
      ],
      sampleData:[
        {name:'Total Revenue',actual:'$5.6M',plan:'$5.2M',variance:'+$400K',pct:'108%'},
        {name:'Cost of Revenue',actual:'$1.4M',plan:'$1.3M',variance:'-$100K',pct:'108%'},
        {name:'Gross Profit',actual:'$4.2M',plan:'$3.9M',variance:'+$300K',pct:'108%'},
        {name:'Sales & Marketing',actual:'$1.8M',plan:'$1.9M',variance:'+$100K',pct:'95%'},
        {name:'R&D',actual:'$1.2M',plan:'$1.1M',variance:'-$100K',pct:'109%'},
        {name:'G&A',actual:'$0.5M',plan:'$0.5M',variance:'$0',pct:'100%'},
        {name:'EBITDA',actual:'$0.7M',plan:'$0.4M',variance:'+$300K',pct:'175%'},
      ]
    },
    {
      tableId:'topExpenses',tab:'expenses',title:'Largest Expense Categories',subtitle:'YTD',
      sampleKey:'topExpenses',
      columns:[
        {header:'Category',field:'name',kind:'strong'},
        {header:'Vendor',field:'vendor'},
        {header:'Amount',field:'amount'},
        {header:'% OpEx',field:'pct'},
      ],
      sampleData:[
        {name:'Cloud Infrastructure',vendor:'AWS',amount:'$1.2M',pct:'12.2%'},
        {name:'Payroll - Engineering',vendor:'Internal',amount:'$3.2M',pct:'32.7%'},
        {name:'Payroll - Sales',vendor:'Internal',amount:'$1.8M',pct:'18.4%'},
        {name:'SaaS Tools',vendor:'Multiple',amount:'$680K',pct:'6.9%'},
        {name:'Marketing',vendor:'Multiple',amount:'$1.2M',pct:'12.2%'},
      ]
    },
  ],
});

// ─── 11. Ecommerce Analytics ─────────────────────────────────────────────
const ecommerceAnalytics = cfg({
  slug: 'ecommerce-analytics',
  title: 'Ecommerce Analytics',
  moduleName: 'Commerce',
  sidebarNav: STD_SIDEBAR(['Sales','Products','Customers','Funnel']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'products',label:'Products'},
    {id:'customers',label:'Customers'},
    {id:'funnel',label:'Funnel'},
    {id:'orders',label:'Orders'},
  ],
  kpis: [
    {id:'gmv',label:'GMV',value:'$4.2M',trend:'+18%',direction:'up'},
    {id:'orders',label:'Orders',value:'18,420',trend:'+12%',direction:'up'},
    {id:'aov',label:'AOV',value:'$228',trend:'+5%',direction:'up'},
    {id:'conversion',label:'Conversion',value:'3.8%',trend:'+0.4pp',direction:'up'},
    {id:'return-rate',label:'Return Rate',value:'6.2%',trend:'-0.8pp',direction:'down'},
    {id:'repeat',label:'Repeat Customers',value:'42%',trend:'+3pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'gmvTrend',tab:'overview',type:'line',
      title:'GMV Trend',subtitle:'Daily gross merchandise value',
      sampleKey:'gmvTrend',
      sampleData:{labels:['D1','D5','D10','D15','D20','D25','D30'],datasets:[
        {label:'GMV ($K)',data:[120,135,148,162,158,172,180],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'categoryMix',tab:'products',type:'doughnut',
      title:'Revenue by Category',subtitle:'Last 30 days',
      sampleKey:'categoryMix',
      sampleData:{labels:['Apparel','Electronics','Home','Beauty','Food','Accessories'],counts:[28,22,18,14,10,8]}
    },
    {
      canvasId:'funnelStages',tab:'funnel',type:'bar',
      title:'Purchase Funnel',subtitle:'Conversion by stage',
      sampleKey:'funnelStages',
      sampleData:{labels:['Visit','Product View','Add to Cart','Checkout','Purchase'],datasets:[
        {label:'Users',data:[480000,128000,42000,18000,14800],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'cohortRetention',tab:'customers',type:'line',
      title:'Customer Cohort Retention',subtitle:'Repeat purchase rate by month',
      sampleKey:'cohortRetention',
      sampleData:{labels:['M0','M1','M2','M3','M4','M5','M6'],datasets:[
        {label:'Retention %',data:[100,48,36,30,26,24,22],borderColor:'#7B61FF',backgroundColor:'rgba(123,97,255,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'topProducts',tab:'products',title:'Top Products',subtitle:'Best sellers last 30 days',
      sampleKey:'topProducts',
      columns:[
        {header:'SKU',field:'sku',kind:'mono'},
        {header:'Product',field:'name',kind:'strong'},
        {header:'Category',field:'category'},
        {header:'Units',field:'units'},
        {header:'Revenue',field:'revenue'},
      ],
      sampleData:[
        {sku:'APP-001',name:'Classic T-Shirt',category:'Apparel',units:2480,revenue:'$49,600'},
        {sku:'ELE-042',name:'Wireless Earbuds',category:'Electronics',units:820,revenue:'$98,400'},
        {sku:'HOM-018',name:'Ceramic Planter Set',category:'Home',units:640,revenue:'$32,000'},
        {sku:'APP-112',name:'Denim Jacket',category:'Apparel',units:540,revenue:'$64,800'},
        {sku:'BEA-024',name:'Skincare Bundle',category:'Beauty',units:460,revenue:'$46,000'},
        {sku:'ELE-087',name:'Smart Speaker',category:'Electronics',units:380,revenue:'$68,400'},
      ]
    },
    {
      tableId:'recentOrders',tab:'orders',title:'Recent Orders',subtitle:'Last 15 minutes',
      sampleKey:'recentOrders',
      columns:[
        {header:'Order',field:'id',kind:'mono'},
        {header:'Customer',field:'customer'},
        {header:'Items',field:'items'},
        {header:'Total',field:'total'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {id:'#4421',customer:'alice@example.com',items:3,total:'$184.00',status:'On Track'},
        {id:'#4420',customer:'bob@example.com',items:1,total:'$89.99',status:'On Track'},
        {id:'#4419',customer:'carol@example.com',items:5,total:'$342.50',status:'On Track'},
        {id:'#4418',customer:'dave@example.com',items:2,total:'$124.00',status:'On Track'},
        {id:'#4417',customer:'eve@example.com',items:4,total:'$218.75',status:'At Risk'},
      ]
    },
  ],
});

// ─── 12. Email Analytics ─────────────────────────────────────────────────
const emailAnalytics = cfg({
  slug: 'email-analytics',
  title: 'Email Analytics',
  moduleName: 'Email',
  sidebarNav: STD_SIDEBAR(['Campaigns','Audience','Deliverability','Templates']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'campaigns',label:'Campaigns'},
    {id:'audience',label:'Audience'},
    {id:'deliverability',label:'Deliverability'},
    {id:'templates',label:'Templates'},
  ],
  kpis: [
    {id:'sends',label:'Emails Sent',value:'1.2M',trend:'+18%',direction:'up'},
    {id:'open-rate',label:'Open Rate',value:'32.4%',trend:'+2.1pp',direction:'up'},
    {id:'click-rate',label:'Click Rate',value:'6.8%',trend:'+0.4pp',direction:'up'},
    {id:'unsub',label:'Unsubscribe',value:'0.12%',trend:'-0.03pp',direction:'down'},
    {id:'bounce',label:'Bounce Rate',value:'1.8%',trend:'-0.2pp',direction:'down'},
    {id:'deliverability',label:'Inbox Rate',value:'98.2%',trend:'+0.4pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'engagementTrend',tab:'overview',type:'line',
      title:'Engagement Trend',subtitle:'Open and click rates, 12 weeks',
      sampleKey:'engagementTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'Open Rate %',data:[28,29,30,30,31,31,32,32,32,32,33,32],borderColor:'#00E5A0',tension:.35,fill:false},
        {label:'Click Rate %',data:[5.2,5.4,5.8,6.0,6.2,6.4,6.6,6.6,6.8,6.8,7.0,6.8],borderColor:'#00B4D8',tension:.35,fill:false},
      ]}
    },
    {
      canvasId:'campaignMix',tab:'campaigns',type:'doughnut',
      title:'Campaigns by Type',subtitle:'Last 90 days',
      sampleKey:'campaignMix',
      sampleData:{labels:['Product','Promotional','Transactional','Newsletter','Re-engagement','Welcome'],counts:[28,24,18,15,8,7]}
    },
    {
      canvasId:'audienceSegments',tab:'audience',type:'bar',
      title:'Audience Segments',subtitle:'Subscribers by segment',
      sampleKey:'audienceSegments',
      sampleData:{labels:['New','Active','Engaged','At Risk','Dormant','Churned'],datasets:[
        {label:'Count (K)',data:[42,184,328,120,85,48],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
    {
      canvasId:'deliverabilityByDomain',tab:'deliverability',type:'bar',
      title:'Inbox Rate by Provider',subtitle:'Last 30 days',
      sampleKey:'deliverabilityByDomain',
      sampleData:{labels:['Gmail','Outlook','Yahoo','Apple','Other'],datasets:[
        {label:'Inbox %',data:[98.8,97.2,96.4,98.5,95.2],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'topCampaigns',tab:'campaigns',title:'Top Campaigns',subtitle:'Best performing last 30 days',
      sampleKey:'topCampaigns',
      columns:[
        {header:'Campaign',field:'name',kind:'strong'},
        {header:'Type',field:'type'},
        {header:'Sent',field:'sent'},
        {header:'Open',field:'open'},
        {header:'Click',field:'click'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Spring Collection Launch',type:'Product',sent:'48K',open:'42%',click:'9.2%',status:'On Track'},
        {name:'Weekly Newsletter #14',type:'Newsletter',sent:'120K',open:'34%',click:'7.4%',status:'On Track'},
        {name:'Cart Abandonment',type:'Trigger',sent:'18K',open:'52%',click:'14.2%',status:'On Track'},
        {name:'Re-engagement Blast',type:'Re-engage',sent:'85K',open:'18%',click:'3.2%',status:'At Risk'},
        {name:'Webinar Invitation',type:'Promotional',sent:'24K',open:'38%',click:'8.8%',status:'On Track'},
      ]
    },
    {
      tableId:'topTemplates',tab:'templates',title:'Template Performance',subtitle:'Top performing templates',
      sampleKey:'topTemplates',
      columns:[
        {header:'Template',field:'name',kind:'strong'},
        {header:'Uses',field:'uses'},
        {header:'Avg Open',field:'open'},
        {header:'Avg Click',field:'click'},
      ],
      sampleData:[
        {name:'Product Announcement',uses:24,open:'38%',click:'8.4%'},
        {name:'Weekly Digest',uses:52,open:'32%',click:'6.8%'},
        {name:'Cart Abandonment',uses:18,open:'48%',click:'12.4%'},
        {name:'Welcome Series #1',uses:32,open:'62%',click:'18.2%'},
        {name:'Event Invite',uses:14,open:'34%',click:'7.2%'},
      ]
    },
  ],
});

// ─── 13. Marketing Performance Dashboard ────────────────────────────────
const marketingPerformance = cfg({
  slug: 'marketing-performance-dashboard',
  title: 'Marketing Performance Dashboard',
  moduleName: 'Marketing',
  sidebarNav: STD_SIDEBAR(['Campaigns','Channels','Attribution','Spend']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'campaigns',label:'Campaigns'},
    {id:'channels',label:'Channels'},
    {id:'attribution',label:'Attribution'},
    {id:'spend',label:'Spend'},
  ],
  kpis: [
    {id:'mql',label:'MQLs',value:'1,840',trend:'+22%',direction:'up'},
    {id:'sql',label:'SQLs',value:'284',trend:'+18%',direction:'up'},
    {id:'cpa',label:'CPA',value:'$142',trend:'-8%',direction:'down'},
    {id:'roas',label:'ROAS',value:'4.8x',trend:'+0.4',direction:'up'},
    {id:'spend',label:'Spend MTD',value:'$342K',trend:'+6%',direction:'up'},
    {id:'attributed',label:'Attributed Pipeline',value:'$8.2M',trend:'+28%',direction:'up'},
  ],
  charts: [
    {
      canvasId:'pipelineTrend',tab:'overview',type:'line',
      title:'Attributed Pipeline',subtitle:'Monthly marketing-sourced pipeline',
      sampleKey:'pipelineTrend',
      sampleData:{labels:MONTHS_12,datasets:[
        {label:'Pipeline ($K)',data:[4200,4500,4900,5400,5800,6200,6600,7000,7400,7800,8000,8200],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'channelMix',tab:'channels',type:'doughnut',
      title:'Spend by Channel',subtitle:'MTD allocation',
      sampleKey:'channelMix',
      sampleData:{labels:['Paid Search','Paid Social','Content','Events','Partners','Direct'],counts:[32,24,18,14,8,4]}
    },
    {
      canvasId:'campaignROAS',tab:'campaigns',type:'bar',
      title:'Campaign ROAS',subtitle:'Top 6 campaigns',
      sampleKey:'campaignROAS',
      sampleData:{labels:['Q2 Brand','Retargeting','Webinar Push','ABM Dinners','Content Syndication','LinkedIn Ads'],datasets:[
        {label:'ROAS',data:[6.2,5.8,4.9,4.2,3.4,2.8],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'attributionModel',tab:'attribution',type:'bar',
      title:'Revenue by Attribution Model',subtitle:'Last 90 days',
      sampleKey:'attributionModel',
      sampleData:{labels:['First Touch','Last Touch','Linear','Position-Based','Data-Driven'],datasets:[
        {label:'Revenue ($K)',data:[1840,2100,1920,2040,2180],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'activeCampaigns',tab:'campaigns',title:'Active Campaigns',subtitle:'In-flight marketing activities',
      sampleKey:'activeCampaigns',
      columns:[
        {header:'Campaign',field:'name',kind:'strong'},
        {header:'Channel',field:'channel'},
        {header:'Spend',field:'spend'},
        {header:'MQLs',field:'mqls'},
        {header:'CPA',field:'cpa'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Q2 Brand Awareness',channel:'Paid Search',spend:'$48K',mqls:420,cpa:'$114',status:'On Track'},
        {name:'Retargeting',channel:'Paid Social',spend:'$32K',mqls:280,cpa:'$114',status:'On Track'},
        {name:'Webinar Series',channel:'Content',spend:'$24K',mqls:180,cpa:'$133',status:'On Track'},
        {name:'ABM Direct Mail',channel:'Partners',spend:'$28K',mqls:62,cpa:'$451',status:'At Risk'},
        {name:'LinkedIn Conquest',channel:'Paid Social',spend:'$18K',mqls:120,cpa:'$150',status:'On Track'},
        {name:'Content Syndication',channel:'Content',spend:'$22K',mqls:210,cpa:'$105',status:'On Track'},
      ]
    },
    {
      tableId:'channelSummary',tab:'channels',title:'Channel Summary',subtitle:'MTD performance',
      sampleKey:'channelSummary',
      columns:[
        {header:'Channel',field:'name',kind:'strong'},
        {header:'Spend',field:'spend'},
        {header:'MQLs',field:'mqls'},
        {header:'CPA',field:'cpa'},
        {header:'ROAS',field:'roas'},
      ],
      sampleData:[
        {name:'Paid Search',spend:'$110K',mqls:780,cpa:'$141',roas:'4.8x'},
        {name:'Paid Social',spend:'$82K',mqls:520,cpa:'$158',roas:'4.2x'},
        {name:'Content',spend:'$62K',mqls:420,cpa:'$148',roas:'5.2x'},
        {name:'Events',spend:'$48K',mqls:180,cpa:'$267',roas:'3.8x'},
        {name:'Partners',spend:'$28K',mqls:62,cpa:'$451',roas:'2.4x'},
      ]
    },
  ],
});

// ─── 14. Product Analytics ───────────────────────────────────────────────
const productAnalytics = cfg({
  slug: 'product-analytics',
  title: 'Product Analytics',
  moduleName: 'Product',
  sidebarNav: STD_SIDEBAR(['Usage','Features','Funnels','Cohorts']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'usage',label:'Usage'},
    {id:'features',label:'Features'},
    {id:'funnels',label:'Funnels'},
    {id:'cohorts',label:'Cohorts'},
  ],
  kpis: [
    {id:'dau',label:'DAU',value:'48,240',trend:'+8%',direction:'up'},
    {id:'mau',label:'MAU',value:'284,100',trend:'+12%',direction:'up'},
    {id:'dau-mau',label:'DAU/MAU',value:'17%',trend:'+1pp',direction:'up'},
    {id:'retention-d30',label:'D30 Retention',value:'42%',trend:'+3pp',direction:'up'},
    {id:'activation',label:'Activation Rate',value:'68%',trend:'+4pp',direction:'up'},
    {id:'session',label:'Avg Session',value:'8.4 min',trend:'+0.6',direction:'up'},
  ],
  charts: [
    {
      canvasId:'dauTrend',tab:'overview',type:'line',
      title:'DAU Trend',subtitle:'Trailing 12 weeks',
      sampleKey:'dauTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'DAU',data:[42000,43500,44200,45100,45800,46400,46900,47300,47600,47900,48100,48240],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'featureAdoption',tab:'features',type:'bar',
      title:'Feature Adoption',subtitle:'% of MAU using feature',
      sampleKey:'featureAdoption',
      sampleData:{labels:['Dashboards','Reports','Alerts','API','Integrations','Automations'],datasets:[
        {label:'Adoption %',data:[92,78,62,48,54,38],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'activationFunnel',tab:'funnels',type:'bar',
      title:'Activation Funnel',subtitle:'New user activation steps',
      sampleKey:'activationFunnel',
      sampleData:{labels:['Signed Up','Verified','First Login','First Action','Activated'],datasets:[
        {label:'Users',data:[12000,10800,9600,8400,8160],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
    {
      canvasId:'cohortRetention',tab:'cohorts',type:'line',
      title:'Cohort Retention',subtitle:'% retained by week since signup',
      sampleKey:'cohortRetention',
      sampleData:{labels:['W0','W1','W2','W3','W4','W5','W6','W7','W8'],datasets:[
        {label:'Retention %',data:[100,68,54,46,42,40,38,37,36],borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'topEvents',tab:'usage',title:'Top Events',subtitle:'Most triggered events this week',
      sampleKey:'topEvents',
      columns:[
        {header:'Event',field:'name',kind:'strong'},
        {header:'Users',field:'users'},
        {header:'Total',field:'count'},
        {header:'Per User',field:'perUser'},
      ],
      sampleData:[
        {name:'dashboard_viewed',users:'48K',count:'2.4M',perUser:'50'},
        {name:'report_run',users:'32K',count:'480K',perUser:'15'},
        {name:'alert_triggered',users:'18K',count:'62K',perUser:'3.4'},
        {name:'integration_synced',users:'12K',count:'124K',perUser:'10.3'},
        {name:'automation_executed',users:'8K',count:'32K',perUser:'4.0'},
      ]
    },
    {
      tableId:'featureUsage',tab:'features',title:'Feature Usage',subtitle:'Deep dive on feature engagement',
      sampleKey:'featureUsage',
      columns:[
        {header:'Feature',field:'name',kind:'strong'},
        {header:'MAU Using',field:'mau'},
        {header:'Retention',field:'retention'},
        {header:'NPS',field:'nps'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Dashboards',mau:'261K',retention:'92%',nps:'62',status:'On Track'},
        {name:'Reports',mau:'221K',retention:'84%',nps:'58',status:'On Track'},
        {name:'Alerts',mau:'176K',retention:'72%',nps:'52',status:'At Risk'},
        {name:'API',mau:'136K',retention:'88%',nps:'68',status:'On Track'},
        {name:'Integrations',mau:'153K',retention:'78%',nps:'54',status:'On Track'},
        {name:'Automations',mau:'108K',retention:'62%',nps:'48',status:'At Risk'},
      ]
    },
  ],
});

// ─── 15. Survey Analytics ────────────────────────────────────────────────
const surveyAnalytics = cfg({
  slug: 'survey-analytics',
  title: 'Survey Analytics',
  moduleName: 'Surveys',
  sidebarNav: STD_SIDEBAR(['Surveys','Responses','Segments','Insights']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'surveys',label:'Surveys'},
    {id:'responses',label:'Responses'},
    {id:'segments',label:'Segments'},
    {id:'insights',label:'Insights'},
  ],
  kpis: [
    {id:'responses',label:'Total Responses',value:'48,240',trend:'+18%',direction:'up'},
    {id:'nps',label:'NPS',value:'58',trend:'+4',direction:'up'},
    {id:'completion',label:'Completion Rate',value:'82%',trend:'+3pp',direction:'up'},
    {id:'active',label:'Active Surveys',value:'24',trend:'+2',direction:'up'},
    {id:'avg-time',label:'Avg Time',value:'3.4 min',trend:'-0.2',direction:'down'},
    {id:'response-rate',label:'Response Rate',value:'28%',trend:'+2pp',direction:'up'},
  ],
  charts: [
    {
      canvasId:'responseTrend',tab:'overview',type:'line',
      title:'Response Volume',subtitle:'Trailing 12 weeks',
      sampleKey:'responseTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'Responses',data:[2800,3200,3400,3800,4100,4300,4500,4200,4100,4400,4600,4800],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'npsDistribution',tab:'insights',type:'bar',
      title:'NPS Distribution',subtitle:'Promoters / Passives / Detractors',
      sampleKey:'npsDistribution',
      sampleData:{labels:['Detractors (0-6)','Passives (7-8)','Promoters (9-10)'],datasets:[
        {label:'%',data:[12,30,58],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'segmentMix',tab:'segments',type:'doughnut',
      title:'Responses by Segment',subtitle:'Last 30 days',
      sampleKey:'segmentMix',
      sampleData:{labels:['New Customer','Power User','At Risk','Advocate','Dormant','Lost'],counts:[32,28,14,18,6,2]}
    },
    {
      canvasId:'topicTrends',tab:'insights',type:'bar',
      title:'Trending Topics',subtitle:'Mentions in open-text responses',
      sampleKey:'topicTrends',
      sampleData:{labels:['UX/Design','Performance','Pricing','Features','Support','Mobile'],datasets:[
        {label:'Mentions',data:[420,380,280,520,340,240],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'activeSurveys',tab:'surveys',title:'Active Surveys',subtitle:'Currently collecting responses',
      sampleKey:'activeSurveys',
      columns:[
        {header:'Survey',field:'name',kind:'strong'},
        {header:'Type',field:'type'},
        {header:'Sent',field:'sent'},
        {header:'Responses',field:'responses'},
        {header:'Rate',field:'rate'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Q2 Product NPS',type:'NPS',sent:'48K',responses:'12K',rate:'25%',status:'On Track'},
        {name:'Feature Feedback v2',type:'CSAT',sent:'24K',responses:'8.4K',rate:'35%',status:'On Track'},
        {name:'Onboarding Experience',type:'CES',sent:'8.2K',responses:'3.2K',rate:'39%',status:'On Track'},
        {name:'Support Satisfaction',type:'CSAT',sent:'14K',responses:'4.8K',rate:'34%',status:'On Track'},
        {name:'Churn Interview',type:'Open',sent:'620',responses:'84',rate:'14%',status:'At Risk'},
      ]
    },
    {
      tableId:'topResponses',tab:'responses',title:'Recent Responses',subtitle:'Latest feedback',
      sampleKey:'topResponses',
      columns:[
        {header:'Survey',field:'survey'},
        {header:'Respondent',field:'respondent'},
        {header:'Sentiment',field:'sentiment',kind:'pill-ok-warn-danger'},
        {header:'Score',field:'score'},
        {header:'Submitted',field:'time',kind:'mono'},
      ],
      sampleData:[
        {survey:'Q2 Product NPS',respondent:'Enterprise User',sentiment:'On Track',score:'9/10',time:'2026-04-14 08:42'},
        {survey:'Feature Feedback',respondent:'Power User',sentiment:'On Track',score:'8/10',time:'2026-04-14 08:15'},
        {survey:'Support CSAT',respondent:'SMB Customer',sentiment:'At Risk',score:'6/10',time:'2026-04-14 07:52'},
        {survey:'Onboarding CES',respondent:'New User',sentiment:'On Track',score:'Low effort',time:'2026-04-14 07:30'},
        {survey:'Churn Interview',respondent:'Former Customer',sentiment:'Delayed',score:'3/10',time:'2026-04-14 06:48'},
      ]
    },
  ],
});

// ─── 16. Build Dashboard ─────────────────────────────────────────────────
const buildDashboard = cfg({
  slug: 'build-dashboard',
  title: 'Build Dashboard',
  moduleName: 'Builds',
  sidebarNav: STD_SIDEBAR(['Jobs','Queue','Models','Errors']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'jobs',label:'Jobs'},
    {id:'queue',label:'Queue'},
    {id:'models',label:'Models'},
    {id:'errors',label:'Errors'},
  ],
  kpis: [
    {id:'jobs-today',label:'Jobs Today',value:'1,284',trend:'+18%',direction:'up'},
    {id:'success-rate',label:'Success Rate',value:'94.2%',trend:'+1.2pp',direction:'up'},
    {id:'avg-duration',label:'Avg Duration',value:'42s',trend:'-4s',direction:'down'},
    {id:'tokens',label:'Tokens Used',value:'48.2M',trend:'+12%',direction:'up'},
    {id:'queue',label:'Queue Depth',value:'18',trend:'-6',direction:'down'},
    {id:'error-rate',label:'Error Rate',value:'5.8%',trend:'-1.2pp',direction:'down'},
  ],
  charts: [
    {
      canvasId:'jobTrend',tab:'overview',type:'line',
      title:'Job Volume',subtitle:'Jobs per hour, last 24 hours',
      sampleKey:'jobTrend',
      sampleData:{labels:['00','03','06','09','12','15','18','21'],datasets:[
        {label:'Jobs',data:[32,28,38,62,84,92,88,72],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'jobsByType',tab:'jobs',type:'doughnut',
      title:'Jobs by Type',subtitle:'Last 24 hours',
      sampleKey:'jobsByType',
      sampleData:{labels:['Dashboard','App','Edit','Skeleton','Debug','Export'],counts:[420,180,240,120,98,226]}
    },
    {
      canvasId:'modelUsage',tab:'models',type:'bar',
      title:'Model Usage',subtitle:'Token count by model',
      sampleKey:'modelUsage',
      sampleData:{labels:['claude-sonnet','claude-opus','gpt-4o','haiku'],datasets:[
        {label:'Tokens (M)',data:[28.4,12.2,4.8,2.8],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'errorTrend',tab:'errors',type:'line',
      title:'Error Rate',subtitle:'Trailing 12 hours',
      sampleKey:'errorTrend',
      sampleData:{labels:['-12h','-10h','-8h','-6h','-4h','-2h','Now'],datasets:[
        {label:'Error %',data:[7.2,6.8,6.4,5.9,5.6,5.4,5.2],borderColor:'#EF4444',backgroundColor:'rgba(239,68,68,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'recentJobs',tab:'jobs',title:'Recent Jobs',subtitle:'Last 15 builds',
      sampleKey:'recentJobs',
      columns:[
        {header:'Job ID',field:'id',kind:'mono'},
        {header:'Prompt',field:'prompt',kind:'strong'},
        {header:'Type',field:'type'},
        {header:'Duration',field:'duration'},
        {header:'Tokens',field:'tokens'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {id:'job_8f2a',prompt:'Show me sales pipeline',type:'Dashboard',duration:'38s',tokens:'12.4K',status:'On Track'},
        {id:'job_8f29',prompt:'Build customer support app',type:'App',duration:'2m 18s',tokens:'48.2K',status:'On Track'},
        {id:'job_8f28',prompt:'Add KPI to finance dashboard',type:'Edit',duration:'22s',tokens:'4.8K',status:'On Track'},
        {id:'job_8f27',prompt:'Generate ops report',type:'Dashboard',duration:'41s',tokens:'14.2K',status:'On Track'},
        {id:'job_8f26',prompt:'Fix chart layout',type:'Debug',duration:'18s',tokens:'3.2K',status:'At Risk'},
        {id:'job_8f25',prompt:'Ecommerce funnel',type:'Dashboard',duration:'45s',tokens:'16.8K',status:'On Track'},
      ]
    },
    {
      tableId:'topErrors',tab:'errors',title:'Top Errors',subtitle:'Most frequent failures',
      sampleKey:'topErrors',
      columns:[
        {header:'Error',field:'name',kind:'strong'},
        {header:'Count',field:'count'},
        {header:'First Seen',field:'first',kind:'mono'},
        {header:'Severity',field:'severity',kind:'pill-severity'},
      ],
      sampleData:[
        {name:'Edge function timeout',count:42,first:'2026-04-14 02:18',severity:'P1'},
        {name:'LLM rate limit exceeded',count:28,first:'2026-04-14 04:32',severity:'P2'},
        {name:'Malformed diff response',count:18,first:'2026-04-14 06:15',severity:'P2'},
        {name:'Preview asset 404',count:14,first:'2026-04-13 22:40',severity:'P3'},
      ]
    },
  ],
});

// ─── 17. Build Dashboard Admin ───────────────────────────────────────────
const buildDashboardAdmin = cfg({
  slug: 'build-dashboard-admin',
  title: 'Build Dashboard — Admin',
  moduleName: 'Admin',
  sidebarNav: STD_SIDEBAR(['Tenants','System','Costs','Workers']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'tenants',label:'Tenants'},
    {id:'system',label:'System'},
    {id:'costs',label:'Costs'},
    {id:'workers',label:'Workers'},
  ],
  kpis: [
    {id:'active-tenants',label:'Active Tenants',value:'482',trend:'+24',direction:'up'},
    {id:'jobs-24h',label:'Jobs 24h',value:'1,284',trend:'+18%',direction:'up'},
    {id:'system-health',label:'System Health',value:'98.8%',trend:'+0.4pp',direction:'up'},
    {id:'cost-today',label:'Cost Today',value:'$342',trend:'+12%',direction:'up'},
    {id:'workers',label:'Active Workers',value:'12',trend:'+2',direction:'up'},
    {id:'queue',label:'Queue Depth',value:'18',trend:'-6',direction:'down'},
  ],
  charts: [
    {
      canvasId:'tenantActivity',tab:'tenants',type:'bar',
      title:'Top Tenants by Volume',subtitle:'Jobs run today',
      sampleKey:'tenantActivity',
      sampleData:{labels:['Acme','Globex','Initech','Umbrella','Stark','Wayne','Tyrell','Soylent'],datasets:[
        {label:'Jobs',data:[148,132,118,94,82,74,62,48],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'systemLoad',tab:'system',type:'line',
      title:'System Load',subtitle:'CPU and memory, last hour',
      sampleKey:'systemLoad',
      sampleData:{labels:['-60','-50','-40','-30','-20','-10','Now'],datasets:[
        {label:'CPU %',data:[42,48,52,58,62,68,64],borderColor:'#00B4D8',tension:.35,fill:false},
        {label:'Memory %',data:[58,60,62,64,66,68,70],borderColor:'#7B61FF',tension:.35,fill:false},
      ]}
    },
    {
      canvasId:'costTrend',tab:'costs',type:'line',
      title:'Cost Trend',subtitle:'Daily inference cost, 14 days',
      sampleKey:'costTrend',
      sampleData:{labels:['D1','D3','D5','D7','D9','D11','D13','D14'],datasets:[
        {label:'Cost ($)',data:[280,310,298,320,342,358,340,342],borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'workerStatus',tab:'workers',type:'doughnut',
      title:'Worker Status',subtitle:'Pool distribution',
      sampleKey:'workerStatus',
      sampleData:{labels:['Healthy','Busy','Idle','Draining','Failed'],counts:[8,3,1,0,0]}
    },
  ],
  tables: [
    {
      tableId:'topTenants',tab:'tenants',title:'Top Tenants',subtitle:'Resource consumption',
      sampleKey:'topTenants',
      columns:[
        {header:'Tenant',field:'name',kind:'strong'},
        {header:'Jobs 24h',field:'jobs'},
        {header:'Tokens',field:'tokens'},
        {header:'Cost',field:'cost'},
        {header:'Plan',field:'plan'},
      ],
      sampleData:[
        {name:'Acme Corp',jobs:148,tokens:'4.2M',cost:'$42',plan:'Enterprise'},
        {name:'Globex',jobs:132,tokens:'3.8M',cost:'$38',plan:'Enterprise'},
        {name:'Initech',jobs:118,tokens:'3.2M',cost:'$32',plan:'Growth'},
        {name:'Umbrella',jobs:94,tokens:'2.4M',cost:'$24',plan:'Growth'},
        {name:'Stark Industries',jobs:82,tokens:'2.1M',cost:'$21',plan:'Enterprise'},
        {name:'Wayne Enterprises',jobs:74,tokens:'1.9M',cost:'$19',plan:'Growth'},
      ]
    },
    {
      tableId:'systemAlerts',tab:'system',title:'System Alerts',subtitle:'Active platform alerts',
      sampleKey:'systemAlerts',
      columns:[
        {header:'Alert',field:'name',kind:'strong'},
        {header:'Component',field:'component'},
        {header:'Severity',field:'severity',kind:'pill-severity'},
        {header:'Age',field:'age'},
      ],
      sampleData:[
        {name:'Edge function timeout spike',component:'supabase',severity:'P2',age:'12m'},
        {name:'LLM provider rate limit',component:'anthropic',severity:'P2',age:'4m'},
        {name:'Worker pool near capacity',component:'executor',severity:'P3',age:'28m'},
      ]
    },
  ],
});

// ─── 18. Enterprise Onboarding ───────────────────────────────────────────
const enterpriseOnboarding = cfg({
  slug: 'enterprise-onboarding',
  title: 'Enterprise Onboarding',
  moduleName: 'Onboarding',
  sidebarNav: STD_SIDEBAR(['Sessions','Activations','Integrations','Time to Value']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'sessions',label:'Sessions'},
    {id:'activations',label:'Activations'},
    {id:'integrations',label:'Integrations'},
    {id:'ttv',label:'Time to Value'},
  ],
  kpis: [
    {id:'active-sessions',label:'Active Sessions',value:'42',trend:'+8',direction:'up'},
    {id:'completion',label:'Completion Rate',value:'78%',trend:'+4pp',direction:'up'},
    {id:'ttv',label:'Avg Time to Value',value:'3.2 days',trend:'-0.8d',direction:'down'},
    {id:'connections',label:'Integrations Connected',value:'184',trend:'+28',direction:'up'},
    {id:'activations',label:'Activations MTD',value:'62',trend:'+14',direction:'up'},
    {id:'abandon',label:'Abandon Rate',value:'22%',trend:'-4pp',direction:'down'},
  ],
  charts: [
    {
      canvasId:'sessionFunnel',tab:'overview',type:'bar',
      title:'Onboarding Funnel',subtitle:'Sessions at each stage',
      sampleKey:'sessionFunnel',
      sampleData:{labels:['Started','Company Info','Connectors','Profiling','Complete'],datasets:[
        {label:'Sessions',data:[120,108,92,84,78],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'completionTrend',tab:'sessions',type:'line',
      title:'Completion Trend',subtitle:'Daily completion rate',
      sampleKey:'completionTrend',
      sampleData:{labels:['D1','D5','D10','D15','D20','D25','D30'],datasets:[
        {label:'Completion %',data:[68,70,72,74,75,76,78],borderColor:'#00E5A0',backgroundColor:'rgba(0,229,160,.12)',tension:.35,fill:true}
      ]}
    },
    {
      canvasId:'connectorsMix',tab:'integrations',type:'doughnut',
      title:'Most Connected Integrations',subtitle:'Last 30 days',
      sampleKey:'connectorsMix',
      sampleData:{labels:['HubSpot','Salesforce','Slack','Google Analytics','Airtable','Other'],counts:[48,32,28,24,18,34]}
    },
    {
      canvasId:'ttvDistribution',tab:'ttv',type:'bar',
      title:'Time to Value Distribution',subtitle:'Days to first insight',
      sampleKey:'ttvDistribution',
      sampleData:{labels:['<1d','1-2d','3-5d','6-10d','>10d'],datasets:[
        {label:'Customers',data:[18,24,28,14,6],backgroundColor:'#7B61FF',borderRadius:4}
      ]}
    },
  ],
  tables: [
    {
      tableId:'activeSessions',tab:'sessions',title:'Active Sessions',subtitle:'In-progress onboarding',
      sampleKey:'activeSessions',
      columns:[
        {header:'Organization',field:'name',kind:'strong'},
        {header:'Step',field:'step'},
        {header:'Started',field:'started',kind:'mono'},
        {header:'Industry',field:'industry'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Acme Corp',step:'Connectors',started:'2026-04-14 08:12',industry:'Technology',status:'On Track'},
        {name:'Globex Inc',step:'Profiling',started:'2026-04-14 07:48',industry:'Finance',status:'On Track'},
        {name:'Initech',step:'Company Info',started:'2026-04-14 08:42',industry:'Technology',status:'On Track'},
        {name:'Umbrella Co',step:'Connectors',started:'2026-04-13 22:18',industry:'Healthcare',status:'At Risk'},
        {name:'Stark Industries',step:'Complete',started:'2026-04-13 14:32',industry:'Manufacturing',status:'On Track'},
        {name:'Wayne Enterprises',step:'Profiling',started:'2026-04-13 10:22',industry:'Retail',status:'On Track'},
      ]
    },
    {
      tableId:'recentCompletions',tab:'activations',title:'Recent Activations',subtitle:'Fully onboarded customers',
      sampleKey:'recentCompletions',
      columns:[
        {header:'Organization',field:'name',kind:'strong'},
        {header:'Completed',field:'completed',kind:'mono'},
        {header:'Duration',field:'duration'},
        {header:'Connectors',field:'connectors'},
        {header:'Verdict',field:'verdict',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {name:'Tyrell Corp',completed:'2026-04-14 07:22',duration:'2.4 days',connectors:4,verdict:'On Track'},
        {name:'Soylent Corp',completed:'2026-04-13 18:45',duration:'3.1 days',connectors:3,verdict:'On Track'},
        {name:'Cyberdyne',completed:'2026-04-13 14:18',duration:'1.8 days',connectors:5,verdict:'On Track'},
        {name:'Pied Piper',completed:'2026-04-13 11:32',duration:'4.2 days',connectors:2,verdict:'At Risk'},
        {name:'Hooli',completed:'2026-04-12 22:14',duration:'2.9 days',connectors:4,verdict:'On Track'},
      ]
    },
  ],
});

// ─── 19. Operations Command Center ───────────────────────────────────────
const operationsCommandCenter = cfg({
  slug: 'operations-command-center',
  title: 'Operations Command Center',
  moduleName: 'Command',
  sidebarNav: STD_SIDEBAR(['Health','Incidents','SLOs','Deployments']),
  tabs: [
    {id:'overview',label:'Overview'},
    {id:'health',label:'Service Health'},
    {id:'incidents',label:'Incidents'},
    {id:'slos',label:'SLOs'},
    {id:'deployments',label:'Deployments'},
  ],
  kpis: [
    {id:'uptime',label:'Uptime (30d)',value:'99.97%',trend:'+0.02pp',direction:'up'},
    {id:'open-incidents',label:'Open Incidents',value:'4',trend:'-2',direction:'down'},
    {id:'mttr',label:'MTTR',value:'42 min',trend:'-8 min',direction:'down'},
    {id:'deployments',label:'Deployments MTD',value:'142',trend:'+18',direction:'up'},
    {id:'error-budget',label:'Error Budget',value:'82%',trend:'+4pp',direction:'up'},
    {id:'oncall-load',label:'On-Call Load',value:'Low',trend:'Improving',direction:'up'},
  ],
  charts: [
    {
      canvasId:'serviceHealth',tab:'health',type:'bar',
      title:'Service Health',subtitle:'Availability by service',
      sampleKey:'serviceHealth',
      sampleData:{labels:['API','Web','Auth','DB','Queue','Cache','Search','CDN'],datasets:[
        {label:'Availability %',data:[99.98,99.99,99.96,99.95,99.92,99.99,99.94,99.99],backgroundColor:'#00E5A0',borderRadius:4}
      ]}
    },
    {
      canvasId:'incidentTrend',tab:'incidents',type:'line',
      title:'Incident Trend',subtitle:'P1/P2 incidents per week',
      sampleKey:'incidentTrend',
      sampleData:{labels:WEEKS_12,datasets:[
        {label:'P1',data:[2,1,3,2,1,0,2,1,0,1,2,1],borderColor:'#EF4444',tension:.3,fill:false},
        {label:'P2',data:[4,6,5,7,4,3,5,4,3,5,4,4],borderColor:'#F59E0B',tension:.3,fill:false},
      ]}
    },
    {
      canvasId:'sloBurn',tab:'slos',type:'bar',
      title:'SLO Error Budget',subtitle:'Budget remaining by SLO',
      sampleKey:'sloBurn',
      sampleData:{labels:['API Availability','API Latency p99','Write Success','Read Freshness','Login Success'],datasets:[
        {label:'Remaining %',data:[82,64,92,58,88],backgroundColor:'#00B4D8',borderRadius:4}
      ]}
    },
    {
      canvasId:'deployVolume',tab:'deployments',type:'line',
      title:'Deployment Volume',subtitle:'Daily deployments, 2 weeks',
      sampleKey:'deployVolume',
      sampleData:{labels:['D1','D3','D5','D7','D9','D11','D13','D14'],datasets:[
        {label:'Deployments',data:[8,10,12,14,10,12,14,12],borderColor:'#7B61FF',backgroundColor:'rgba(123,97,255,.12)',tension:.35,fill:true}
      ]}
    },
  ],
  tables: [
    {
      tableId:'activeIncidents',tab:'incidents',title:'Active Incidents',subtitle:'Open P1/P2/P3',
      sampleKey:'activeIncidents',
      columns:[
        {header:'ID',field:'id',kind:'mono'},
        {header:'Summary',field:'summary',kind:'strong'},
        {header:'Service',field:'service'},
        {header:'Severity',field:'severity',kind:'pill-severity'},
        {header:'Age',field:'age'},
      ],
      sampleData:[
        {id:'INC-9842',summary:'Elevated API latency in eu-west-1',service:'API',severity:'P1',age:'18m'},
        {id:'INC-9841',summary:'Search index staleness',service:'Search',severity:'P2',age:'42m'},
        {id:'INC-9840',summary:'Webhook delivery retry queue growing',service:'Queue',severity:'P2',age:'1h 12m'},
        {id:'INC-9839',summary:'CDN cache hit rate dip',service:'CDN',severity:'P3',age:'2h 08m'},
      ]
    },
    {
      tableId:'recentDeploys',tab:'deployments',title:'Recent Deployments',subtitle:'Last 8 deploys',
      sampleKey:'recentDeploys',
      columns:[
        {header:'Service',field:'service',kind:'strong'},
        {header:'Version',field:'version',kind:'mono'},
        {header:'Engineer',field:'engineer'},
        {header:'Time',field:'time',kind:'mono'},
        {header:'Status',field:'status',kind:'pill-ok-warn-danger'},
      ],
      sampleData:[
        {service:'api',version:'v2.42.1',engineer:'S. Chen',time:'2026-04-14 08:18',status:'On Track'},
        {service:'web',version:'v1.184.0',engineer:'M. Patel',time:'2026-04-14 07:42',status:'On Track'},
        {service:'executor',version:'v0.38.2',engineer:'R. Martinez',time:'2026-04-14 05:20',status:'On Track'},
        {service:'api',version:'v2.42.0',engineer:'J. Park',time:'2026-04-13 22:05',status:'On Track'},
        {service:'edge-fn',version:'v14',engineer:'K. Liu',time:'2026-04-13 18:32',status:'At Risk'},
        {service:'web',version:'v1.183.0',engineer:'A. Nguyen',time:'2026-04-13 14:18',status:'On Track'},
      ]
    },
  ],
});

export const PART_2_CONFIGS = [
  legalDashboard,
  sprintDashboard,
  supportDashboard,
  portfolioDashboard,
  pnlDashboard,
  ecommerceAnalytics,
  emailAnalytics,
  marketingPerformance,
  productAnalytics,
  surveyAnalytics,
  buildDashboard,
  buildDashboardAdmin,
  enterpriseOnboarding,
  operationsCommandCenter,
];
