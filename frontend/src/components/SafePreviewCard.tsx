import React, { useState, useEffect, useRef } from 'react';
import { Eye, ShieldCheck, AlertTriangle, ExternalLink, ImageOff } from 'lucide-react';
import { PreviewJobData } from '../types';

interface SafePreviewCardProps {
  previewJobId?: string;
  targetUrl?: string;
  finalHostname?: string;
  onVisualMatch?: (data: PreviewJobData) => void;
}

export const SafePreviewCard: React.FC<SafePreviewCardProps> = ({
  previewJobId,
  targetUrl,
  finalHostname,
  onVisualMatch,
}) => {
  const [data, setData] = useState<PreviewJobData | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);
  const [isTimedOut, setIsTimedOut] = useState<boolean>(false);
  const hasNotifiedParent = useRef<boolean>(false);

  useEffect(() => {
    if (!previewJobId) return;

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/preview/${previewJobId}`);
        if (!res.ok) {
          if (res.status === 404 && pollCount < 10) {
            // Keep polling if newly enqueued
          } else {
            if (isMounted) setIsTimedOut(true);
            return;
          }
        } else {
          const result: PreviewJobData = await res.json();
          if (isMounted) {
            setData(result);
            if (result.status === 'ready') {
              if (result.visualImpersonation && onVisualMatch && !hasNotifiedParent.current) {
                hasNotifiedParent.current = true;
                onVisualMatch(result);
              }
              return; // Stop polling once ready
            }
            if (result.status === 'failed') {
              return; // Stop polling on failure
            }
          }
        }
      } catch {
        // Continue polling until timeout
      }

      setPollCount((prev) => {
        const next = prev + 1;
        if (next >= 10) {
          setIsTimedOut(true);
        } else {
          timer = setTimeout(poll, 1000);
        }
        return next;
      });
    };

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [previewJobId]);

  if (!previewJobId) return null;

  const isPending = !isTimedOut && (!data || data.status === 'pending');
  const isFailed = isTimedOut || data?.status === 'failed';
  const isReady = !isTimedOut && data?.status === 'ready' && data.imageUrl;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">Safe Preview</h3>
            <p className="text-xs text-slate-500">Visual comparison against verified banking portals</p>
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sandboxed preview - nothing was loaded on your device</span>
        </div>
      </div>

      {/* Body States */}
      <div className="mt-4">
        {/* 1. Loading Skeleton */}
        {isPending && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>Generating sandboxed screenshot...</span>
              </span>
              <span>{pollCount + 1}/10s</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-44 bg-slate-200/80 rounded w-full" />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-44 bg-slate-200/80 rounded w-full" />
              </div>
            </div>
          </div>
        )}

        {/* 2. Failure or Timeout Fallback */}
        {isFailed && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-6 text-center">
            <ImageOff className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-800">Preview unavailable</div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              The remote destination blocked headless rendering or timed out. Core threat verdict remains unaffected.
            </p>
          </div>
        )}

        {/* 3. Ready State - Side by Side Comparison */}
        {isReady && data && (
          <div className="space-y-4">
            {/* Visual Match Status Banner */}
            {data.visualImpersonation ? (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Impersonation Detected: {data.visualImpersonation.similarity}% Match with {data.visualImpersonation.brand}
                  </div>
                  <div className="text-red-700 mt-0.5">
                    {data.explanation || `This page closely clones the official ${data.visualImpersonation.brand} login portal.`}
                  </div>
                </div>
              </div>
            ) : data.brand ? (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span>
                  Visual signature compared against <strong>{data.brand}</strong>
                </span>
                <span className="font-mono font-semibold text-slate-600 text-[11px]">
                  {data.similarity}% visual similarity
                </span>
              </div>
            ) : null}

            {/* Side-by-Side Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Suspicious Target Screenshot */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Suspicious Page (Sandboxed)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                    {finalHostname || 'Target'}
                  </span>
                </div>
                <div className="relative aspect-[16/10] bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={data.imageUrl}
                    alt="Sandboxed destination preview"
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Official Brand Reference */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                    Official {data.brand || 'Brand'} Reference
                  </span>
                  {data.officialDomain && (
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold truncate max-w-[150px]">
                      {data.officialDomain}
                    </span>
                  )}
                </div>
                <div className="relative aspect-[16/10] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {data.brandRefImageUrl ? (
                    <img
                      src={data.brandRefImageUrl}
                      alt={`Official ${data.brand} reference`}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 font-mono">No direct reference match</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
