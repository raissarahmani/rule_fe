"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table"; 
import { getLogActvity, LogResponse } from "@/lib/api/log"; 
import { columns } from "./columns";

interface LogActivityTableProps {
  searchQuery?: string;
  refreshKey?: number;
}

export function LogActivityTable({
  searchQuery = "",
  refreshKey = 0,
}: LogActivityTableProps) {
  const [data, setData] = useState<LogResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setIsLoading(true);
        const result = await getLogActvity();

        // Sort descending by created_at (newest first)
        const sortedLogs = (result || []).sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });

        setData(sortedLogs);
      } catch (error) {
        console.error("Failed to fetch activity logs:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-md border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Memuat log aktivitas...</span>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchQuery={searchQuery}
    />
  );
}