"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  formatCurrency as formatCurrencyRaw,
  formatPercentage,
  formatDate,
} from "@repo/shared/utils";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  label: {
    color: "#666",
    width: "60%",
  },
  value: {
    fontFamily: "Helvetica-Bold",
    width: "40%",
    textAlign: "right",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

interface AnalysisReportData {
  healthScore: number;
  cashflowScore: number;
  ltvScore: number;
  yieldScore: number;
  stressTest: {
    scenarioRate: number;
    currentCashflow: number;
    scenarioCashflow: number;
    dscr: number;
    breakEvenRate: number | null;
  } | null;
  refinancing: {
    newRate: number;
    totalSavings: number;
    loanCount: number;
    worthItCount: number;
  } | null;
  specialRepayment: {
    totalInterestSaved: number;
    totalMonthsSaved: number;
    winner: string;
  } | null;
  exitStrategy: {
    saleYear: number;
    appreciationRate: number;
    propertyCount: number;
    totalNetProceeds: number;
  } | null;
}

interface AnalysisReportPdfProps {
  data: AnalysisReportData;
  currency: string;
  locale: string;
  labels: {
    analysisReport: string;
    generatedAt: string;
    page: string;
  };
}

function AnalysisPdfDocument({
  data,
  currency,
  locale,
  labels,
}: AnalysisReportPdfProps) {
  const now = formatDate(new Date());
  const formatCurrency = (v: number) => formatCurrencyRaw(v, currency, locale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{labels.analysisReport}</Text>
          <Text style={styles.subtitle}>
            {labels.generatedAt}: {now}
          </Text>
        </View>

        {/* Portfolio vitality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Vitality</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Health Score</Text>
              <Text style={styles.kpiValue}>{data.healthScore}/100</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Cashflow</Text>
              <Text style={styles.kpiValue}>{data.cashflowScore}/100</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>LTV</Text>
              <Text style={styles.kpiValue}>{data.ltvScore}/100</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Rendite</Text>
              <Text style={styles.kpiValue}>{data.yieldScore}/100</Text>
            </View>
          </View>
        </View>

        {/* Stress Test */}
        {data.stressTest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stress Test</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Szenario-Zinssatz</Text>
              <Text style={styles.value}>
                {formatPercentage(data.stressTest.scenarioRate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Aktueller Cashflow</Text>
              <Text style={styles.value}>
                {formatCurrency(data.stressTest.currentCashflow)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Szenario Cashflow</Text>
              <Text style={styles.value}>
                {formatCurrency(data.stressTest.scenarioCashflow)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>DSCR</Text>
              <Text style={styles.value}>
                {(data.stressTest.dscr / 100).toFixed(2)}
              </Text>
            </View>
            {data.stressTest.breakEvenRate !== null && (
              <View style={styles.row}>
                <Text style={styles.label}>Break-Even Zinssatz</Text>
                <Text style={styles.value}>
                  {formatPercentage(data.stressTest.breakEvenRate)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Refinancing */}
        {data.refinancing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Refinanzierung</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Neuer Zinssatz</Text>
              <Text style={styles.value}>
                {formatPercentage(data.refinancing.newRate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Gesamtersparnis</Text>
              <Text style={styles.value}>
                {formatCurrency(data.refinancing.totalSavings)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Kredite analysiert</Text>
              <Text style={styles.value}>{data.refinancing.loanCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Lohnenswert</Text>
              <Text style={styles.value}>{data.refinancing.worthItCount}</Text>
            </View>
          </View>
        )}

        {/* Special Repayment */}
        {data.specialRepayment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sondertilgung</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Zinsersparnis</Text>
              <Text style={styles.value}>
                {formatCurrency(data.specialRepayment.totalInterestSaved)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Monate gespart</Text>
              <Text style={styles.value}>
                {data.specialRepayment.totalMonthsSaved}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Empfehlung</Text>
              <Text style={styles.value}>{data.specialRepayment.winner}</Text>
            </View>
          </View>
        )}

        {/* Exit Strategy */}
        {data.exitStrategy && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exit-Strategie</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Verkaufsjahr</Text>
              <Text style={styles.value}>{data.exitStrategy.saleYear}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Wertsteigerung p.a.</Text>
              <Text style={styles.value}>
                {formatPercentage(data.exitStrategy.appreciationRate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Objekte</Text>
              <Text style={styles.value}>
                {data.exitStrategy.propertyCount}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Netto-Erloes gesamt</Text>
              <Text style={styles.value}>
                {formatCurrency(data.exitStrategy.totalNetProceeds)}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            {labels.generatedAt}: {now}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${labels.page} ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generateAnalysisReportPdf(
  data: AnalysisReportData,
  labels: AnalysisReportPdfProps["labels"],
  currency = "EUR",
  locale = "de-DE",
): Promise<void> {
  const blob = await pdf(
    <AnalysisPdfDocument
      data={data}
      currency={currency}
      locale={locale}
      labels={labels}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analysis-report-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
