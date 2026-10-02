import { PrismaClient, PaymentIdType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PhishLens protected brands and demo merchants...');

  const brands = [
    {
      name: 'State Bank of India',
      normalizedName: 'sbi',
      category: 'Banking',
      keywords: ['sbi', 'state bank of india', 'onlinesbi', 'yono'],
      domains: ['sbi.co.in', 'onlinesbi.sbi', 'onlinesbi.com', 'sbicard.com'],
    },
    {
      name: 'HDFC Bank',
      normalizedName: 'hdfc',
      category: 'Banking',
      keywords: ['hdfc', 'hdfc bank', 'netbanking hdfc'],
      domains: ['hdfcbank.com', 'hdfc.com'],
    },
    {
      name: 'ICICI Bank',
      normalizedName: 'icici',
      category: 'Banking',
      keywords: ['icici', 'icici bank', 'imobile'],
      domains: ['icicibank.com'],
    },
    {
      name: 'Axis Bank',
      normalizedName: 'axis',
      category: 'Banking',
      keywords: ['axis', 'axis bank'],
      domains: ['axisbank.com'],
    },
    {
      name: 'Paytm',
      normalizedName: 'paytm',
      category: 'Payments',
      keywords: ['paytm', 'paytm payments bank', 'paytm wallet'],
      domains: ['paytm.com', 'paytmbank.com'],
    },
    {
      name: 'PhonePe',
      normalizedName: 'phonepe',
      category: 'Payments',
      keywords: ['phonepe', 'phone pe'],
      domains: ['phonepe.com'],
    },
    {
      name: 'Google Pay',
      normalizedName: 'google pay',
      category: 'Payments',
      keywords: ['google pay', 'gpay', 'tez'],
      domains: ['pay.google.com', 'google.com'],
    },
    {
      name: 'UIDAI',
      normalizedName: 'uidai',
      category: 'Government',
      keywords: ['uidai', 'aadhaar', 'myaadhaar'],
      domains: ['uidai.gov.in', 'myaadhaar.uidai.gov.in'],
    },
    {
      name: 'Income Tax Department',
      normalizedName: 'incometax',
      category: 'Government',
      keywords: ['income tax', 'incometax', 'itr refund', 'pan verification'],
      domains: ['incometax.gov.in', 'tin-nsdl.com'],
    },
    {
      name: 'IRCTC',
      normalizedName: 'irctc',
      category: 'Travel',
      keywords: ['irctc', 'indian railways ticket'],
      domains: ['irctc.co.in'],
    },
    {
      name: 'India Post',
      normalizedName: 'indiapost',
      category: 'Postal/Government',
      keywords: ['india post', 'indiapost', 'speed post tracking'],
      domains: ['indiapost.gov.in', 'ippbonline.com'],
    },
    {
      name: 'Amazon',
      normalizedName: 'amazon',
      category: 'E-Commerce',
      keywords: ['amazon', 'amazon prime', 'amazon pay', 'aws'],
      domains: ['amazon.com', 'amazon.in'],
    },
    {
      name: 'Flipkart',
      normalizedName: 'flipkart',
      category: 'E-Commerce',
      keywords: ['flipkart', 'supercoins'],
      domains: ['flipkart.com'],
    },
    {
      name: 'Netflix',
      normalizedName: 'netflix',
      category: 'Entertainment',
      keywords: ['netflix'],
      domains: ['netflix.com'],
    },
    {
      name: 'Apple',
      normalizedName: 'apple',
      category: 'Technology',
      keywords: ['apple', 'icloud', 'apple id'],
      domains: ['apple.com', 'icloud.com'],
    },
  ];

  for (const b of brands) {
    const brand = await prisma.brand.upsert({
      where: { normalizedName: b.normalizedName },
      update: {
        name: b.name,
        category: b.category,
        keywords: b.keywords,
      },
      create: {
        name: b.name,
        normalizedName: b.normalizedName,
        category: b.category,
        keywords: b.keywords,
      },
    });

    for (const domain of b.domains) {
      await prisma.brandDomain.upsert({
        where: { officialDomain: domain },
        update: { brandId: brand.id },
        create: {
          brandId: brand.id,
          officialDomain: domain,
        },
      });
    }
  }

  // Demo Merchants for PaymentTruth
  const merchants = [
    {
      name: 'ABC Medical',
      normalizedName: 'abc medical',
      category: 'Healthcare',
      verified: true,
      identifiers: [
        { type: PaymentIdType.UPI_ID, value: 'abcmedical@upi' },
        { type: PaymentIdType.UPI_ID, value: 'abcpharmacy@okhdfcbank' },
      ],
    },
    {
      name: 'Apollo Pharmacy',
      normalizedName: 'apollo pharmacy',
      category: 'Healthcare',
      verified: true,
      identifiers: [
        { type: PaymentIdType.UPI_ID, value: 'apollopharmacy@upi' },
        { type: PaymentIdType.UPI_ID, value: 'apollo.pay@icici' },
      ],
    },
    {
      name: 'Star Supermarket',
      normalizedName: 'star supermarket',
      category: 'Retail',
      verified: true,
      identifiers: [
        { type: PaymentIdType.UPI_ID, value: 'starsupermarket@upi' },
      ],
    },
    {
      name: 'Fresh Mart Grocery',
      normalizedName: 'fresh mart grocery',
      category: 'Grocery',
      verified: true,
      identifiers: [
        { type: PaymentIdType.UPI_ID, value: 'freshmart@upi' },
      ],
    },
  ];

  for (const m of merchants) {
    const merchant = await prisma.merchant.upsert({
      where: { vpa: m.identifiers[0].value },
      update: {
        shopName: m.name,
        name: m.name,
        normalizedName: m.normalizedName,
        verified: m.verified,
        category: m.category,
        city: 'Mumbai',
        status: 'ACTIVE',
      },
      create: {
        shopName: m.name,
        vpa: m.identifiers[0].value,
        name: m.name,
        normalizedName: m.normalizedName,
        verified: m.verified,
        category: m.category,
        city: 'Mumbai',
        status: 'ACTIVE',
      },
    });

    for (const ident of m.identifiers) {
      await prisma.merchantPaymentIdentifier.upsert({
        where: { value: ident.value },
        update: { merchantId: merchant.id, type: ident.type },
        create: {
          merchantId: merchant.id,
          type: ident.type,
          value: ident.value,
        },
      });
    }
  }

  // Seed sample scam campaign
  const campaign = await prisma.scamCampaign.upsert({
    where: { name: 'Operation Fake KYC India 2026' },
    update: {},
    create: {
      name: 'Operation Fake KYC India 2026',
      status: 'ACTIVE',
      notes: 'Coordinated campaign distributing SMS links mimicking SBI and Paytm net banking login forms with OTP harvesting traps.',
    },
  });

  // Seed community reports
  const sampleReports = [
    {
      category: 'PHISHING_WEBSITE' as const,
      note: 'Received SMS stating electricity bill unpaid, link went to fake Mahavitaran portal asking for credit card.',
      status: 'PENDING' as const,
    },
    {
      category: 'SUSPICIOUS_PAYMENT' as const,
      note: 'OLX buyer insisted on scanning a QR code with upi://pay claiming it would credit ₹15,000 to my account.',
      status: 'CONFIRMED' as const,
    },
    {
      category: 'INCORRECT_RECIPIENT' as const,
      note: 'Pasted QR sticker at grocery store resolved to random individual instead of the supermarket VPA.',
      status: 'PENDING' as const,
    },
  ];

  for (const rep of sampleReports) {
    const existing = await prisma.report.findFirst({ where: { note: rep.note } });
    if (!existing) {
      await prisma.report.create({
        data: rep,
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
