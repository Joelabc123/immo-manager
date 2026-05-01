import Holidays from "date-holidays";
import { differenceInCalendarMonths, parseISO } from "date-fns";
import type { GermanFederalState } from "../types/dunning";

export interface RentArrearTerm {
  dueDate: string;
  expectedAmount: number;
  paidAmount: number;
}

export interface TerminationWarningResult {
  shouldWarn: boolean;
  consecutiveTermsInArrears: number;
  totalArrears: number;
  thresholdAmount: number;
}

const FEDERAL_STATE_TO_HOLIDAY_SUBDIVISION: Record<GermanFederalState, string> =
  {
    BW: "bw",
    BY: "by",
    BE: "be",
    BB: "bb",
    HB: "hb",
    HH: "hh",
    HE: "he",
    MV: "mv",
    NI: "ni",
    NW: "nw",
    RP: "rp",
    SL: "sl",
    SN: "sn",
    ST: "st",
    SH: "sh",
    TH: "th",
  };

function toDateOnly(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getHolidayCalendar(federalState: GermanFederalState): Holidays {
  return new Holidays("DE", FEDERAL_STATE_TO_HOLIDAY_SUBDIVISION[federalState]);
}

export function isGermanBusinessDay(
  date: Date,
  federalState: GermanFederalState,
): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !getHolidayCalendar(federalState).isHoliday(date);
}

export function getThirdBusinessDayOfMonth(
  year: number,
  month: number,
  federalState: GermanFederalState,
): string {
  let businessDays = 0;
  const cursor = new Date(Date.UTC(year, month - 1, 1));

  while (cursor.getUTCMonth() === month - 1) {
    if (isGermanBusinessDay(cursor, federalState)) {
      businessDays += 1;
      if (businessDays === 3) return toDateOnly(cursor);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return toDateOnly(cursor);
}

export function calculateUtilityDueDate(
  invoiceDate: string,
  daysAfterInvoice = 30,
): string {
  const [year, month, day] = invoiceDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + daysAfterInvoice);
  return toDateOnly(date);
}

export function evaluateTerminationWarning(
  arrearTerms: RentArrearTerm[],
  monthlyColdRent: number,
): TerminationWarningResult {
  const sorted = [...arrearTerms].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );
  const totalArrears = sorted.reduce(
    (sum, term) => sum + Math.max(term.expectedAmount - term.paidAmount, 0),
    0,
  );

  let consecutiveTermsInArrears = 0;
  let currentStreak = 0;
  let previousDueDate: Date | null = null;

  for (const term of sorted) {
    const dueDate = parseISO(term.dueDate);
    const isInArrears = term.expectedAmount > term.paidAmount;
    const followsPreviousTerm =
      previousDueDate === null ||
      differenceInCalendarMonths(dueDate, previousDueDate) === 1;

    if (isInArrears && followsPreviousTerm) {
      currentStreak += 1;
    } else if (isInArrears) {
      currentStreak = 1;
    } else {
      currentStreak = 0;
    }

    consecutiveTermsInArrears = Math.max(
      consecutiveTermsInArrears,
      currentStreak,
    );
    previousDueDate = dueDate;
  }

  const thresholdAmount = monthlyColdRent * 2;

  return {
    shouldWarn:
      consecutiveTermsInArrears >= 2 || totalArrears >= thresholdAmount,
    consecutiveTermsInArrears,
    totalArrears,
    thresholdAmount,
  };
}

export function isLatePaymentPattern(
  overduePaymentDates: string[],
  thresholdCount: number,
  windowMonths: number,
  referenceDate = new Date(),
): boolean {
  const windowed = overduePaymentDates.filter((date) => {
    const months = differenceInCalendarMonths(referenceDate, parseISO(date));
    return months >= 0 && months < windowMonths;
  });

  return windowed.length >= thresholdCount;
}
