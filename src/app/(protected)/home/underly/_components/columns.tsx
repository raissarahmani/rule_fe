"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnderlyResponse, UnderlyHistoryResponse } from "@/lib/api/underly";
import { getUnderlyStatus } from "@/lib/utils/status";
import { formatDateTime, formatDate } from "@/lib/utils/date";

export const columns: ColumnDef<UnderlyResponse>[] = [
  {
    accessorKey: "id",
    header: "Kode Underlying",
    cell: ({ row }) => row.original.id,
  },
  {
    accessorKey: "type",
    header: "Jenis Underlying",
  },
  {
    accessorKey: "beneficiary_country",
    header: "Negara Tujuan",
  },
  {
    accessorKey: "beneficiary_bank",
    header: "Bank Tujuan",
  },
  {
    accessorKey: "beneficiary_account_no",
    header: "Nomor Rekening Tujuan",
  },
  {
    accessorKey: "beneficiary_name",
    header: "Nama Penerima",
  },
  {
    accessorKey: "doc_type",
    header: "Tipe Dokumen",
  },
  {
    accessorKey: "doc_date",
    header: "Tanggal Dokumen",
  },
  {
    accessorKey: "doc_no",
    header: "Nomor Dokumen",
  },
  {
    accessorKey: "expiry_date",
    header: "Tanggal Jatuh Tempo",
    cell: ({ row }) => {
      return formatDate(row.original.expiry_date)
    }
  },
  {
    accessorKey: "amount_submitted",
    header: "Limit Pengajuan",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount_submitted"));
      const ccy = row.original.ccy || "USD";
      return `${ccy} ${amount.toLocaleString("en-US")}`;
    },
  },
  {
    accessorKey: "created_at",
    header: "Tanggal Pengajuan",
    cell: ({ row }) => {
      return formatDateTime(row.original.created_at)
    }
  },
  {
    accessorKey: "doc_status",
    header: "Status",
    cell: ({ row }) => {
      const status = getUnderlyStatus(row.original);

      switch (status) {
        case "APPROVED":
          return <p className="font-medium text-primary">Disetujui</p>;
        case "REJECTED":
          return <p className="font-medium text-destructive">Ditolak</p>;
        case "PENDING":
          return <p className="font-medium text-amber-500">Menunggu Otorisasi</p>;
        default:
          return <p className="font-medium">-</p>;
      }
    },
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      return (
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/home/underly/${row.original.id}`}
            title="Lihat Detail"
          >
            <Eye className="size-4 text-muted-foreground hover:text-foreground" />
          </Link>
        </Button>
      );
    },
  },
];

export const historyColumns: ColumnDef<UnderlyHistoryResponse>[] = [
  {
    accessorKey: "DocID",
    header: "Kode Underlying",
  },
  {
    accessorKey: "Type",
    header: "Jenis Underlying",
  },
  {
    accessorKey: "BeneficiaryCountry",
    header: "Negara Tujuan",
  },
  {
    accessorKey: "BeneficiaryBank",
    header: "Bank Tujuan",
  },
  {
    accessorKey: "BeneficiaryAccountNo",
    header: "Nomor Rekening Tujuan",
  },
  {
    accessorKey: "BeneficiaryName",
    header: "Nama Penerima",
  },
  {
    accessorKey: "DocType",
    header: "Tipe Dokumen",
  },
  {
    accessorKey: "DocDate",
    header: "Tanggal Dokumen",
  },
  {
    accessorKey: "DocNo",
    header: "Nomor Dokumen",
  },
  {
    accessorKey: "ExpiryDate",
    header: "Tanggal Jatuh Tempo",
    cell: ({ row }) => {
      const expiryDate = row.getValue("ExpiryDate") as string;
      return expiryDate ? formatDate(expiryDate) : "-";
    }
  },
  {
    accessorKey: "AmountApproved",
    header: "Limit Approval",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("AmountApproved"));
      const ccy = row.original.Ccy || "USD";
      return `${ccy} ${amount.toLocaleString("en-US")}`;
    },
  },
  {
    accessorKey: "ActionAt",
    header: "Tanggal Approval",
    cell: ({ row }) => {
      const actionAt = row.getValue("ActionAt") as string;
      return actionAt ? formatDateTime(actionAt) : "-";
    },
  },
  {
    accessorKey: "ActionType",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.ActionType

      switch (status) {
        case "ApproveDoc":
          return <p className="font-medium text-primary">Disetujui</p>;
        case "RejectDoc":
          return <p className="font-medium text-destructive">Ditolak</p>;
        case "SubmitDoc":
          return <p className="font-medium text-amber-500">Menunggu Otorisasi</p>;
        default:
          return <p className="font-medium">-</p>;
      }
    },
  },
  {
    accessorKey: "Note",
    header: "Catatan Approval",
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => {
      const targetId = row.original.DocID;

      return (
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/home/underly/${targetId}`}
            title="Lihat Detail"
          >
            <Eye className="size-4 text-muted-foreground hover:text-foreground" />
          </Link>
        </Button>
      );
    },
  }
];