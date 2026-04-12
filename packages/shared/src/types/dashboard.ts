export const WIDGET_TYPES = {
  kpi_bar: "kpi_bar",
  health_score: "health_score",
  wealth_forecast: "wealth_forecast",
  portfolio_allocation: "portfolio_allocation",
  action_center: "action_center",
  rent_income_timeline: "rent_income_timeline",
  vacancy_rate: "vacancy_rate",
  upcoming_deadlines: "upcoming_deadlines",
  rent_arrears: "rent_arrears",
  expenses_by_category: "expenses_by_category",
  ltv_overview: "ltv_overview",
  market_comparison: "market_comparison",
  amortization_progress: "amortization_progress",
  quick_actions: "quick_actions",
} as const;

export type WidgetType = (typeof WIDGET_TYPES)[keyof typeof WIDGET_TYPES];

export interface WidgetSize {
  cols: number;
  rows: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  position: WidgetPosition;
  size: WidgetSize;
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  widgets: WidgetInstance[];
  version: number;
}

export interface WidgetDefinition {
  type: WidgetType;
  i18nKey: string;
  icon: string;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  minSize: WidgetSize;
  maxSize: WidgetSize;
}

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  [WIDGET_TYPES.kpi_bar]: {
    type: WIDGET_TYPES.kpi_bar,
    i18nKey: "kpiBar",
    icon: "BarChart3",
    defaultSize: { cols: 12, rows: 1 },
    allowedSizes: [
      { cols: 12, rows: 1 },
      { cols: 6, rows: 2 },
    ],
    minSize: { cols: 6, rows: 1 },
    maxSize: { cols: 12, rows: 2 },
  },
  [WIDGET_TYPES.health_score]: {
    type: WIDGET_TYPES.health_score,
    i18nKey: "healthScore",
    icon: "Activity",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
      { cols: 12, rows: 1 },
    ],
    minSize: { cols: 4, rows: 1 },
    maxSize: { cols: 12, rows: 2 },
  },
  [WIDGET_TYPES.wealth_forecast]: {
    type: WIDGET_TYPES.wealth_forecast,
    i18nKey: "wealthForecast",
    icon: "TrendingUp",
    defaultSize: { cols: 8, rows: 3 },
    allowedSizes: [
      { cols: 6, rows: 3 },
      { cols: 8, rows: 3 },
      { cols: 12, rows: 3 },
    ],
    minSize: { cols: 6, rows: 3 },
    maxSize: { cols: 12, rows: 4 },
  },
  [WIDGET_TYPES.portfolio_allocation]: {
    type: WIDGET_TYPES.portfolio_allocation,
    i18nKey: "portfolioAllocation",
    icon: "PieChart",
    defaultSize: { cols: 4, rows: 3 },
    allowedSizes: [
      { cols: 4, rows: 3 },
      { cols: 6, rows: 3 },
      { cols: 12, rows: 3 },
    ],
    minSize: { cols: 4, rows: 3 },
    maxSize: { cols: 12, rows: 4 },
  },
  [WIDGET_TYPES.action_center]: {
    type: WIDGET_TYPES.action_center,
    i18nKey: "actionCenter",
    icon: "AlertTriangle",
    defaultSize: { cols: 12, rows: 3 },
    allowedSizes: [
      { cols: 6, rows: 3 },
      { cols: 12, rows: 3 },
    ],
    minSize: { cols: 6, rows: 3 },
    maxSize: { cols: 12, rows: 4 },
  },
  [WIDGET_TYPES.rent_income_timeline]: {
    type: WIDGET_TYPES.rent_income_timeline,
    i18nKey: "rentIncomeTimeline",
    icon: "BarChart",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 6, rows: 2 },
      { cols: 12, rows: 2 },
    ],
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
  },
  [WIDGET_TYPES.vacancy_rate]: {
    type: WIDGET_TYPES.vacancy_rate,
    i18nKey: "vacancyRate",
    icon: "Home",
    defaultSize: { cols: 4, rows: 2 },
    allowedSizes: [
      { cols: 3, rows: 2 },
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
    ],
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 3 },
  },
  [WIDGET_TYPES.upcoming_deadlines]: {
    type: WIDGET_TYPES.upcoming_deadlines,
    i18nKey: "upcomingDeadlines",
    icon: "CalendarClock",
    defaultSize: { cols: 4, rows: 2 },
    allowedSizes: [
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
      { cols: 6, rows: 3 },
    ],
    minSize: { cols: 3, rows: 2 },
    maxSize: { cols: 6, rows: 3 },
  },
  [WIDGET_TYPES.rent_arrears]: {
    type: WIDGET_TYPES.rent_arrears,
    i18nKey: "rentArrears",
    icon: "Clock",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
      { cols: 12, rows: 2 },
    ],
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
  },
  [WIDGET_TYPES.expenses_by_category]: {
    type: WIDGET_TYPES.expenses_by_category,
    i18nKey: "expensesByCategory",
    icon: "Receipt",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
      { cols: 12, rows: 2 },
    ],
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
  },
  [WIDGET_TYPES.ltv_overview]: {
    type: WIDGET_TYPES.ltv_overview,
    i18nKey: "ltvOverview",
    icon: "BarChart2",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
      { cols: 12, rows: 2 },
    ],
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
  },
  [WIDGET_TYPES.market_comparison]: {
    type: WIDGET_TYPES.market_comparison,
    i18nKey: "marketComparison",
    icon: "Scale",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 6, rows: 2 },
      { cols: 12, rows: 2 },
    ],
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
  },
  [WIDGET_TYPES.amortization_progress]: {
    type: WIDGET_TYPES.amortization_progress,
    i18nKey: "amortizationProgress",
    icon: "Target",
    defaultSize: { cols: 6, rows: 2 },
    allowedSizes: [
      { cols: 4, rows: 2 },
      { cols: 6, rows: 2 },
      { cols: 12, rows: 2 },
    ],
    minSize: { cols: 4, rows: 2 },
    maxSize: { cols: 12, rows: 3 },
  },
  [WIDGET_TYPES.quick_actions]: {
    type: WIDGET_TYPES.quick_actions,
    i18nKey: "quickActions",
    icon: "Zap",
    defaultSize: { cols: 3, rows: 1 },
    allowedSizes: [
      { cols: 3, rows: 1 },
      { cols: 4, rows: 1 },
      { cols: 6, rows: 1 },
      { cols: 12, rows: 1 },
    ],
    minSize: { cols: 3, rows: 1 },
    maxSize: { cols: 12, rows: 2 },
  },
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  widgets: [
    {
      id: "default-kpi-bar",
      type: WIDGET_TYPES.kpi_bar,
      position: { x: 0, y: 0 },
      size: { cols: 12, rows: 1 },
    },
    {
      id: "default-health-score",
      type: WIDGET_TYPES.health_score,
      position: { x: 0, y: 1 },
      size: { cols: 12, rows: 1 },
    },
    {
      id: "default-wealth-forecast",
      type: WIDGET_TYPES.wealth_forecast,
      position: { x: 0, y: 2 },
      size: { cols: 8, rows: 3 },
    },
    {
      id: "default-portfolio-allocation",
      type: WIDGET_TYPES.portfolio_allocation,
      position: { x: 8, y: 2 },
      size: { cols: 4, rows: 3 },
    },
    {
      id: "default-action-center",
      type: WIDGET_TYPES.action_center,
      position: { x: 0, y: 5 },
      size: { cols: 12, rows: 3 },
    },
  ],
  version: 1,
};
