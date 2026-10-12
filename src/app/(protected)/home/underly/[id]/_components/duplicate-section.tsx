"use client";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { UnderlyResponse } from "@/lib/api/underly";
import { duplicateColumns } from "./columns";

interface DuplicateDocProps {
  data: UnderlyResponse[];
}

export default function DuplicateDoc({ data }: DuplicateDocProps) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <p className="border-b pb-3 text-base font-medium text-primary">
        Daftar Dokumen Duplikasi
      </p>
      <DataTable columns={duplicateColumns} data={data} />
    </Card>
  );
}