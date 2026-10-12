"use client";

import { ColumnDef } from "@tanstack/react-table";
import { LogResponse } from "@/lib/api/log";

export const columns: ColumnDef<LogResponse>[] = [
  {
    accessorKey: "user_id",
    header: "User ID",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{row.original.user_id || "-"}</span>
        <span className="text-xs text-muted-foreground">{row.original.name || "-"}</span>
      </div>
    ),
  },
  {
    accessorKey: "url",
    header: "URL",
    cell: ({ row }) => (
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[250px] truncate block">
        {row.original.url || "-"}
      </code>
    ),
  },
  {
    accessorKey: "action_type",
    header: "Aksi",
    cell: ({ row }) => {
      const raw = row.original.action_type || "";

      const action = raw
        .replace(/(doc|margin|limit|underly|status)/gi, " $1")
        .trim()
        .toUpperCase();

      if (!raw) return "-";

      if (action.includes("CREATE") || action.includes("ADD")) return <span className="text-foreground">{action}</span>;
      if (action.includes("UPDATE")) return <span className="text-amber-500">{action}</span>;
      if (action.includes("APPROVE")) return <span className="text-emerald-800">{action}</span>;
      if (action.includes("DELETE") || action.includes("REJECT")) return <span className="text-destructive">{action}</span>;

      return <span className="text-foreground">{action}</span>;
    },
  },
  {
    accessorKey: "branch",
    header: "Cabang User",
    cell: ({ row }) => row.original.branch || "-",
  },
  {
    id: "date",
    accessorKey: "created_at",
    header: "Tanggal",
    cell: ({ row }) => {
      const val = row.original.created_at;
      if (!val) return "-";
      return new Date(val).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
  },
  {
    id: "time",
    accessorKey: "created_at",
    header: "Jam",
    cell: ({ row }) => {
      const val = row.original.created_at;
      if (!val) return "-";
      return new Date(val).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    },
  },
];