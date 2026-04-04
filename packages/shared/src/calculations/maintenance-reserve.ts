/**
 * Calculates recommended monthly maintenance reserve per sqm
 * based on construction year using a simplified Peters'sche Formel.
 *
 * The Peters'sche Formel suggests annual maintenance costs of
 * approximately 1% of construction costs. As a simplified model:
 * - Buildings < 1950: ~1.50 EUR/sqm/month
 * - Buildings 1950-1979: ~1.20 EUR/sqm/month
 * - Buildings 1980-1999: ~0.90 EUR/sqm/month
 * - Buildings 2000-2014: ~0.70 EUR/sqm/month
 * - Buildings >= 2015: ~0.50 EUR/sqm/month
 *
 * @param constructionYear - Year the building was constructed
 * @param livingAreaSqm - Living area in sqm (stored as integer in DB)
 * @returns Recommended monthly reserve in cents
 */
export function calculateRecommendedReserve(
  constructionYear: number,
  livingAreaSqm: number,
): number {
  let ratePerSqmCents: number;

  if (constructionYear < 1950) {
    ratePerSqmCents = 150;
  } else if (constructionYear < 1980) {
    ratePerSqmCents = 120;
  } else if (constructionYear < 2000) {
    ratePerSqmCents = 90;
  } else if (constructionYear < 2015) {
    ratePerSqmCents = 70;
  } else {
    ratePerSqmCents = 50;
  }

  return Math.round(ratePerSqmCents * livingAreaSqm);
}

/**
 * Calculates the net reserve balance.
 *
 * @param monthlyContribution - Monthly reserve contribution in cents
 * @param months - Number of months of contributions
 * @param totalMaintenanceExpenses - Total maintenance expenses deducted in cents
 * @returns Net reserve balance in cents
 */
export function calculateReserveBalance(
  monthlyContribution: number,
  months: number,
  totalMaintenanceExpenses: number,
): number {
  return monthlyContribution * months - totalMaintenanceExpenses;
}
