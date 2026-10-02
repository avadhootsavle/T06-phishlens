import { SignalSeverity } from '@prisma/client';
import { prisma } from '../db/client.js';
import { SignalInput } from '../engine/types.js';
import { ParsedUPI } from './upiParser.js';

export type PaymentIntentChoice = 'PAY_MERCHANT' | 'RECEIVE_MONEY' | 'NOT_SURE';

export interface PaymentTruthResult {
  actionDescription: string;
  intentMismatch: boolean;
  merchantMatchStatus: 'MATCH' | 'MISMATCH' | 'UNREGISTERED' | 'NOT_APPLICABLE';
  expectedMerchant?: string;
  signals: SignalInput[];
}

export async function analyzePaymentTruth(
  parsedUpi: ParsedUPI,
  expectedIntent?: PaymentIntentChoice,
  expectedMerchantName?: string
): Promise<PaymentTruthResult> {
  const signals: SignalInput[] = [];

  const recipientDisplay = parsedUpi.payeeName || parsedUpi.upiId || 'Unknown Recipient';
  const amountDisplay = parsedUpi.amount
    ? `₹${parsedUpi.amount}`
    : 'an unspecified amount (to be entered by you)';

  let actionDescription = `YOU ARE ABOUT TO PAY ${amountDisplay} to ${recipientDisplay} (${parsedUpi.upiId || 'UPI'}).`;

  // 1. Payment Intent Verification (Section 17)
  let intentMismatch = false;
  if (expectedIntent === 'RECEIVE_MONEY') {
    intentMismatch = true;
    signals.push({
      code: 'PAYMENT_INTENT_MISMATCH',
      severity: SignalSeverity.CRITICAL,
      scoreImpact: 70,
      message:
        'This QR starts a payment from you even though you expected to receive money / cashback.',
      metadata: {
        expectedIntent,
        actualAction: 'DEBIT / PAY',
        payee: recipientDisplay,
        amount: parsedUpi.amount,
      },
    });
    actionDescription = `DANGER: This QR will DEBIT ${amountDisplay} FROM your account. It cannot be used to receive funds.`;
  }

  // 2. Merchant / Payee Mismatch Verification (Section 18 & 19)
  let merchantMatchStatus: 'MATCH' | 'MISMATCH' | 'UNREGISTERED' | 'NOT_APPLICABLE' =
    'NOT_APPLICABLE';

  if (parsedUpi.upiId || expectedMerchantName) {
    // Check if the UPI ID exists in our merchant registry
    const registeredIdent = parsedUpi.upiId
      ? await prisma.merchantPaymentIdentifier.findUnique({
          where: { value: parsedUpi.upiId },
          include: { merchant: true },
        })
      : null;

    if (expectedMerchantName && expectedMerchantName.trim() !== '') {
      const expNorm = expectedMerchantName.trim().toLowerCase();
      const actualPayeeNorm = (parsedUpi.payeeName || '').toLowerCase();
      const registeredNameNorm = (registeredIdent?.merchant.normalizedName || '').toLowerCase();

      const matchesActual =
        actualPayeeNorm.length > 0 &&
        (actualPayeeNorm.includes(expNorm) || expNorm.includes(actualPayeeNorm));

      const matchesRegistered =
        registeredIdent !== null &&
        registeredIdent.merchant.normalizedName.length > 0 &&
        (registeredIdent.merchant.normalizedName.includes(expNorm) ||
          expNorm.includes(registeredIdent.merchant.normalizedName));

      const matchesExpected = matchesActual || matchesRegistered;

      if (matchesExpected) {
        merchantMatchStatus = 'MATCH';
      } else {
        merchantMatchStatus = 'MISMATCH';
        signals.push({
          code: 'MERCHANT_PAYEE_MISMATCH',
          severity: SignalSeverity.MEDIUM,
          scoreImpact: 25,
          message: `The payment recipient '${recipientDisplay}' does not match the merchant name you provided ('${expectedMerchantName}').`,
          metadata: {
            expected: expectedMerchantName,
            actual: recipientDisplay,
            upiId: parsedUpi.upiId,
          },
        });
      }
    } else if (registeredIdent) {
      merchantMatchStatus = 'MATCH';
    } else {
      merchantMatchStatus = 'UNREGISTERED';
    }
  }

  return {
    actionDescription,
    intentMismatch,
    merchantMatchStatus,
    expectedMerchant: expectedMerchantName,
    signals,
  };
}
