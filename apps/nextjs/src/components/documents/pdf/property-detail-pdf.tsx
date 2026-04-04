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
    width: "50%",
  },
  value: {
    fontFamily: "Helvetica-Bold",
    width: "50%",
    textAlign: "right",
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
  tableCol: {
    width: "25%",
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
  generatedAt: {
    fontSize: 8,
    color: "#999",
  },
});

interface PropertyPdfData {
  address: string;
  type: string;
  status: string;
  livingAreaSqm: number;
  landAreaSqm: number | null;
  constructionYear: number | null;
  roomCount: number | null;
  purchasePrice: number;
  purchaseDate: string;
  marketValue: number | null;
  unitCount: number;
  notes: string | null;
  loans: Array<{
    bank: string;
    loanAmount: number;
    remainingBalance: number;
    interestRate: number;
    monthlyPayment: number;
  }>;
  units: Array<{
    name: string;
    coldRent: number | null;
    tenantName: string | null;
  }>;
  expenses: {
    apportionable: { total: number; count: number };
    nonApportionable: { total: number; count: number };
  };
  monthlyCashflow: number | null;
}

interface PropertyDetailPdfProps {
  data: PropertyPdfData;
  currency: string;
  locale: string;
  labels: {
    propertyReport: string;
    propertyDetails: string;
    financialOverview: string;
    rentalUnits: string;
    loansOverview: string;
    expensesOverview: string;
    cashflowOverview: string;
    generatedAt: string;
    page: string;
  };
  propertyLabels: {
    type: string;
    status: string;
    livingArea: string;
    landArea: string;
    constructionYear: string;
    roomCount: string;
    purchasePrice: string;
    purchaseDate: string;
    marketValue: string;
    unitCount: string;
  };
}

function PropertyPdfDocument({
  data,
  currency,
  locale,
  labels,
  propertyLabels,
}: PropertyDetailPdfProps) {
  const now = formatDate(new Date());
  const formatCurrency = (v: number) => formatCurrencyRaw(v, currency, locale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{labels.propertyReport}</Text>
          <Text style={styles.subtitle}>{data.address}</Text>
        </View>

        {/* Property details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.propertyDetails}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{propertyLabels.type}</Text>
            <Text style={styles.value}>{data.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{propertyLabels.status}</Text>
            <Text style={styles.value}>{data.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{propertyLabels.livingArea}</Text>
            <Text style={styles.value}>{data.livingAreaSqm} m²</Text>
          </View>
          {data.landAreaSqm && (
            <View style={styles.row}>
              <Text style={styles.label}>{propertyLabels.landArea}</Text>
              <Text style={styles.value}>{data.landAreaSqm} m²</Text>
            </View>
          )}
          {data.constructionYear && (
            <View style={styles.row}>
              <Text style={styles.label}>
                {propertyLabels.constructionYear}
              </Text>
              <Text style={styles.value}>{data.constructionYear}</Text>
            </View>
          )}
          {data.roomCount && (
            <View style={styles.row}>
              <Text style={styles.label}>{propertyLabels.roomCount}</Text>
              <Text style={styles.value}>{data.roomCount}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>{propertyLabels.unitCount}</Text>
            <Text style={styles.value}>{data.unitCount}</Text>
          </View>
        </View>

        {/* Financial overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.financialOverview}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{propertyLabels.purchasePrice}</Text>
            <Text style={styles.value}>
              {formatCurrency(data.purchasePrice)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{propertyLabels.purchaseDate}</Text>
            <Text style={styles.value}>{formatDate(data.purchaseDate)}</Text>
          </View>
          {data.marketValue && (
            <View style={styles.row}>
              <Text style={styles.label}>{propertyLabels.marketValue}</Text>
              <Text style={styles.value}>
                {formatCurrency(data.marketValue)}
              </Text>
            </View>
          )}
          {data.monthlyCashflow !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>{labels.cashflowOverview}</Text>
              <Text style={styles.value}>
                {formatCurrency(data.monthlyCashflow)} / Monat
              </Text>
            </View>
          )}
        </View>

        {/* Loans */}
        {data.loans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.loansOverview}</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol}>Bank</Text>
              <Text style={styles.tableCol}>Darlehen</Text>
              <Text style={styles.tableCol}>Restschuld</Text>
              <Text style={styles.tableCol}>Rate/Monat</Text>
            </View>
            {data.loans.map((loan, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCol}>{loan.bank}</Text>
                <Text style={styles.tableCol}>
                  {formatCurrency(loan.loanAmount)}
                </Text>
                <Text style={styles.tableCol}>
                  {formatCurrency(loan.remainingBalance)}
                </Text>
                <Text style={styles.tableCol}>
                  {formatCurrency(loan.monthlyPayment)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rental units */}
        {data.units.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{labels.rentalUnits}</Text>
            <View style={styles.tableHeader}>
              <Text style={{ width: "34%" }}>Einheit</Text>
              <Text style={{ width: "33%" }}>Mieter</Text>
              <Text style={{ width: "33%", textAlign: "right" }}>
                Kaltmiete
              </Text>
            </View>
            {data.units.map((unit, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={{ width: "34%" }}>{unit.name}</Text>
                <Text style={{ width: "33%" }}>
                  {unit.tenantName ?? "Leerstand"}
                </Text>
                <Text style={{ width: "33%", textAlign: "right" }}>
                  {unit.coldRent !== null ? formatCurrency(unit.coldRent) : "-"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Expenses summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.expensesOverview}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>
              Umlagefaehig ({data.expenses.apportionable.count})
            </Text>
            <Text style={styles.value}>
              {formatCurrency(data.expenses.apportionable.total)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>
              Nicht umlagefaehig ({data.expenses.nonApportionable.count})
            </Text>
            <Text style={styles.value}>
              {formatCurrency(data.expenses.nonApportionable.total)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notizen</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.generatedAt}>
            {labels.generatedAt}: {now}
          </Text>
          <Text
            style={styles.generatedAt}
            render={({ pageNumber, totalPages }) =>
              `${labels.page} ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePropertyPdf(
  data: PropertyPdfData,
  labels: PropertyDetailPdfProps["labels"],
  propertyLabels: PropertyDetailPdfProps["propertyLabels"],
  currency = "EUR",
  locale = "de-DE",
): Promise<void> {
  const blob = await pdf(
    <PropertyPdfDocument
      data={data}
      currency={currency}
      locale={locale}
      labels={labels}
      propertyLabels={propertyLabels}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `property-report-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
