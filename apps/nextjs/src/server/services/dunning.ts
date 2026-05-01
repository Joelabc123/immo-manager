import {
  DUNNING_DOCUMENT_TYPES,
  DUNNING_LEVELS,
  type DunningDocumentType,
  type DunningLevel,
} from "@repo/shared/types";
import { formatCurrency, formatDate } from "@repo/shared/utils";

export interface DunningRenderContext {
  tenantName: string;
  propertyAddress: string;
  rentalUnitName: string | null;
  amount: number;
  feeAmount: number;
  totalAmount: number;
  dunningDate: string;
  paymentDeadline: string | null;
  level: DunningLevel | null;
  documentType: DunningDocumentType;
}

export interface DunningSnapshot {
  subject: string;
  body: string;
}

const LEVEL_LABELS: Record<DunningLevel, string> = {
  [DUNNING_LEVELS.reminder]: "Zahlungserinnerung",
  [DUNNING_LEVELS.first]: "1. Mahnung",
  [DUNNING_LEVELS.second]: "2. Mahnung",
  [DUNNING_LEVELS.third]: "3. Mahnung",
};

const DOCUMENT_TYPE_LABELS: Record<DunningDocumentType, string> = {
  [DUNNING_DOCUMENT_TYPES.rent]: "Mietforderung",
  [DUNNING_DOCUMENT_TYPES.utilities]: "Nebenkostenforderung",
  [DUNNING_DOCUMENT_TYPES.deposit]: "Kautionsforderung",
  [DUNNING_DOCUMENT_TYPES.late_payment_warning]:
    "Abmahnung wegen Zahlungsverzug",
  [DUNNING_DOCUMENT_TYPES.termination_warning]:
    "Hinweis auf moegliche Kuendigung wegen Zahlungsverzug",
};

function replacePlaceholders(template: string, context: DunningRenderContext) {
  const values: Record<string, string> = {
    tenantName: context.tenantName,
    propertyAddress: context.propertyAddress,
    rentalUnitName: context.rentalUnitName ?? "",
    amount: formatCurrency(context.amount),
    feeAmount: formatCurrency(context.feeAmount),
    totalAmount: formatCurrency(context.totalAmount),
    dunningDate: formatDate(context.dunningDate),
    paymentDeadline: context.paymentDeadline
      ? formatDate(context.paymentDeadline)
      : "",
    level: context.level ? LEVEL_LABELS[context.level] : "",
    documentType: DOCUMENT_TYPE_LABELS[context.documentType],
  };

  return template.replace(/{{(\w+)}}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}

function getDefaultTemplate(context: DunningRenderContext): DunningSnapshot {
  if (context.documentType === DUNNING_DOCUMENT_TYPES.late_payment_warning) {
    return {
      subject: "Abmahnung wegen wiederholt verspaeteter Mietzahlung",
      body: "Sehr geehrte/r {{tenantName}},\n\nbei der oben genannten Mietsache kam es wiederholt zu verspaeteten Mietzahlungen. Bitte stellen Sie sicher, dass kuenftige Zahlungen fristgerecht eingehen.\n\nDiese Abmahnung dient der Dokumentation des Zahlungsverhaltens und soll eine weitere Eskalation vermeiden.",
    };
  }

  if (context.documentType === DUNNING_DOCUMENT_TYPES.termination_warning) {
    return {
      subject: "Wichtiger Hinweis wegen Zahlungsverzug",
      body: "Sehr geehrte/r {{tenantName}},\n\naufgrund des bestehenden Zahlungsverzugs in Hoehe von {{totalAmount}} ist eine rechtliche Pruefung erforderlich. Bitte begleichen Sie den offenen Betrag bis zum {{paymentDeadline}}.\n\nDieser Vorgang sollte vor weiteren Schritten anwaltlich geprueft werden.",
    };
  }

  const level = context.level ?? DUNNING_LEVELS.reminder;
  const subject = `${LEVEL_LABELS[level]} - ${DOCUMENT_TYPE_LABELS[context.documentType]}`;

  return {
    subject,
    body: "Sehr geehrte/r {{tenantName}},\n\nzu {{documentType}} fuer {{propertyAddress}} ist aktuell ein Betrag in Hoehe von {{amount}} offen. Bitte begleichen Sie den Gesamtbetrag von {{totalAmount}} bis zum {{paymentDeadline}}.\n\nSollte sich Ihre Zahlung mit diesem Schreiben ueberschnitten haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.",
  };
}

export function buildDunningSnapshot(
  context: DunningRenderContext,
  template?: { subjectTemplate: string; bodyTemplate: string } | null,
): DunningSnapshot {
  if (template) {
    return {
      subject: replacePlaceholders(template.subjectTemplate, context),
      body: replacePlaceholders(template.bodyTemplate, context),
    };
  }

  const raw = getDefaultTemplate(context);

  return {
    subject: replacePlaceholders(raw.subject, context),
    body: replacePlaceholders(raw.body, context),
  };
}
