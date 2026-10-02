import { ScanResult, PaymentIntent, ReportItem } from '../types';

const API_BASE = '/api/v1';

export async function scanUrl(url: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE}/scans/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Scan request failed with status ${response.status}`);
  }

  return response.json();
}

export async function scanQr(
  qrContent: string,
  expectedIntent?: PaymentIntent,
  expectedMerchantName?: string
): Promise<ScanResult> {
  const response = await fetch(`${API_BASE}/scans/qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qrContent,
      expectedIntent,
      expectedMerchantName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `QR scan request failed with status ${response.status}`);
  }

  return response.json();
}

export async function submitReport(
  scanId: string | undefined,
  category: string,
  note?: string
): Promise<{ reportId: string; status: string; message: string }> {
  const response = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scanId, category, note }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit report');
  }

  return response.json();
}

export async function fetchAdminReports(status?: string): Promise<{
  reports: ReportItem[];
  summary: { total: number; counts: Record<string, number> };
}> {
  const url = status ? `${API_BASE}/admin/reports?status=${status}` : `${API_BASE}/admin/reports`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch admin reports');
  }
  return response.json();
}

export async function updateReportStatus(
  reportId: string,
  status: 'PENDING' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'REJECTED'
): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update report status');
  }
}
