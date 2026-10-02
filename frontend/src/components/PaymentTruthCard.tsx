import React from 'react';
import { IndianRupee, AlertTriangle, CheckCircle2, UserCheck, ShieldAlert, ArrowDownLeft } from 'lucide-react';
import { PaymentTruthInfo } from '../types';

interface PaymentTruthCardProps {
  paymentTruth?: PaymentTruthInfo;
}

export const PaymentTruthCard: React.FC<PaymentTruthCardProps> = ({ paymentTruth }) => {
  if (!paymentTruth) return null;

  return (
    <div className={`p-5 rounded-2xl glass-card border transition-all ${
      paymentTruth.intentMismatch
        ? 'border-rose-500/50 bg-rose-950/20'
        : paymentTruth.merchantMatchStatus === 'MISMATCH'
        ? 'border-amber-500/50 bg-amber-950/15'
        : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-mono">
              PaymentTruth™ Transaction Semantics
            </h3>
            <p className="text-xs text-slate-400">Verifies transaction direction & payee legitimacy</p>
          </div>
        </div>

        {paymentTruth.intentMismatch ? (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            <span>PAYMENT REVERSAL SCAM</span>
          </span>
        ) : paymentTruth.merchantMatchStatus === 'MISMATCH' ? (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Payee Mismatch</span>
          </span>
        ) : paymentTruth.merchantMatchStatus === 'MATCH' ? (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified Merchant</span>
          </span>
        ) : null}
      </div>

      {/* Critical Action Banner */}
      <div className={`p-4 rounded-xl mb-4 font-mono text-sm border ${
        paymentTruth.intentMismatch
          ? 'bg-rose-900/30 border-rose-500/40 text-rose-200'
          : 'bg-slate-900/80 border-slate-800 text-slate-200'
      }`}>
        <div className="flex items-start space-x-2.5">
          <ArrowDownLeft className={`w-5 h-5 shrink-0 mt-0.5 ${paymentTruth.intentMismatch ? 'text-rose-400' : 'text-emerald-400'}`} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-0.5 font-sans font-semibold">
              Action Verdict
            </div>
            <div className="font-semibold leading-relaxed">
              {paymentTruth.actionDescription}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block mb-1">Payee Name</span>
          <span className="font-semibold text-slate-200 text-sm">
            {paymentTruth.payeeName || 'Not specified in QR'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block mb-1">UPI ID (VPA)</span>
          <span className="font-mono text-cyan-400 font-medium truncate block text-sm">
            {paymentTruth.upiId || 'N/A'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-slate-400 block mb-1">Transaction Amount</span>
          <span className="font-mono font-bold text-white text-sm">
            {paymentTruth.amount ? `₹${paymentTruth.amount}` : 'Amount not fixed'}
          </span>
        </div>
      </div>

      {paymentTruth.expectedMerchant && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Expected Merchant: <strong>{paymentTruth.expectedMerchant}</strong></span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
            paymentTruth.merchantMatchStatus === 'MATCH'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {paymentTruth.merchantMatchStatus}
          </span>
        </div>
      )}
    </div>
  );
};
