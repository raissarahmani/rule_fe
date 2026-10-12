"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDownIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { LimitHistoryResponse } from "@/lib/api/limit";
import { formatDateTime } from "@/lib/utils/date";

export const columns: ColumnDef<LimitHistoryResponse, unknown>[] = [
  {
    id: "created_at",
    header: "Tanggal Perubahan",
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
  {
    accessorKey: "trx_type",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="p-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Field Yang Diubah
        <ArrowUpDownIcon className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.trx_type
  },
  {
    accessorKey: "amount_existing",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="p-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nilai Lama
        <ArrowUpDownIcon className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span>
        {row.original.amount_existing.toLocaleString("en-US")} {row.original.ccy}
      </span>
    ),
  },
  {
    accessorKey: "amount_requested",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="p-0 hover:bg-transparent"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nilai Baru
        <ArrowUpDownIcon className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span>
        {row.original.amount_requested.toLocaleString("en-US")} {row.original.ccy}
      </span>
    ),
  },
  {
    accessorKey: "action_by",
    header: "User Input",
    cell: ({ row }) => (
      <span>{row.original.action_by || "-"}</span>
    ),
  },
];