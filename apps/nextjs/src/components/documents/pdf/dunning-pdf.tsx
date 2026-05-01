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
    padding: 60,
    fontSize: 11,
    fontFamily: "Helvetica",
    lineHeight: 1.6,
  },
  sender: {
    fontSize: 8,
    color: "#666",
    marginBottom: 30,
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    paddingBottom: 2,
  },
  recipient: {
    marginBottom: 40,
    fontSize: 11,
  },
  recipientLine: {
    marginBottom: 1,
  },
  dateLine: {
    textAlign: "right",
    marginBottom: 20,
    fontSize: 11,
  },
  subject: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 20,
  },
  body: {
    marginBottom: 12,
    fontSize: 11,
  },
  detailsBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  detailLabel: {
    color: "#666",
    width: "50%",
  },
  detailValue: {
    fontFamily: "Helvetica-Bold",
    width: "50%",
    textAlign: "right",
  },
  regards: {
    marginTop: 30,
    marginBottom: 40,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 60,
    right: 60,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
  },
});

type DunningLevel = "reminder" | "first" | "second" | "third";

interface DunningPdfData {
  level: DunningLevel;
  amount: number;
  dunningDate: string;
  tenant: {
    firstName: string;
    lastName: string;
  };
  property: {
    street: string | null;
    zipCode: string | null;
    city: string | null;
  };
  rentalUnit: {
    name: string;
  } | null;
  senderName: string;
  senderAddress: string;
}

interface DunningPdfLabels {
  subject: string;
  dear: string;
  bodyReminder: string;
  bodyFirst: string;
  bodySecond: string;
  bodyThird: string;
  amount: string;
  dueDate: string;
  paymentDeadline: string;
  regards: string;
  page: string;
}

const LEVEL_SUBJECTS: Record<DunningLevel, string> = {
  reminder: "Zahlungserinnerung",
  first: "1. Mahnung",
  second: "2. Mahnung",
  third: "3. und letzte Mahnung",
};

function getBodyText(level: DunningLevel, labels: DunningPdfLabels): string {
  const bodyMap: Record<DunningLevel, string> = {
    reminder: labels.bodyReminder,
    first: labels.bodyFirst,
    second: labels.bodySecond,
    third: labels.bodyThird,
  };
  return bodyMap[level];
}

function getDeadlineDays(level: DunningLevel): number {
  const deadlines: Record<DunningLevel, number> = {
    reminder: 14,
    first: 10,
    second: 7,
    third: 7,
  };
  return deadlines[level];
}

