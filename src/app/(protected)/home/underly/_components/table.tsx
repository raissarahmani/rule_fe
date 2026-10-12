"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Watermark } from "@/components/watermark";

interface UnderlyingTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
}

export function UnderlyingTable<TData>({
  columns,
  data,
  loading,
}: UnderlyingTableProps<TData>) {
  return (
    <div className="relative z-10 space-y-6">
      <Watermark />
      <DataTable columns={columns} data={data} loading={loading} />
    </div>
  );
}