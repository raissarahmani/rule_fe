import api from "@/lib/api/api";

export type BaseRateResponse = {
    id: number;
    currency: string;
    buy_rate: number;
    sell_rate: number;
    last_update: string;
    last_polled_at: string;
}
export type FinalRateResponse = {
    id: string;
    source_ccy: string;
    target_ccy: string;
    base_mid_rate: number;
    base_buy_rate: number;
    base_sell_rate: number;
    margin_buy: number;
    margin_sell: number;
    final_buy_rate: number;
    final_sell_rate: number;
    last_polled_at: string;
};

export type MarginHistoryResponse = {
  id: string;
  margin_id: string;
  source_ccy: string;
  target_ccy: string;
  base_buy_rate: number;
  base_sell_rate: number;
  margin_buy_existing: number;
  margin_sell_existing: number;
  margin_buy_requested: number;
  margin_sell_requested: number;
  final_buy_rate: number;
  final_sell_rate: number;
  action_type: string;
  action_by: string;
  requested_by: string;
  created_at: string;
};

export type MarginHistoryDetailResponse = {
  id: string;
  margin_id: string;
  source_ccy: string;
  target_ccy: string;
  base_buy_rate: number;
  base_sell_rate: number;
  margin_buy_existing: number;
  margin_sell_existing: number;
  final_buy_rate_before: number;
  final_sell_rate_before: number;
  margin_buy_requested: number;
  margin_sell_requested: number;
  final_buy_rate_after: number;
  final_sell_rate_after: number;
  note: string;
  action_type: string;
  action_by: string;
  requested_by: string;
  requested_at: string;
  created_at: string;
};

export interface UpdateMarginRequest {
  id: string;
  margin_buy: number;
  margin_sell: number;
}

export interface ResolveMarginRequest {
  id: string;
  status: string;
  note?: string;
}

export async function getFinalRate(): Promise<FinalRateResponse[]> {
  const res = await api.get<{ data: FinalRateResponse[] }>("/margins/final-rates/all");
  return res.data.data;
}

export async function updateMargin(
  payload: UpdateMarginRequest
) {
  const response = await api.put("/margins", payload);
  return response.data.data;
}

export async function resolveMargin(
  payload: ResolveMarginRequest
) {
  const response = await api.put("/margins/status", payload);
  return response.data.data;
}

export async function getMarginHistory(): Promise<MarginHistoryResponse[]> {
  const [createRes, updateRes] = await Promise.all([
    api.get<{ data: MarginHistoryResponse[] }>("/margins/history?type=Create"),
    api.get<{ data: MarginHistoryResponse[] }>("/margins/history?type=Update"),
  ]);

  const combined = [
    ...(createRes.data.data || []),
    ...(updateRes.data.data || []),
  ];

  return combined.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
}

export async function getMarginApprovalHistory(
): Promise<MarginHistoryResponse[]> {
  const [approvedRes, rejectedRes] = await Promise.all([
    api.get<{ data: MarginHistoryResponse[] }>("/margins/history?type=Approve"),
    api.get<{ data: MarginHistoryResponse[] }>("/margins/history?type=Reject"),
  ]);

  const combined = [
    ...(approvedRes.data.data || []),
    ...(rejectedRes.data.data || []),
  ];

  return combined.sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    return timeB - timeA;
  });
}

export async function getMarginHistoryById(
  id: string
): Promise<MarginHistoryDetailResponse | null> {
  if (!id) return null;

  const res = await api.get<{ data: MarginHistoryDetailResponse }>(
    `/margins/history/${id}`
  );
  return res.data.data;
}

export async function exportRate() {
  const res = await api.get(`/margins/final-rates/export`, {
    responseType: "blob",
  });

  const filename = `rate-report-${new Date().toISOString().slice(0, 10)}.pdf`;

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}