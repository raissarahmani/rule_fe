"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BaseHistoryItem } from "./table";
import { formatDateTime } from "@/lib/utils/date";

export const columns: ColumnDef<BaseHistoryItem>[] = [
  {
    accessorKey: "created_at",
    header: "Tanggal otorisasi",
    cell: ({ row }) => {
      return <span>{formatDateTime(row.getValue("created_at") as string)}</span>;
    },
  },
  {
    accessorKey: "trx_type",
    header: "Jenis otorisasi",
    cell: ({ row }) => {
      const type = row.original.trx_type || "-";
      return <span className="capitalize font-medium">{type}</span>;
    },
  },
  {
    accessorKey: "action_type",
    header: "Status",
    cell: ({ row }) => {
      const status = String(row.getValue("action_type") || "").toUpperCase();
      
      switch (status) {
        case "APPROVE":
          return <p className="font-medium text-primary">Disetujui</p>;
        case "REJECT":
          return <p className="font-medium text-destructive">Ditolak</p>;
        case "UPDATE":
        case "CREATE":
          return <p className="font-medium text-amber-500">Menunggu Otorisasi</p>;
        default:
          return <p className="font-medium">-</p>;
      }
    },
  },
  {
    accessorKey: "requested_by",
    header: "User input",
    cell: ({ row }) => row.original.requested_by || "-",
  },
  {
    accessorKey: "action_by",
    header: "User otorisasi",
    cell: ({ row }) => row.original.action_by || "-",
  },
  {
    accessorKey: "note",
    header: "Komentar",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate block text-muted-foreground">
        {row.original.note || "-"}
      </span>
    ),
  },
  {
  id: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const rawType = (row.original.trx_type || "").toLowerCase();
    const typeParam = rawType === "rate" || rawType === "margin" ? "margin" : "limit";

    return (
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/otorisasi/history/${row.original.id}?type=${typeParam}`}>
          <Eye className="size-4 text-primary" />
        </Link>
      </Button>
    );
  },
}
];
