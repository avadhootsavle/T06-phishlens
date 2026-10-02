export interface ParsedUPI {
  isUPI: boolean;
  rawPayload: string;
  upiId?: string;
  payeeName?: string;
  amount?: string;
  currency?: string;
  transactionNote?: string;
  merchantCategoryCode?: string;
  urlRef?: string;
}

export function parseUPIString(payload: string): ParsedUPI {
  const trimmed = payload.trim();
  if (!trimmed.toLowerCase().startsWith('upi://pay')) {
    return { isUPI: false, rawPayload: payload };
  }

  try {
    const url = new URL(trimmed);
    const params = url.searchParams;

    const upiId = params.get('pa') || undefined;
    const payeeName = params.get('pn') ? decodeURIComponent(params.get('pn')!) : undefined;
    const amount = params.get('am') || undefined;
    const currency = params.get('cu') || 'INR';
    const transactionNote = params.get('tn') ? decodeURIComponent(params.get('tn')!) : undefined;
    const merchantCategoryCode = params.get('mc') || undefined;
    const urlRef = params.get('url') || undefined;

    return {
      isUPI: true,
      rawPayload: payload,
      upiId,
      payeeName,
      amount,
      currency,
      transactionNote,
      merchantCategoryCode,
      urlRef,
    };
  } catch {
    // If URL parsing fails, manual query-param extraction fallback
    const queryPart = trimmed.split('?')[1];
    if (!queryPart) {
      return { isUPI: true, rawPayload: payload };
    }

    const params = new URLSearchParams(queryPart);
    return {
      isUPI: true,
      rawPayload: payload,
      upiId: params.get('pa') || undefined,
      payeeName: params.get('pn') ? decodeURIComponent(params.get('pn')!) : undefined,
      amount: params.get('am') || undefined,
      currency: params.get('cu') || 'INR',
      transactionNote: params.get('tn') ? decodeURIComponent(params.get('tn')!) : undefined,
      merchantCategoryCode: params.get('mc') || undefined,
    };
  }
}
