import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Camera, Upload, ArrowRight, ShieldAlert, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { scanQr } from '../services/api';
import { PaymentIntent } from '../types';

export const QRScanner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [intent, setIntent] = useState<PaymentIntent>('PAY_MERCHANT');
  const [expectedMerchant, setExpectedMerchant] = useState<string>('');
  const [manualPayload, setManualPayload] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Handle Demo Scenarios from query parameters
  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'reverse-payment') {
      setIntent('RECEIVE_MONEY');
      setManualPayload('upi://pay?pa=rahul@upi&pn=Rahul%20Kumar&am=5000');
    } else if (demo === 'merchant-mismatch') {
      setIntent('PAY_MERCHANT');
      setExpectedMerchant('ABC Medical');
      setManualPayload('upi://pay?pa=rahulsharma@upi&pn=Rahul%20Sharma&am=450');
    }
  }, [searchParams]);

  // Initialize ZXing Camera Scanner
  useEffect(() => {
    const codeReader = new BrowserQRCodeReader();

    if (videoRef.current && isScanning) {
      codeReader
        .decodeFromVideoDevice(undefined, videoRef.current, (result, error, controls) => {
          controlsRef.current = controls;
          if (result) {
            handleScanSuccess(result.getText());
          }
        })
        .catch((err) => {
          setCameraError('Camera access unavailable or blocked. You can upload an image or enter payload manually.');
        });
    }

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [isScanning, intent, expectedMerchant]);

  const handleScanSuccess = async (qrString: string) => {
    if (controlsRef.current) {
      controlsRef.current.stop();
    }
    setIsScanning(false);
    setLoading(true);

    try {
      const result = await scanQr(
        qrString,
        intent,
        expectedMerchant.trim() ? expectedMerchant.trim() : undefined
      );
      navigate('/result', { state: { scanResult: result } });
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to scan QR code');
      setIsScanning(true);
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPayload.trim()) return;
    handleScanSuccess(manualPayload.trim());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const codeReader = new BrowserQRCodeReader();
    const imgUrl = URL.createObjectURL(file);

    try {
      setLoading(true);
      const result = await codeReader.decodeFromImageUrl(imgUrl);
      URL.revokeObjectURL(imgUrl);
      if (result) {
        await handleScanSuccess(result.getText());
      }
    } catch {
      alert('Could not detect a valid QR code in the uploaded image.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">PaymentTruth™ QR Scanner</h1>
        <p className="text-sm text-slate-400">
          Decodes transaction direction & payee details before your UPI app can debit funds.
        </p>
      </div>

      {/* Payment Intent & Merchant Context Form (Sections 17 & 18) */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 mb-6 space-y-4">
        <div>
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-2">
            1. What are you trying to do?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setIntent('PAY_MERCHANT')}
              className={`p-3 rounded-xl text-xs font-semibold text-center transition-all ${
                intent === 'PAY_MERCHANT'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-glow-cyan'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Pay a Merchant
            </button>
            <button
              type="button"
              onClick={() => setIntent('RECEIVE_MONEY')}
              className={`p-3 rounded-xl text-xs font-semibold text-center transition-all ${
                intent === 'RECEIVE_MONEY'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-glow-danger'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Receive Money / Refund
            </button>
            <button
              type="button"
              onClick={() => setIntent('NOT_SURE')}
              className={`p-3 rounded-xl text-xs font-semibold text-center transition-all ${
                intent === 'NOT_SURE'
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Not Sure
            </button>
          </div>
          {intent === 'RECEIVE_MONEY' && (
            <div className="mt-2 text-xs text-rose-400 flex items-center space-x-1.5 font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Scanning a payment QR while expecting to receive money will trigger a Fraud Alert.</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-1">
            2. Expected Merchant / Shop Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. ABC Medical, Apollo Pharmacy"
            value={expectedMerchant}
            onChange={(e) => setExpectedMerchant(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square sm:aspect-video flex items-center justify-center mb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
            <span className="font-mono text-sm text-cyan-300">Analyzing QR Payload & Intent...</span>
          </div>
        ) : cameraError ? (
          <div className="p-6 text-center max-w-sm">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-xs text-slate-300 mb-4">{cameraError}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full h-full object-cover" />
            {/* Viewfinder Target */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-cyan-500/60 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 -mb-1 -mr-1" />
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alternative Input Options: Upload Image & Manual UPI entry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <label className="flex items-center justify-center space-x-2 p-3.5 rounded-xl glass-card border border-slate-800 hover:border-slate-700 cursor-pointer text-xs font-semibold text-slate-300 transition-colors">
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>Upload QR Screenshot</span>
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>

        <button
          type="button"
          onClick={() => {
            setManualPayload('upi://pay?pa=sharma.medical@okhdfcbank&pn=ABC%20Medical&am=350');
          }}
          className="flex items-center justify-center space-x-2 p-3.5 rounded-xl glass-card border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Load Legitimate Demo QR</span>
        </button>
      </div>

      {/* Manual Payload Tester */}
      <form onSubmit={handleManualSubmit} className="p-4 rounded-2xl glass-card border border-slate-800">
        <label className="text-xs font-mono text-slate-400 block mb-2">
          Or test raw UPI string / QR text directly:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            placeholder="upi://pay?pa=name@upi&am=500"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!manualPayload.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center space-x-1"
          >
            <span>Scan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
