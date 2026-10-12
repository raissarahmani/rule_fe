"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { getLimitApprovalHistory } from "@/lib/api/limit";
import { getMarginApprovalHistory } from "@/lib/api/rate-margin";
import { columns } from "./columns";

export interface BaseHistoryItem {
  id: string;
  authorization_date?: string;
  trx_type?: string;
  status?: string;
  user_input?: string;
  user_authorization?: string;
  comment?: string;
  created_at?: string;
  [key: string]: any;
}

interface HistoryTableProps {
  searchQuery: string;
  authorizationType: string;
}

export function HistoryTable({
  searchQuery,
  authorizationType,
}: HistoryTableProps) {
  const [data, setData] = useState<BaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        let result: BaseHistoryItem[] = [];

        if (authorizationType === "limit") {
          const limitData = await getLimitApprovalHistory();
          result = limitData.map((item) => ({
            ...item,
            trx_type: "Limit",
          })) as BaseHistoryItem[];
        } else if (authorizationType === "rate" || authorizationType === "margin") {
          const marginData = await getMarginApprovalHistory();
          result = marginData.map((item) => ({
            ...item,
            trx_type: "Rate",
          })) as BaseHistoryItem[];
        } else {
          const [limitData, marginData] = await Promise.all([
            getLimitApprovalHistory(),
            getMarginApprovalHistory(),
          ]);

          const normalizedLimit: BaseHistoryItem[] = limitData.map((item) => ({
            ...item,
            trx_type: "Limit",
          }));

          const normalizedMargin: BaseHistoryItem[] = marginData.map((item) => ({
            ...item,
            trx_type: "Rate",
          }));

          result = [...normalizedLimit, ...normalizedMargin].sort((a, b) => {
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeB - timeA;
          });
        }

        setData(result);
      } catch (error) {
        console.error("Failed to fetch authorization history:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [authorizationType]);

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-md border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Memuat riwayat otorisasi...</span>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns as any}
      data={data}
      searchQuery={searchQuery}
    />
  );
}