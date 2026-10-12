"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table"; // Adjust path to your generic data-table component
import { getLimitHistory, LimitHistoryResponse } from "@/lib/api/limit";
import { getMarginHistory, MarginHistoryResponse } from "@/lib/api/rate-margin";
import { limitColumns, rateColumns } from "./columns";

interface LimitListTableProps {
  searchQuery: string;
  authorizationType: string;
  onSelectionChange: (selectedIds: string[]) => void;
}

interface RateListTableProps {
  searchQuery: string;
  authorizationType: string;
  onSelectionChange: (selectedIds: string[]) => void;
}

export function LimitListTable({
  searchQuery,
  // authorizationType,
  onSelectionChange,
}: LimitListTableProps) {
  const [data, setData] = useState<LimitHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const result = await getLimitHistory();
        setData(result || []);
      } catch (error) {
        console.error("Failed to fetch limit history data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center border rounded-md">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Memuat data otorisasi limit...</span>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={limitColumns}
      data={data}
      searchQuery={searchQuery}
      onSelectionChange={onSelectionChange}
    />
  );
}

export function RateListTable({
  searchQuery,
  // authorizationType,
  onSelectionChange,
}: RateListTableProps) {
  const [data, setData] = useState<MarginHistoryResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const result = await getMarginHistory();
        setData(result || []);
      } catch (error) {
        console.error("Failed to fetch rate authorization data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-md border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Memuat data otorisasi rate...</span>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={rateColumns}
      data={data}
      searchQuery={searchQuery}
      onSelectionChange={onSelectionChange}
    />
  );
}