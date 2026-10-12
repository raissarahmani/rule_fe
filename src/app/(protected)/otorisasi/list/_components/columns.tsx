"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { LimitHistoryResponse } from "@/lib/api/limit";
import { MarginHistoryResponse } from "@/lib/api/rate-margin";
import { formatDateTime } from "@/lib/utils/date";

const formatNumber = (val?: number) =>
  val !== undefined && val !== null
    ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(val)
    : "-";

export const limitColumns: ColumnDef<LimitHistoryResponse>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: "Tanggal Pengajuan",
    cell: ({ row }) => {
      return <span>{formatDateTime(row.getValue("created_at") as string)}</span>;
    },
  },
  {
    accessorKey: "trx_type",
    header: "Jenis Limit",
    cell: ({ row }) => {
      const rawType = String(row.getValue("trx_type") || "").toLowerCase();
      let label = row.getValue("trx_type") as string;

      if (rawType === "FX") label = "Jual Beli";
      if (rawType === "REMITTANCE") label = "Remittance";

      return <span>{label}</span>;
    },
  },
  {
    accessorKey: "amount_existing",
    header: "Limit Sebelum",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount_existing"));
      const formatted = new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 2,
      }).format(amount);
      return <span>{formatted}</span>;
    },
  },
  {
    accessorKey: "amount_requested",
    header: "Limit Sesudah",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount_requested"));
      const formatted = new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 2,
      }).format(amount);
      return <span>{formatted}</span>;
    },
  },
  {
    accessorKey: "action_by",
    header: "User Input",
    cell: ({ row }) => (
      <span>{row.getValue("action_by")}</span>
    ),
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
];

export const rateColumns: ColumnDef<MarginHistoryResponse>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "created_at",
    header: "Tanggal Pengajuan",
    cell: ({ row }) => {
      return <span>{formatDateTime(row.getValue("created_at") as string)}</span>;
    },
  },
  {
    id: "source_ccy",
    header: "Valuta",
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.source_ccy}
      </span>
    ),
  },
  {
    accessorKey: "base_sell_rate",
    header: "Rate Jual BCA",
    cell: ({ row }) => <span>{formatNumber(row.getValue("base_sell_rate"))}</span>,
  },
  {
    accessorKey: "base_buy_rate",
    header: "Rate Beli BCA",
    cell: ({ row }) => <span>{formatNumber(row.getValue("base_buy_rate"))}</span>,
  },
  {
    accessorKey: "margin_sell_existing",
    header: "Margin Jual Sebelum",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatNumber(row.original.margin_sell_existing)}
      </span>
    ),
  },
  {
    accessorKey: "margin_buy_existing",
    header: "Margin Beli Sebelum",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatNumber(row.original.margin_buy_existing)}
      </span>
    ),
  },
  {
    accessorKey: "margin_sell_requested",
    header: "Margin Jual Sesudah",
    cell: ({ row }) => <span>{formatNumber(row.getValue("margin_sell_requested"))}</span>,
  },
  {
    accessorKey: "margin_buy_requested",
    header: "Margin Beli Sesudah",
    cell: ({ row }) => <span>{formatNumber(row.getValue("margin_buy_requested"))}</span>,
  },
  {
    accessorKey: "final_sell_rate",
    header: "Rate Jual",
    cell: ({ row }) => (
      <span className="font-semibold">{formatNumber(row.getValue("final_sell_rate"))}</span>
    ),
  },
  {
    accessorKey: "final_buy_rate",
    header: "Rate Beli",
    cell: ({ row }) => (
      <span className="font-semibold">{formatNumber(row.getValue("final_buy_rate"))}</span>
    ),
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
];