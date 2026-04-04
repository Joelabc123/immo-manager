import { db } from "./index";
import {
  users,
  properties,
  loans,
  rentalUnits,
  tenants,
  tenantEmails,
  expenses,
  rentPayments,
} from "./schema";
import argon2 from "argon2";

async function seed() {
  console.log("Seeding database...");

  // 1. Create demo user
  const passwordHash = await argon2.hash("demo1234", {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const [demoUser] = await db
    .insert(users)
    .values({
      name: "Max Mustermann",
      email: "demo@immo-manager.de",
      passwordHash,
      language: "de",
      currency: "EUR",
      taxRate: 4200,
      retirementYear: 2055,
      healthScoreCashflowWeight: 34,
      healthScoreLtvWeight: 33,
      healthScoreYieldWeight: 33,
    })
    .returning({ id: users.id });

  const userId = demoUser.id;
  console.log(`Created demo user: ${userId}`);

  // 2. Create 4 German properties
  const propertyData = [
    {
      userId,
      type: "apartment",
      status: "rented",
      street: "Friedrichstrasse 42",
      city: "Berlin",
      zipCode: "10117",
      country: "DE",
      latitude: "52.5200",
      longitude: "13.4050",
      livingAreaSqm: 75,
      landAreaSqm: null,
      constructionYear: 1998,
      roomCount: 3,
      purchasePrice: 28000000,
      purchaseDate: "2021-03-15",
      marketValue: 32000000,
      unitCount: 1,
      notes: "Zentrale Lage, guter Zustand, Balkon nach Sueden.",
      propertyTaxAnnual: 45000,
    },
    {
      userId,
      type: "multi_family",
      status: "rented",
      street: "Schillerstrasse 8",
      city: "Munich",
      zipCode: "80336",
      country: "DE",
      latitude: "48.1351",
      longitude: "11.5820",
      livingAreaSqm: 320,
      landAreaSqm: 450,
      constructionYear: 1972,
      roomCount: 12,
      purchasePrice: 95000000,
      purchaseDate: "2019-08-01",
      marketValue: 115000000,
      unitCount: 4,
      notes: "4-Familienhaus, Dach 2015 saniert.",
      propertyTaxAnnual: 120000,
    },
    {
      userId,
      type: "single_family",
      status: "rented",
      street: "Am Waldrand 15",
      city: "Hamburg",
      zipCode: "22089",
      country: "DE",
      latitude: "53.5511",
      longitude: "10.0000",
      livingAreaSqm: 145,
      landAreaSqm: 600,
      constructionYear: 2005,
      roomCount: 5,
      purchasePrice: 42000000,
      purchaseDate: "2022-06-01",
      marketValue: 45000000,
      unitCount: 1,
      notes: "Ruhige Wohnlage, Garten, Garage.",
      propertyTaxAnnual: 68000,
    },
    {
      userId,
      type: "commercial",
      status: "rented",
      street: "Industriestrasse 22",
      city: "Frankfurt",
      zipCode: "60329",
      country: "DE",
      latitude: "50.1109",
      longitude: "8.6821",
      livingAreaSqm: 200,
      landAreaSqm: 300,
      constructionYear: 1990,
      roomCount: 6,
      purchasePrice: 55000000,
      purchaseDate: "2020-01-15",
      marketValue: 58000000,
      unitCount: 2,
      notes: "Bueroflaeche, 2 Einheiten, Aufzug vorhanden.",
      propertyTaxAnnual: 95000,
    },
  ];

  const insertedProperties = await db
    .insert(properties)
    .values(propertyData)
    .returning({ id: properties.id });

  const propIds = insertedProperties.map((p) => p.id);
  console.log(`Created ${propIds.length} properties`);

  // 3. Loans
  const loanData = [
    {
      propertyId: propIds[0],
      bankName: "Deutsche Bank",
      loanAmount: 22400000,
      remainingBalance: 19800000,
      interestRate: 185,
      repaymentRate: 200,
      monthlyPayment: 71867,
      interestFixedUntil: "2031-03-15",
      loanStart: "2021-03-15",
      loanTermMonths: 300,
      annualSpecialRepaymentLimit: 500000,
    },
    {
      propertyId: propIds[1],
      bankName: "Commerzbank",
      loanAmount: 66500000,
      remainingBalance: 55200000,
      interestRate: 145,
      repaymentRate: 250,
      monthlyPayment: 219271,
      interestFixedUntil: "2029-08-01",
      loanStart: "2019-08-01",
      loanTermMonths: 360,
      annualSpecialRepaymentLimit: 1000000,
    },
    {
      propertyId: propIds[2],
      bankName: "ING-DiBa",
      loanAmount: 33600000,
      remainingBalance: 31000000,
      interestRate: 295,
      repaymentRate: 200,
      monthlyPayment: 138600,
      interestFixedUntil: "2032-06-01",
      loanStart: "2022-06-01",
      loanTermMonths: 300,
      annualSpecialRepaymentLimit: 500000,
    },
    {
      propertyId: propIds[3],
      bankName: "KfW",
      loanAmount: 38500000,
      remainingBalance: 33000000,
      interestRate: 175,
      repaymentRate: 200,
      monthlyPayment: 120312,
      interestFixedUntil: "2030-01-15",
      loanStart: "2020-01-15",
      loanTermMonths: 300,
      annualSpecialRepaymentLimit: 750000,
    },
  ];

  await db.insert(loans).values(loanData);
  console.log(`Created ${loanData.length} loans`);

  // 4. Rental units
  const unitData = [
    { propertyId: propIds[0], name: "Wohnung EG", floor: "EG", areaSqm: 75 },
    {
      propertyId: propIds[1],
      name: "Wohnung EG links",
      floor: "EG",
      areaSqm: 80,
    },
    {
      propertyId: propIds[1],
      name: "Wohnung EG rechts",
      floor: "EG",
      areaSqm: 80,
    },
    {
      propertyId: propIds[1],
      name: "Wohnung OG links",
      floor: "1. OG",
      areaSqm: 80,
    },
    {
      propertyId: propIds[1],
      name: "Wohnung OG rechts",
      floor: "1. OG",
      areaSqm: 80,
    },
    {
      propertyId: propIds[2],
      name: "Einfamilienhaus",
      floor: "EG+OG",
      areaSqm: 145,
    },
    { propertyId: propIds[3], name: "Buero A", floor: "EG", areaSqm: 100 },
    { propertyId: propIds[3], name: "Buero B", floor: "1. OG", areaSqm: 100 },
  ];

  const insertedUnits = await db
    .insert(rentalUnits)
    .values(unitData)
    .returning({ id: rentalUnits.id });

  const unitIds = insertedUnits.map((u) => u.id);
  console.log(`Created ${unitIds.length} rental units`);

  // 5. Tenants (one per occupied unit)
  const tenantData = [
    {
      userId,
      rentalUnitId: unitIds[0],
      firstName: "Anna",
      lastName: "Schmidt",
      phone: "+49 30 12345678",
      gender: "female",
      depositPaid: true,
      rentStart: "2021-05-01",
      coldRent: 85000,
      warmRent: 105000,
      noticePeriodMonths: 3,
      rentType: "fixed",
    },
    {
      userId,
      rentalUnitId: unitIds[1],
      firstName: "Thomas",
      lastName: "Mueller",
      phone: "+49 89 98765432",
      gender: "male",
      depositPaid: true,
      rentStart: "2020-01-01",
      coldRent: 95000,
      warmRent: 120000,
      noticePeriodMonths: 3,
      rentType: "indexed",
    },
    {
      userId,
      rentalUnitId: unitIds[2],
      firstName: "Lisa",
      lastName: "Weber",
      phone: "+49 89 55544433",
      gender: "female",
      depositPaid: true,
      rentStart: "2020-06-01",
      coldRent: 90000,
      warmRent: 115000,
      noticePeriodMonths: 3,
      rentType: "fixed",
    },
    {
      userId,
      rentalUnitId: unitIds[3],
      firstName: "Michael",
      lastName: "Braun",
      phone: "+49 89 11122233",
      gender: "male",
      depositPaid: true,
      rentStart: "2021-03-01",
      coldRent: 92000,
      warmRent: 118000,
      noticePeriodMonths: 3,
      rentType: "graduated",
    },
    {
      userId,
      rentalUnitId: unitIds[5],
      firstName: "Claudia",
      lastName: "Hoffmann",
      phone: "+49 40 77788899",
      gender: "female",
      depositPaid: true,
      rentStart: "2022-08-01",
      coldRent: 150000,
      warmRent: 185000,
      noticePeriodMonths: 3,
      rentType: "fixed",
    },
    {
      userId,
      rentalUnitId: unitIds[6],
      firstName: "Firma",
      lastName: "TechStart GmbH",
      phone: "+49 69 44455566",
      gender: "other",
      depositPaid: true,
      rentStart: "2020-04-01",
      coldRent: 180000,
      warmRent: 210000,
      noticePeriodMonths: 6,
      rentType: "indexed",
    },
    {
      userId,
      rentalUnitId: unitIds[7],
      firstName: "Firma",
      lastName: "Design Studio KG",
      phone: "+49 69 99988877",
      gender: "other",
      depositPaid: true,
      rentStart: "2021-01-01",
      coldRent: 160000,
      warmRent: 190000,
      noticePeriodMonths: 6,
      rentType: "fixed",
    },
  ];

  const insertedTenants = await db
    .insert(tenants)
    .values(tenantData)
    .returning({ id: tenants.id });

  const tenantIds = insertedTenants.map((t) => t.id);
  console.log(`Created ${tenantIds.length} tenants`);

  // 6. Tenant emails
  const emailData = tenantIds.map((id, i) => ({
    tenantId: id,
    email: [
      "anna.schmidt@example.de",
      "t.mueller@example.de",
      "lisa.weber@example.de",
      "m.braun@example.de",
      "c.hoffmann@example.de",
      "info@techstart.example.de",
      "hello@designstudio.example.de",
    ][i],
    isPrimary: true,
  }));

  await db.insert(tenantEmails).values(emailData);
  console.log(`Created ${emailData.length} tenant emails`);

  // 7. Expenses (sample recurring)
  const expenseData = [
    {
      propertyId: propIds[0],
      category: "insurance",
      description: "Gebaeudeversicherung",
      amount: 45000,
      date: "2025-01-01",
      isRecurring: true,
      recurringInterval: "yearly",
      isApportionable: true,
    },
    {
      propertyId: propIds[1],
      category: "heating",
      description: "Gas-Heizung",
      amount: 35000,
      date: "2025-01-01",
      isRecurring: true,
      recurringInterval: "monthly",
      isApportionable: true,
    },
    {
      propertyId: propIds[1],
      category: "janitor",
      description: "Hausmeisterservice",
      amount: 25000,
      date: "2025-01-01",
      isRecurring: true,
      recurringInterval: "monthly",
      isApportionable: true,
    },
    {
      propertyId: propIds[2],
      category: "insurance",
      description: "Wohngebaeudeversicherung",
      amount: 65000,
      date: "2025-01-01",
      isRecurring: true,
      recurringInterval: "yearly",
      isApportionable: false,
    },
    {
      propertyId: propIds[3],
      category: "electricity",
      description: "Allgemeinstrom",
      amount: 18000,
      date: "2025-01-01",
      isRecurring: true,
      recurringInterval: "monthly",
      isApportionable: true,
    },
  ];

  await db.insert(expenses).values(expenseData);
  console.log(`Created ${expenseData.length} expenses`);

  // 8. Rent payments (last 3 months for all tenants)
  const now = new Date();
  const paymentData: {
    tenantId: string;
    rentalUnitId: string;
    expectedAmount: number;
    paidAmount: number | null;
    dueDate: string;
    paidDate: string | null;
    status: string;
  }[] = [];

  tenantData.forEach((t, i) => {
    const tenantId = tenantIds[i];
    const rentalUnitId = t.rentalUnitId;
    for (let m = 2; m >= 0; m--) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const isPaid = m > 0; // current month pending
      paymentData.push({
        tenantId,
        rentalUnitId,
        expectedAmount: t.warmRent,
        paidAmount: isPaid ? t.warmRent : null,
        dueDate: dueDate.toISOString().split("T")[0],
        paidDate: isPaid
          ? new Date(dueDate.getFullYear(), dueDate.getMonth(), 3)
              .toISOString()
              .split("T")[0]
          : null,
        status: isPaid ? "paid" : "pending",
      });
    }
  });

  await db.insert(rentPayments).values(paymentData);
  console.log(`Created ${paymentData.length} rent payments`);

  console.log("\nSeed complete!");
  console.log("Demo login: demo@immo-manager.de / demo1234");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
