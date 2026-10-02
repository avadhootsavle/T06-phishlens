import { SignalSeverity } from '@prisma/client';
import { prisma } from '../db/client.js';
import { SignalInput } from '../engine/types.js';
import { ParsedUPI } from './upiParser.js';

export type PaymentIntentChoice = 'PAY_MERCHANT' | 'RECEIVE_MONEY' | 'NOT_SURE';

export type MerchantVerificationStatus =
  | 'VERIFIED'
  | 'VERIFIED_REGISTRY'
  | 'TAMPERED'
  | 'MISMATCH'
  | 'EXPIRED'
  | 'REVOKED'
  | 'UNVERIFIED'
  | 'NOT_APPLICABLE';

export interface MerchantVerificationSummary {
  status: MerchantVerificationStatus;
  shopName?: string;
  vpa?: string;
  city?: string | null;
  expectedShopName?: string;
  registeredShopName?: string;
  message: string;
}

export interface PaymentTruthResult {
  actionDescription: string;
  intentMismatch: boolean;
  merchantMatchStatus: 'MATCH' | 'MISMATCH' | 'UNREGISTERED' | 'NOT_APPLICABLE';
  merchantVerification?: MerchantVerificationSummary;
  expectedMerchant?: string;
  signals: SignalInput[];
}

