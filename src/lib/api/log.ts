import api from "@/lib/api/api";

export type LogResponse = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  action_type: string;
  branch: string;
  created_at: string;
};

export async function getLogActvity(): Promise<LogResponse[]> {
  const res = await api.get<{ data: LogResponse[] }>("/log");
  return res.data.data;
}