function DunningPdfDocument({
  data,
  labels,
  currency,
  locale,
}: {
  data: DunningPdfData;
  labels: DunningPdfLabels;
  currency: string;
  locale: string;
}) {
  const formatCurrency = (v: number) => formatCurrencyRaw(v, currency, locale);
  const deadlineDays = getDeadlineDays(data.level);
  const deadlineDate = new Date(data.dunningDate);
  deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

  const propertyAddress = [
    data.property.street,
    `${data.property.zipCode ?? ""} ${data.property.city ?? ""}`,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Sender line */}
        <Text style={styles.sender}>
          {data.senderName} - {data.senderAddress}
        </Text>

        {/* Recipient */}
        <View style={styles.recipient}>
          <Text style={styles.recipientLine}>
            {data.tenant.firstName} {data.tenant.lastName}
          </Text>
          {data.property.street && (
            <Text style={styles.recipientLine}>{data.property.street}</Text>
          )}
          {(data.property.zipCode || data.property.city) && (
            <Text style={styles.recipientLine}>
              {data.property.zipCode} {data.property.city}
            </Text>
          )}
        </View>

        {/* Date */}
        <Text style={styles.dateLine}>
          {formatDate(new Date(data.dunningDate))}
        </Text>

        {/* Subject */}
        <Text style={styles.subject}>
          {labels.subject}: {LEVEL_SUBJECTS[data.level]}
        </Text>

        {/* Salutation + body */}
        <Text style={styles.body}>
          {labels.dear} {data.tenant.firstName} {data.tenant.lastName},
        </Text>
        <Text style={styles.body}>{getBodyText(data.level, labels)}</Text>

        {/* Details box */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{labels.amount}</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(data.amount)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{labels.dueDate}</Text>
            <Text style={styles.detailValue}>
              {formatDate(new Date(data.dunningDate))}
            </Text>
          </View>
          {data.rentalUnit && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mieteinheit</Text>
              <Text style={styles.detailValue}>{data.rentalUnit.name}</Text>
            </View>
          )}
          {propertyAddress && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Objekt</Text>
              <Text style={styles.detailValue}>{propertyAddress}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{labels.paymentDeadline}</Text>
            <Text style={styles.detailValue}>{formatDate(deadlineDate)}</Text>
          </View>
        </View>

        {/* Closing */}
        <View style={styles.regards}>
          <Text>{labels.regards}</Text>
          <Text style={{ marginTop: 20 }}>{data.senderName}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {data.senderName} - {data.senderAddress}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateDunningPdf(
  data: DunningPdfData,
  labels: DunningPdfLabels,
  currency = "EUR",
  locale = "de-DE",
): Promise<void> {
  const blob = await pdf(
    <DunningPdfDocument
      data={data}
      labels={labels}
      currency={currency}
      locale={locale}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mahnung-${data.level}-${data.tenant.lastName}-${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface DunningSnapshotPdfData {
  subject: string;
  body: string;
  amount: number;
  feeAmount: number;
  totalAmount: number;
  dunningDate: string;
  paymentDeadline: string | null;
  tenant: {
    firstName: string;
    lastName: string;
  };
  property: {
    street: string | null;
    zipCode: string | null;
    city: string | null;
  };
  rentalUnit: {
    name: string;
  } | null;
  senderName: string;
  senderAddress: string;
}

function DunningSnapshotPdfDocument({
  data,
  currency,
  locale,
}: {
  data: DunningSnapshotPdfData;
  currency: string;
  locale: string;
}) {
  const formatCurrency = (value: number) =>
    formatCurrencyRaw(value, currency, locale);
  const bodyLines = data.body.split("\n");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.sender}>
          {data.senderName} - {data.senderAddress}
        </Text>

        <View style={styles.recipient}>
          <Text style={styles.recipientLine}>
            {data.tenant.firstName} {data.tenant.lastName}
          </Text>
          {data.property.street && (
            <Text style={styles.recipientLine}>{data.property.street}</Text>
          )}
          {(data.property.zipCode || data.property.city) && (
            <Text style={styles.recipientLine}>
              {data.property.zipCode} {data.property.city}
            </Text>
          )}
        </View>

        <Text style={styles.dateLine}>
          {formatDate(new Date(data.dunningDate))}
        </Text>
        <Text style={styles.subject}>{data.subject}</Text>

        {bodyLines.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.body}>
            {line || " "}
          </Text>
        ))}

        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Betrag</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(data.amount)}
            </Text>
          </View>
          {data.feeAmount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gebuehr</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(data.feeAmount)}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gesamtbetrag</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(data.totalAmount)}
            </Text>
          </View>
          {data.paymentDeadline && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Zahlungsfrist</Text>
              <Text style={styles.detailValue}>
                {formatDate(new Date(data.paymentDeadline))}
              </Text>
            </View>
          )}
          {data.rentalUnit && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mieteinheit</Text>
              <Text style={styles.detailValue}>{data.rentalUnit.name}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          {data.senderName} - {data.senderAddress}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateDunningSnapshotPdfBlob(
  data: DunningSnapshotPdfData,
  currency = "EUR",
  locale = "de-DE",
): Promise<Blob> {
  return pdf(
    <DunningSnapshotPdfDocument
      data={data}
      currency={currency}
      locale={locale}
    />,
  ).toBlob();
}

export async function downloadDunningSnapshotPdf(
  data: DunningSnapshotPdfData,
  currency = "EUR",
  locale = "de-DE",
): Promise<void> {
  const blob = await generateDunningSnapshotPdfBlob(data, currency, locale);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mahnung-${data.tenant.lastName}-${Date.now()}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
