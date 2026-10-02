import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanQr } from '../services/api';
import { ScanResult } from '../types';

export const MerchantVerifyRedirect: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyAndNavigate() {
      if (!token) {
        setError('No merchant verification token provided.');
        setLoading(false);
        return;
      }

      try {
        const fullUrl = window.location.href;
        // Run full IntentGuard & PaymentTruth pipeline on the token URL
        const result: ScanResult = await scanQr(fullUrl, 'PAY_MERCHANT');

        if (isMounted) {
          navigate('/result', {
            state: { scanResult: result },
            replace: true,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to verify merchant QR sticker.');
          setLoading(false);
        }
      }
    }

    verifyAndNavigate();

    return () => {
      isMounted = false;
    };
  }, [token, navigate]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-900 mb-6">
          <div className="font-semibold text-lg mb-2">QR Verification Error</div>
          <div className="text-sm font-mono">{error}</div>
        </div>
        <button
          onClick={() => navigate('/scan-qr')}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Open Scanner
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 border border-slate-200 mb-4 animate-pulse">
        <span className="font-mono text-xl text-slate-700 font-bold">PL</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">Verifying Merchant Sticker</h2>
      <p className="text-xs text-slate-500 font-mono mt-1 mb-6">
        Validating Ed25519 digital signature &amp; status...
      </p>

      <div className="bg-white border border-slate-200 rounded-lg p-4 text-left shadow-sm">
        <div className="flex items-center space-x-3 text-xs text-slate-600 font-mono">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Decoding signed token payload</span>
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-600 font-mono mt-3">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
          <span>Validating shop registration &amp; VPA</span>
        </div>
      </div>
    </div>
  );
};