export async function analyzePaymentTruth(
  parsedUpi: ParsedUPI,
  expectedIntent?: PaymentIntentChoice,
  expectedMerchantName?: string,
  existingVerification?: MerchantVerificationSummary
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

  // 2. Cryptographic Token Verification or Registry Verification
  let merchantVerification: MerchantVerificationSummary =
    existingVerification || {
      status: 'NOT_APPLICABLE',
      message: 'No merchant verification available.',
    };

  let merchantMatchStatus: 'MATCH' | 'MISMATCH' | 'UNREGISTERED' | 'NOT_APPLICABLE' =
    'NOT_APPLICABLE';

  if (existingVerification) {
    merchantVerification = existingVerification;

    if (existingVerification.status === 'VERIFIED') {
      merchantMatchStatus = 'MATCH';
      signals.push({
        code: 'MERCHANT_VERIFIED',
        severity: SignalSeverity.INFO,
        scoreImpact: -20, // Lowers risk score by 20 points
        message: `Verified Merchant QR: Cryptographically confirmed for '${existingVerification.shopName}' (${existingVerification.vpa}).`,
        metadata: {
          shopName: existingVerification.shopName,
          vpa: existingVerification.vpa,
        },
      });
    } else if (existingVerification.status === 'TAMPERED') {
      merchantMatchStatus = 'MISMATCH';
      signals.push({
        code: 'MERCHANT_TAMPERED',
        severity: SignalSeverity.CRITICAL,
        scoreImpact: 70, // Triggers DANGER
        message:
          'This QR sticker claims to be a verified shop QR but its signature is fake. Someone may have pasted a fake sticker.',
        metadata: {
          shopName: existingVerification.shopName,
          vpa: existingVerification.vpa,
        },
      });
    } else if (existingVerification.status === 'REVOKED') {
      merchantMatchStatus = 'MISMATCH';
      signals.push({
        code: 'MERCHANT_REVOKED',
        severity: SignalSeverity.HIGH,
        scoreImpact: 40,
        message: 'This merchant registration has been revoked by administration.',
        metadata: {
          shopName: existingVerification.shopName,
          vpa: existingVerification.vpa,
        },
      });
    } else if (existingVerification.status === 'EXPIRED') {
      signals.push({
        code: 'MERCHANT_EXPIRED',
        severity: SignalSeverity.MEDIUM,
        scoreImpact: 25,
        message: 'This verified merchant QR sticker has expired.',
      });
    } else if (existingVerification.status === 'MISMATCH') {
      merchantMatchStatus = 'MISMATCH';
      signals.push({
        code: 'MERCHANT_PAYEE_MISMATCH',
        severity: SignalSeverity.MEDIUM,
        scoreImpact: 25,
        message: `The payment recipient '${existingVerification.registeredShopName}' does not match the merchant name you provided ('${existingVerification.expectedShopName}').`,
        metadata: {
          expected: existingVerification.expectedShopName,
          actual: existingVerification.registeredShopName,
          vpa: existingVerification.vpa,
        },
      });
    }
  } else if (parsedUpi.upiId) {
    // 3. Plain upi://pay string lookup in Merchant table
    const normalizedVpa = parsedUpi.upiId.toLowerCase().trim();

    const merchant = await prisma.merchant.findUnique({
      where: { vpa: normalizedVpa },
    });

    if (merchant && merchant.status === 'ACTIVE') {
      const regName = merchant.shopName || merchant.name || '';

      if (expectedMerchantName && expectedMerchantName.trim().length > 0) {
        const expNorm = expectedMerchantName.trim().toLowerCase();
        const regNorm = regName.toLowerCase();
        const actualNorm = (parsedUpi.payeeName || '').toLowerCase();

        const matches =
          regNorm.includes(expNorm) ||
          expNorm.includes(regNorm) ||
          actualNorm.includes(expNorm) ||
          expNorm.includes(actualNorm);

        if (matches) {
          merchantMatchStatus = 'MATCH';
          merchantVerification = {
            status: 'VERIFIED_REGISTRY',
            shopName: regName,
            vpa: merchant.vpa,
            city: merchant.city,
            message: `Registered Merchant: Destination registered to '${regName}'.`,
          };
          signals.push({
            code: 'MERCHANT_VERIFIED',
            severity: SignalSeverity.INFO,
            scoreImpact: -20,
            message: `Registered Merchant: Confirmed in registry as '${regName}' (${merchant.vpa}).`,
            metadata: { shopName: regName, vpa: merchant.vpa },
          });
        } else {
          merchantMatchStatus = 'MISMATCH';
          merchantVerification = {
            status: 'MISMATCH',
            shopName: regName,
            vpa: merchant.vpa,
            city: merchant.city,
            expectedShopName: expectedMerchantName,
            registeredShopName: regName,
            message: `QR recipient '${regName}' does not match expected shop '${expectedMerchantName}'.`,
          };
          signals.push({
            code: 'MERCHANT_PAYEE_MISMATCH',
            severity: SignalSeverity.MEDIUM,
            scoreImpact: 25,
            message: `The payment recipient '${regName}' does not match the merchant name you provided ('${expectedMerchantName}').`,
            metadata: {
              expected: expectedMerchantName,
              actual: regName,
              vpa: merchant.vpa,
            },
          });
        }
      } else {
        merchantMatchStatus = 'MATCH';
        merchantVerification = {
          status: 'VERIFIED_REGISTRY',
          shopName: regName,
          vpa: merchant.vpa,
          city: merchant.city,
          message: `Registered Merchant: Destination registered to '${regName}'.`,
        };
        signals.push({
          code: 'MERCHANT_VERIFIED',
          severity: SignalSeverity.INFO,
          scoreImpact: -20,
          message: `Registered Merchant: Confirmed in registry as '${regName}' (${merchant.vpa}).`,
          metadata: { shopName: regName, vpa: merchant.vpa },
        });
      }
    } else {
      merchantMatchStatus = 'UNREGISTERED';
      merchantVerification = {
        status: 'UNVERIFIED',
        shopName: parsedUpi.payeeName,
        vpa: parsedUpi.upiId,
        message: 'Not a registered merchant.',
      };

      if (expectedMerchantName && expectedMerchantName.trim().length > 0) {
        const expNorm = expectedMerchantName.trim().toLowerCase();
        const actualNorm = (parsedUpi.payeeName || '').toLowerCase();

        if (actualNorm.length > 0 && !actualNorm.includes(expNorm) && !expNorm.includes(actualNorm)) {
          merchantMatchStatus = 'MISMATCH';
          merchantVerification.status = 'MISMATCH';
          merchantVerification.expectedShopName = expectedMerchantName;
          merchantVerification.registeredShopName = parsedUpi.payeeName || parsedUpi.upiId;
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
      }
    }
  }

  return {
    actionDescription,
    intentMismatch,
    merchantMatchStatus,
    merchantVerification,
    expectedMerchant: expectedMerchantName,
    signals,
  };
}
