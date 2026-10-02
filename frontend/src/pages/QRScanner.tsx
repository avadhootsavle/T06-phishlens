import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Camera, Upload, ArrowRight, AlertCircle, RefreshCw, Monitor } from 'lucide-react';
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
      setManualPayload('upi://pay?pa=scammer.refund@upi&pn=Paytm%20Cashback%20Agent&am=4999');
    } else if (demo === 'merchant-mismatch') {
      setIntent('PAY_MERCHANT');
      setExpectedMerchant('ABC Medical');
      setManualPayload('upi://pay?pa=rahulsharma@upi&pn=Rahul%20Sharma&am=450');
    } else if (demo === 'tampered-sticker') {
      setIntent('PAY_MERCHANT');
      setManualPayload('http://localhost:3000/m/eyJleHBpcmVzQXQiOjE4MjI1MDA1NDIsImlzc3VlZEF0IjoxNzkwOTY0NTQyLCJraWQiOiJwaGlzaGxlbnMtZWQyNTUxOS12MSIsIm1lcmNoYW50SWQiOiI5Mzk1ODFmMy03NGRlLTQ2MDQtODBiYi1jZmM3OTc0MDhmYjEiLCJzaG9wTmFtZSI6IkFwZXggRWxlY3Ryb25pY3MiLCJ2IjoxLCJ2cGEiOiJhcGV4LnBheUB1cGkifQ.NZ4mFNdSLLxAm5f0gR1ZTeNLC_GIe1drnedJQvV5PytiPRhvbb9_I0UUqdoXkrbi4RtKETqZaG6uw1kaEB4JDA');
    } else if (demo === 'verified-merchant') {
      setIntent('PAY_MERCHANT');
      setManualPayload('http://localhost:3000/m/eyJleHBpcmVzQXQiOjE4MjI1MDA1NDIsImlzc3VlZEF0IjoxNzkwOTY0NTQyLCJraWQiOiJwaGlzaGxlbnMtZWQyNTUxOS12MSIsIm1lcmNoYW50SWQiOiI5Mzk1ODFmMy03NGRlLTQ2MDQtODBiYi1jZmM3OTc0MDhmYjEiLCJzaG9wTmFtZSI6IkFwZXggRWxlY3Ryb25pY3MiLCJ2IjoxLCJ2cGEiOiJhcGV4LnBheUB1cGkifQ.NZ4mFNdSLLxAm5f0gR1ZTeNLC_GIe1drnedJQvV5PytiPRhvbb9_I0UUqdoXkrbi4RtKETqZaG6uw1kaEB4JDg');
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
        .catch(() => {
          setCameraError('Camera access is not permitted or unavailable on this device. You can upload an image or enter the payload manually.');
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
      alert('Could not decode a valid QR code from this image. Please ensure the code is clear and well lit.');
      setLoading(false);
    }
  };

  const handleCaptureScreen = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Screen capture is not supported in this browser. Please use file upload or the Chrome Extension.');
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setLoading(true);
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stream.getTracks().forEach((track) => track.stop());

        const codeReader = new BrowserQRCodeReader();
        try {
          const result = await codeReader.decodeFromCanvas(canvas);
          if (result && result.getText()) {
            await handleScanSuccess(result.getText());
            return;
          }
        } catch {
          // not found
        }
        alert('No QR code detected in the captured screen frame. Make sure the QR code is clearly visible.');
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Title & Purpose */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          QR Code & Payment Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Decodes UPI payment directions, payee names, and web links before you execute them on your device.
        </p>
      </div>

      {/* User Intent Configuration Card */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm mb-6">
        <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 block mb-2">
          What are you trying to do?
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setIntent('PAY_MERCHANT')}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-colors ${
              intent === 'PAY_MERCHANT'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold mb-0.5">Pay a merchant</div>
            <div className={`text-[11px] ${intent === 'PAY_MERCHANT' ? 'text-slate-300' : 'text-slate-500'}`}>
              Standard purchase
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIntent('RECEIVE_MONEY')}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-colors ${
              intent === 'RECEIVE_MONEY'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold mb-0.5">Receive money / refund</div>
            <div className={`text-[11px] ${intent === 'RECEIVE_MONEY' ? 'text-slate-300' : 'text-slate-500'}`}>
              Expecting an incoming credit
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIntent('NOT_SURE')}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left border transition-colors ${
              intent === 'NOT_SURE'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold mb-0.5">General QR scan</div>
            <div className={`text-[11px] ${intent === 'NOT_SURE' ? 'text-slate-300' : 'text-slate-500'}`}>
              Website or menu link
            </div>
          </button>
        </div>

        {/* Expected Merchant Name Input ("Pay at: <shop name>") */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-900 block">
              Pay at: &lt;shop name&gt; <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <span className="text-[10px] font-mono text-slate-500">Detects recipient mismatch</span>
          </div>
          <input
            type="text"
            value={expectedMerchant}
            onChange={(e) => setExpectedMerchant(e.target.value)}
            placeholder="e.g. ABC Medical, Sharma General Store, Starbucks"
            className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            If provided, PhishLens will check whether the QR recipient matches what you expect before paying.
          </p>
        </div>
      </div>

      {/* Main Viewfinder Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm mb-6">
        <div className="relative aspect-video max-w-md mx-auto rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200">
          {cameraError ? (
            <div className="p-6 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs leading-relaxed max-w-xs">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />

              {/* Minimal Scanner Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/60 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5" />
                </div>
              </div>
            </>
          )}

          {/* Skeleton Loader during scan processing */}
          {loading && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-xs flex flex-col items-center justify-center p-6">
              <RefreshCw className="w-6 h-6 text-slate-700 animate-spin mb-3" />
              <span className="text-xs font-semibold text-slate-900">Evaluating QR semantics...</span>
              <span className="text-[11px] text-slate-500 mt-1 font-mono">Checking payment direction & recipient</span>
            </div>
          )}
        </div>

        {/* File Upload and Screen Capture Options */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 font-medium cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleCaptureScreen}
              className="inline-flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 font-medium cursor-pointer"
            >
              <Monitor className="w-4 h-4" />
              <span>Capture Screen / Tab</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Desktop & Mobile supported
          </span>
        </div>
      </div>

      {/* Manual Payload Fallback */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2.5">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
            Manual Payload / Demo Presets
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Click to auto-populate test vector</span>
        </div>

        {/* 1-Click Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => {
              setIntent('RECEIVE_MONEY');
              setManualPayload('upi://pay?pa=scammer.refund@upi&pn=Paytm%20Cashback%20Agent&am=4999');
            }}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
          >
            Reverse Payment Trick
          </button>
          <button
            type="button"
            onClick={() => {
              setIntent('PAY_MERCHANT');
              setManualPayload('http://localhost:3000/m/eyJleHBpcmVzQXQiOjE4MjI1MDA1NDIsImlzc3VlZEF0IjoxNzkwOTY0NTQyLCJraWQiOiJwaGlzaGxlbnMtZWQyNTUxOS12MSIsIm1lcmNoYW50SWQiOiI5Mzk1ODFmMy03NGRlLTQ2MDQtODBiYi1jZmM3OTc0MDhmYjEiLCJzaG9wTmFtZSI6IkFwZXggRWxlY3Ryb25pY3MiLCJ2IjoxLCJ2cGEiOiJhcGV4LnBheUB1cGkifQ.NZ4mFNdSLLxAm5f0gR1ZTeNLC_GIe1drnedJQvV5PytiPRhvbb9_I0UUqdoXkrbi4RtKETqZaG6uw1kaEB4JDA');
            }}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
          >
            Tampered QR Sticker
          </button>
          <button
            type="button"
            onClick={() => {
              setIntent('PAY_MERCHANT');
              setExpectedMerchant('ABC Medical');
              setManualPayload('upi://pay?pa=rahulsharma@upi&pn=Rahul%20Sharma&am=450');
            }}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
          >
            Payee Mismatch
          </button>
          <button
            type="button"
            onClick={() => {
              setIntent('PAY_MERCHANT');
              setManualPayload('http://localhost:3000/m/eyJleHBpcmVzQXQiOjE4MjI1MDA1NDIsImlzc3VlZEF0IjoxNzkwOTY0NTQyLCJraWQiOiJwaGlzaGxlbnMtZWQyNTUxOS12MSIsIm1lcmNoYW50SWQiOiI5Mzk1ODFmMy03NGRlLTQ2MDQtODBiYi1jZmM3OTc0MDhmYjEiLCJzaG9wTmFtZSI6IkFwZXggRWxlY3Ryb25pY3MiLCJ2IjoxLCJ2cGEiOiJhcGV4LnBheUB1cGkifQ.NZ4mFNdSLLxAm5f0gR1ZTeNLC_GIe1drnedJQvV5PytiPRhvbb9_I0UUqdoXkrbi4RtKETqZaG6uw1kaEB4JDg');
            }}
            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-mono text-emerald-800 transition-colors"
          >
            Verified Shop (Ed25519)
          </button>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            type="text"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            placeholder="Paste raw string, e.g. upi://pay?pa=... or https://..."
            className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Useful for testing UPI URIs or desktop emulation
            </span>
            <button
              type="submit"
              disabled={loading || !manualPayload.trim()}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center space-x-1.5 transition-colors"
            >
              <span>Analyze String</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
