import api from "@/lib/api/api";

export type LimitResponse = {
  id: string;
  name: string;
  amount: number;
  ccy: string;
  trx_type: string; 
  user_submit: string;
  created_at: string;
  updated_at: string;
};

export type LimitHistoryResponse = {
  id: string;
  amount_existing: number;
  amount_requested: number;
  ccy: string;
  trx_type: string; 
  action_by: string;
  action_type: string;
  note: string;
  created_at: string;
  requested_by: string;
  requested_at?: string;
};

export type LimitHistoryJoinedResponse = {
  id: string;
  fx_amount_before: number;
  fx_amount_after: number;
  remittance_amount_before: number;
  remittance_amount_after: number;
  ccy: string;
  trx_type: string; 
  action_by: string;
  action_type: string;
  note: string;
  created_at: string;
  requested_by: string;
  requested_at: string;
};

export interface UpdateGlobalLimitRequest {
  id: string;
  amount_requested: number;
}

export interface ResolveLimitRequest {
  id: string;
  status: string;
  note?: string;
}

export async function getGlobalLimit(): Promise<LimitResponse[]> {
  const res = await api.get<{ data: LimitResponse[] }>("/limits");
  return res.data.data;
}

export async function updateGlobalLimit(
  payload: UpdateGlobalLimitRequest
) {
  const response = await api.put("/limits", payload);
  return response.data.data;
}

export async function resolveGlobalLimit(
  payload: ResolveLimitRequest
) {
  const response = await api.put("/limits/status", payload);
  return response.data.data;
}

export async function getApprovedLimitHistory(): Promise<LimitHistoryResponse[]> {
  const res = await api.get<{ data: LimitHistoryResponse[] }>("/limits/history?type=Approve");
  return res.data.data;
}

export async function getLimitHistory(
): Promise<LimitHistoryResponse[]> {
  const [createRes, updateRes] = await Promise.all([
    api.get<{ data: LimitHistoryResponse[] }>("/limits/history?type=Create"),
    api.get<{ data: LimitHistoryResponse[] }>("/limits/history?type=Update"),
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

export async function getLimitApprovalHistory(
): Promise<LimitHistoryResponse[]> {
  const [approvedRes, rejectedRes] = await Promise.all([
    api.get<{ data: LimitHistoryResponse[] }>("/limits/history?type=Approve"),
    api.get<{ data: LimitHistoryResponse[] }>("/limits/history?type=Reject"),
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

export async function getLimitHistoryById(
  id: string
): Promise<LimitHistoryJoinedResponse | null> {
  if (!id) return null;

  const res = await api.get<{ data: LimitHistoryJoinedResponse }>(
    `/limits/history/${id}`
  );
  return res.data.data;
}