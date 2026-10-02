import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, ShieldCheck, ShieldAlert, Store } from 'lucide-react';
import { PaymentTruthInfo } from '../types';

interface PaymentTruthCardProps {
  paymentTruth?: PaymentTruthInfo;
}

export const PaymentTruthCard: React.FC<PaymentTruthCardProps> = ({ paymentTruth }) => {
  if (!paymentTruth) return null;

  const mv = paymentTruth.merchantVerification;
  const isTampered = mv?.status === 'TAMPERED';
  const isVerified = mv?.status === 'VERIFIED' || mv?.status === 'VERIFIED_REGISTRY';
  const isMismatch = mv?.status === 'MISMATCH' || paymentTruth.merchantMatchStatus === 'MISMATCH';
  const isRevoked = mv?.status === 'REVOKED';

  return (
    <div
      className={`p-5 rounded-xl border transition-colors ${
        paymentTruth.intentMismatch || isTampered
          ? 'bg-red-50 border-red-200 text-red-950'
          : isMismatch || isRevoked
          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
          : isVerified
          ? 'bg-emerald-50/40 border-emerald-200 text-slate-900 shadow-sm'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
            Payment Analysis &amp; Intent
          </h3>
          <p className="text-sm font-semibold text-slate-900">
            Direction &amp; Payee Identity
          </p>
        </div>

        {paymentTruth.intentMismatch ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            <span>Debit Reversal Alert</span>
          </span>
        ) : isTampered ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Fake Sticker Alert</span>
          </span>
        ) : isMismatch ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Payee Mismatch</span>
          </span>
        ) : isVerified ? (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Merchant</span>
          </span>
        ) : null}
      </div>

      {/* Primary Action Statement */}
      <div
        className={`p-3.5 rounded-lg border text-sm mb-4 leading-relaxed ${
          paymentTruth.intentMismatch || isTampered
            ? 'bg-white border-red-300 text-red-900 font-medium'
            : isMismatch
            ? 'bg-white border-amber-300 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        {paymentTruth.actionDescription}
      </div>

      {/* Specialized "Merchant Verification" Trust Section */}
      {mv && (
        <div className="mb-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Store className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                Merchant Verification
              </span>
            </div>

            {mv.status === 'VERIFIED' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Cryptographically Verified
              </span>
            )}
            {mv.status === 'VERIFIED_REGISTRY' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Registry Match
              </span>
            )}
            {mv.status === 'TAMPERED' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-100 text-red-800 border border-red-300">
                Counterfeit Signature
              </span>
            )}
            {mv.status === 'REVOKED' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
                Revoked Merchant
              </span>
            )}
            {mv.status === 'EXPIRED' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Expired Sticker
              </span>
            )}
            {mv.status === 'MISMATCH' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Payee Mismatch
              </span>
            )}
            {mv.status === 'UNVERIFIED' && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Unregistered
              </span>
            )}
          </div>

          {/* Tamper Warning Alert Callout */}
          {isTampered && (
            <div className="p-3 mb-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed font-semibold">
              {mv.message}
            </div>
          )}

          {/* Revoked Callout */}
          {isRevoked && (
            <div className="p-3 mb-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed">
              {mv.message}
            </div>
          )}

          {/* Verified Shop Details */}
          {(isVerified || mv.status === 'MISMATCH') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Verified Shop Name</span>
                <span className="font-bold text-slate-900 text-sm">{mv.shopName || mv.registeredShopName}</span>
                {mv.city && <span className="text-slate-500 block text-[11px]">{mv.city}</span>}
              </div>

              <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] uppercase font-mono">Verified UPI ID</span>
                <span className="font-mono font-semibold text-slate-900 text-sm truncate block">{mv.vpa}</span>
                <span className="text-emerald-700 text-[11px] font-medium block">Active in PhishLens Trust Layer</span>
              </div>
            </div>
          )}

          {mv.status === 'UNVERIFIED' && (
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Not a registered merchant. Always confirm the payee name directly with the shopkeeper before authorizing the transaction.
            </p>
          )}
        </div>
      )}

      {/* Structured Details */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">Recipient Name</span>
          <span className="font-semibold text-slate-900 text-sm">
            {paymentTruth.payeeName || 'Not specified in QR'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">UPI ID (VPA)</span>
          <span className="font-mono text-slate-800 truncate block text-sm">
            {paymentTruth.upiId || 'Not provided'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-white border border-slate-200">
          <span className="text-slate-500 block mb-1">Amount</span>
          <span className="font-mono font-bold text-slate-900 text-sm">
            {paymentTruth.amount ? `₹${paymentTruth.amount}` : 'Amount not fixed'}
          </span>
        </div>
      </div>

      {paymentTruth.expectedMerchant && (
        <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-700">
            <span>Expected shop name: </span>
            <strong className="text-slate-900">{paymentTruth.expectedMerchant}</strong>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
              paymentTruth.merchantMatchStatus === 'MATCH'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {paymentTruth.merchantMatchStatus}
          </span>
        </div>
      )}
    </div>
  );
};
