"use client";

import { columns } from "./columns";
import { DataTable } from "@/components/data-table/data-table";
import { LimitHistoryResponse } from "@/lib/api/limit";

interface LimitTableProps {
  data: LimitHistoryResponse[];
  loading: boolean;
}

export function LimitTable({ data, loading }: LimitTableProps) {
  return <DataTable columns={columns} data={data} loading={loading} />;
}