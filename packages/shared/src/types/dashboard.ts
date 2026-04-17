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

export const WIDGET_CATEGORIES = {
  financial: "financial",
  portfolio: "portfolio",
  operations: "operations",
  actions: "actions",
} as const;

export type WidgetCategory =
  (typeof WIDGET_CATEGORIES)[keyof typeof WIDGET_CATEGORIES];

export const WIDGET_SIZE_VARIANTS = {
  xs: { cols: 2, rows: 2 },
  sm: { cols: 3, rows: 3 },
  md: { cols: 4, rows: 3 },
  lg: { cols: 6, rows: 3 },
  xl: { cols: 6, rows: 5 },
  xxl: { cols: 8, rows: 6 },
  full: { cols: 12, rows: 2 },
  hero: { cols: 12, rows: 6 },
} as const;

export type WidgetSizeVariant = keyof typeof WIDGET_SIZE_VARIANTS;

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
  variant: WidgetSizeVariant;
  position: WidgetPosition;
  size: WidgetSize;
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  widgets: WidgetInstance[];
  version: number;
}

export interface DashboardPreset {
  id: string;
  name: string;
  isDefault: boolean;
  layout: DashboardLayout;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetDefinition {
  type: WidgetType;
  i18nKey: string;
  icon: string;
  category: WidgetCategory;
  defaultVariant: WidgetSizeVariant;
  availableVariants: WidgetSizeVariant[];
}

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  kpi_bar: {
    type: WIDGET_TYPES.kpi_bar,
    i18nKey: "kpiBar",
    icon: "BarChart3",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "full",
    availableVariants: ["lg", "full", "hero"],
  },
  health_score: {
    type: WIDGET_TYPES.health_score,
    i18nKey: "healthScore",
    icon: "Activity",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "lg",
    availableVariants: ["md", "lg", "xl", "full"],
  },
  wealth_forecast: {
    type: WIDGET_TYPES.wealth_forecast,
    i18nKey: "wealthForecast",
    icon: "TrendingUp",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "hero",
    availableVariants: ["xl", "xxl", "hero"],
  },
  portfolio_allocation: {
    type: WIDGET_TYPES.portfolio_allocation,
    i18nKey: "portfolioAllocation",
    icon: "PieChart",
    category: WIDGET_CATEGORIES.portfolio,
    defaultVariant: "xl",
    availableVariants: ["md", "lg", "xl", "hero"],
  },
  action_center: {
    type: WIDGET_TYPES.action_center,
    i18nKey: "actionCenter",
    icon: "AlertTriangle",
    category: WIDGET_CATEGORIES.actions,
    defaultVariant: "hero",
    availableVariants: ["xl", "full", "hero"],
  },
  rent_income_timeline: {
    type: WIDGET_TYPES.rent_income_timeline,
    i18nKey: "rentIncomeTimeline",
    icon: "BarChart",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "lg",
    availableVariants: ["lg", "xl", "full"],
  },
  vacancy_rate: {
    type: WIDGET_TYPES.vacancy_rate,
    i18nKey: "vacancyRate",
    icon: "Home",
    category: WIDGET_CATEGORIES.portfolio,
    defaultVariant: "md",
    availableVariants: ["sm", "md", "lg"],
  },
  upcoming_deadlines: {
    type: WIDGET_TYPES.upcoming_deadlines,
    i18nKey: "upcomingDeadlines",
    icon: "CalendarClock",
    category: WIDGET_CATEGORIES.operations,
    defaultVariant: "md",
    availableVariants: ["md", "lg", "xl"],
  },
  rent_arrears: {
    type: WIDGET_TYPES.rent_arrears,
    i18nKey: "rentArrears",
    icon: "Clock",
    category: WIDGET_CATEGORIES.operations,
    defaultVariant: "lg",
    availableVariants: ["md", "lg", "full"],
  },
  expenses_by_category: {
    type: WIDGET_TYPES.expenses_by_category,
    i18nKey: "expensesByCategory",
    icon: "Receipt",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "lg",
    availableVariants: ["md", "lg", "full"],
  },
  ltv_overview: {
    type: WIDGET_TYPES.ltv_overview,
    i18nKey: "ltvOverview",
    icon: "BarChart2",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "lg",
    availableVariants: ["md", "lg", "full"],
  },
  market_comparison: {
    type: WIDGET_TYPES.market_comparison,
    i18nKey: "marketComparison",
    icon: "Scale",
    category: WIDGET_CATEGORIES.portfolio,
    defaultVariant: "lg",
    availableVariants: ["lg", "xl", "full"],
  },
  amortization_progress: {
    type: WIDGET_TYPES.amortization_progress,
    i18nKey: "amortizationProgress",
    icon: "Target",
    category: WIDGET_CATEGORIES.financial,
    defaultVariant: "lg",
    availableVariants: ["md", "lg", "full"],
  },
  quick_actions: {
    type: WIDGET_TYPES.quick_actions,
    i18nKey: "quickActions",
    icon: "Zap",
    category: WIDGET_CATEGORIES.actions,
    defaultVariant: "md",
    availableVariants: ["xs", "sm", "md", "lg"],
  },
};

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  widgets: [
    {
      id: "default-kpi-bar",
      type: WIDGET_TYPES.kpi_bar,
      variant: "full",
      position: { x: 0, y: 0 },
      size: WIDGET_SIZE_VARIANTS.full,
    },
    {
      id: "default-health-score",
      type: WIDGET_TYPES.health_score,
      variant: "xl",
      position: { x: 0, y: 2 },
      size: WIDGET_SIZE_VARIANTS.xl,
    },
    {
      id: "default-portfolio-allocation",
      type: WIDGET_TYPES.portfolio_allocation,
      variant: "xl",
      position: { x: 6, y: 2 },
      size: WIDGET_SIZE_VARIANTS.xl,
    },
    {
      id: "default-wealth-forecast",
      type: WIDGET_TYPES.wealth_forecast,
      variant: "hero",
      position: { x: 0, y: 7 },
      size: WIDGET_SIZE_VARIANTS.hero,
    },
    {
      id: "default-action-center",
      type: WIDGET_TYPES.action_center,
      variant: "hero",
      position: { x: 0, y: 13 },
      size: WIDGET_SIZE_VARIANTS.hero,
    },
  ],
  version: 5,
};

export const DEFAULT_PRESET_NAME = "My Dashboard";
