"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { WidgetType } from "@repo/shared/types";

interface WidgetComponentProps {
  config?: Record<string, unknown>;
}

const widgetComponents: Record<
  WidgetType,
  ComponentType<WidgetComponentProps>
> = {
  kpi_bar: dynamic(() =>
    import("./kpi-bar-widget").then((m) => ({ default: m.KpiBarWidget })),
  ),
  health_score: dynamic(() =>
    import("./health-score-widget").then((m) => ({
      default: m.HealthScoreWidget,
    })),
  ),
  wealth_forecast: dynamic(() =>
    import("./wealth-forecast-widget").then((m) => ({
      default: m.WealthForecastWidget,
    })),
  ),
  portfolio_allocation: dynamic(() =>
    import("./portfolio-allocation-widget").then((m) => ({
      default: m.PortfolioAllocationWidget,
    })),
  ),
  action_center: dynamic(() =>
    import("./action-center-widget").then((m) => ({
      default: m.ActionCenterWidget,
    })),
  ),
  rent_income_timeline: dynamic(() =>
    import("./rent-income-timeline-widget").then((m) => ({
      default: m.RentIncomeTimelineWidget,
    })),
  ),
  vacancy_rate: dynamic(() =>
    import("./vacancy-rate-widget").then((m) => ({
      default: m.VacancyRateWidget,
    })),
  ),
  upcoming_deadlines: dynamic(() =>
    import("./upcoming-deadlines-widget").then((m) => ({
      default: m.UpcomingDeadlinesWidget,
    })),
  ),
  rent_arrears: dynamic(() =>
    import("./rent-arrears-widget").then((m) => ({
      default: m.RentArrearsWidget,
    })),
  ),
  expenses_by_category: dynamic(() =>
    import("./expenses-by-category-widget").then((m) => ({
      default: m.ExpensesByCategoryWidget,
    })),
  ),
  ltv_overview: dynamic(() =>
    import("./ltv-overview-widget").then((m) => ({
      default: m.LtvOverviewWidget,
    })),
  ),
  market_comparison: dynamic(() =>
    import("./market-comparison-widget").then((m) => ({
      default: m.MarketComparisonWidget,
    })),
  ),
  amortization_progress: dynamic(() =>
    import("./amortization-progress-widget").then((m) => ({
      default: m.AmortizationProgressWidget,
    })),
  ),
  quick_actions: dynamic(() =>
    import("./quick-actions-widget").then((m) => ({
      default: m.QuickActionsWidget,
    })),
  ),
};

export function getWidgetComponent(
  type: WidgetType,
): ComponentType<WidgetComponentProps> {
  return widgetComponents[type];
}
