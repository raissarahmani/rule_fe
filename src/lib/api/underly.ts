import api from "@/lib/api/api";

export type UnderlyParam = {
  search?: string;
  type?: string;
};

export interface UpdateStatusUnderlyRequest {
  doc_id: string;
  status: string;
  expiry_date: string;
  amount_approved: number;
  note?: string;
}

export type UnderlyResponse = {
  id: string;
  cif: string;
  type: string;
  beneficiary_country: string;
  beneficiary_bank: string;
  beneficiary_account_no: string;
  beneficiary_name: string;
  beneficiary_address: string;
  title: string;
  doc_type: string;
  amount_submitted: number;
  amount_approved: number;
  ccy: string;
  expiry_date: string;
  path_to_file: string[];
  trx_direction: string;
  doc_status: string;
  is_active: boolean;
  channel: string;
  user_submit: string;
  user_approve: string;
  created_at: string;
  updated_at: string;
}

// export type UnderlyHistoryResponse = {
//   ID: string;
//   DocID: string;
//   CIF: string;
//   Type: string;
//   AmountSubmitted: number;
//   AmountApproved: number;
//   Ccy: string;
//   ActionType: string;
//   ActionBy: string;
//   Note: string;
//   CreatedAt: string;
// }

// export type EnrichedUnderlyHistory = UnderlyHistoryResponse;

export type UnderlyHistoryResponse = {
  ID: string;
  DocID: string;
  CIF: string;
  Type: string;
  AmountSubmitted: number;
  AmountApproved: number | null;
  Ccy: string;
  ActionType: string;
  ActionBy: string;
  Note: string | null;
  ActionAt: string;
  SubmittedAt: string;
  BeneficiaryCountry: string | null;
  BeneficiaryBank: string | null;
  BeneficiaryAccountNo: string | null;
  BeneficiaryName: string | null;
  Title: string;
  DocType: string;
  DocNo: string;
  DocDate: string;
  PathToFile: string[];
  ExpiryDate : string;
}

export type UnderlyStatResponse = {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

// export type EnrichedUnderlyHistory = UnderlyHistoryResponse &
//   Partial<Omit<UnderlyResponse, keyof UnderlyHistoryResponse>> & {
//     submitted_at?: string;
//     action_at?: string;
//   };

export interface DuplicateUnderlyResponse {
  is_duplicate: boolean;
  similar_docs: UnderlyResponse[];
}

export async function getAllUnderly(
  params?: UnderlyParam
): Promise<UnderlyResponse[]> {
  const cleanParams: Record<string, string> = {};
  if (params?.search) cleanParams.search = params.search;
  if (params?.type && params.type !== "ALL") cleanParams.type = params.type;

  const res = await api.get<{ data: UnderlyResponse[] }>(
    "/underly-docs",
   { params: cleanParams }
  );
  return res.data.data;
}

export async function getUnderlyById(
  id: string
): Promise<UnderlyResponse | null> {
  if (!id) return null;

  const res = await api.get<{ data: UnderlyResponse }>(
    `/underly-docs/${id}`,
  );
  return res.data.data;
}

// export async function getUnderlyHistory(
//   params?: UnderlyParam
// ): Promise<UnderlyHistoryResponse[]> {
//   const cleanParams: Record<string, string> = {};
//   if (params?.search) cleanParams.search = params.search;
//   if (params?.type && params.type !== "ALL") cleanParams.type = params.type;

//   const res = await api.get<{ data: UnderlyHistoryResponse[] }>(
//     "/underly-docs/history",
//     { params: cleanParams }
//   );
//   return res.data.data;
// }

export async function getUnderlyHistory(
  params?: UnderlyParam
): Promise<UnderlyHistoryResponse[]> {
  const cleanParams: Record<string, string> = {};
  if (params?.search) cleanParams.search = params.search;
  if (params?.type && params.type !== "ALL") cleanParams.type = params.type;
  
  const res = await api.get<{ data: UnderlyHistoryResponse[] }>(
    "/underly-docs/history",
    { params: cleanParams }
  );
  return res.data.data;
}

export async function getUnderlyStat(
  params?: UnderlyParam
): Promise<UnderlyStatResponse[]> {
  const cleanParams: Record<string, string> = {};
  if (params?.type && params.type !== "ALL") cleanParams.type = params.type;

  const res = await api.get<{ data: UnderlyStatResponse[] }>(
    "/underly-docs/stat",
    { params: cleanParams }
  );
  return res.data.data;
}

export async function getSimilarUnderly(
  id: string
): Promise<DuplicateUnderlyResponse | null> {
  if (!id) return null;
  const res = await api.get<{ data: DuplicateUnderlyResponse }>(
    `/underly-docs/${id}/duplicate`
  );
  return res.data.data;
}

export async function updateStatusUnderly(
  payload: UpdateStatusUnderlyRequest
) {
  const response = await api.put("/underly-docs/status", payload);
  return response.data.data;
}

export async function exportUnderlyFile(id: string, filePath: string) {
  if (!id || !filePath) return null;

  const res = await api.get(`/underly-docs/${id}/export`, {
    params: { file_path: filePath },
    responseType: "blob",
  });

  const filename = filePath.split("/").pop() || "download";

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function previewUnderlyFile(id: string, filePath: string) {
  if (!id || !filePath) return null;

  const res = await api.get(`/underly-docs/${id}/preview`, {
    params: { file_path: filePath },
    responseType: "blob",
  });

  const rawContentType = res.headers["content-type"];
  const contentType =
    typeof rawContentType === "string" ? rawContentType : "application/pdf";
  
  const blob = new Blob([res.data], { type: contentType });
  const fileURL = window.URL.createObjectURL(blob);

  window.open(fileURL, "_blank");
}