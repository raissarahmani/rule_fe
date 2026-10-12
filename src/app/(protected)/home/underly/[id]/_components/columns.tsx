"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportUnderlyFile, previewUnderlyFile, UnderlyResponse } from "@/lib/api/underly";

export interface DocItem {
  id: string;
  docId: string;
  filePath: string;
  name: string;
}

export const docColumns: ColumnDef<DocItem>[] = [
  {
    id: "number",
    header: "No.",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "id",
    header: "Nama Dokumen",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const { docId, filePath } = row.original;

      return (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600 hover:text-amber-700"
            onClick={() => previewUnderlyFile(docId, filePath)}
          >
            <Eye className="mr-1 size-4" /> Preview
          </Button>
          <Button
            variant="ghost" 
            size="sm" 
            className="text-primary"
            onClick={() => exportUnderlyFile(docId, filePath)}
          >
            <Download className="mr-1 size-4" /> Download
          </Button>
        </div>
      );
    },
  },
];

export const duplicateColumns: ColumnDef<UnderlyResponse>[] = [
  {
    id: "number",
    header: "No.",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "doc_id",
    header: "Kode Underlying",
    cell: ({ row }) => row.original.id || "-",
  },
  {
    accessorKey: "title",
    header: "Nomor Dokumen",
    cell: ({ row }) => row.original.title ?? "-",
  },
  {
    accessorKey: "beneficiary_bank",
    header: "Bank Tujuan",
    cell: ({ row }) => row.original.beneficiary_bank ?? "-",
  },
  {
    accessorKey: "beneficiary_account_no",
    header: "Nomor Rekening",
    cell: ({ row }) => row.original.beneficiary_account_no ?? "-",
  },
  {
    accessorKey: "beneficiary_name",
    header: "Nama Penerima",
    cell: ({ row }) => row.original.beneficiary_name ?? "-",
  },
  {
    accessorKey: "doc_type",
    header: "Tipe Dokumen",
    cell: ({ row }) => row.original.doc_type ?? "-",
  },
  {
    accessorKey: "expiry_date",
    header: "Tanggal Jatuh Tempo",
    cell: ({ row }) => row.original.expiry_date ?? "-",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: () => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-amber-600"
          title="Preview"
        >
          <Eye className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary"
          title="Download"
        >
          <Download className="size-4" />
        </Button>
      </div>
    ),
  },
];