"use client";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { docColumns } from "./columns";

interface DocumentCardProps {
  data: {
    id: string;
    path_to_file: string[];
  } | null;
}

export default function DocumentCard({ data }: DocumentCardProps) {
  if (!data || !data.path_to_file?.length) return null;
  
  return (
    <Card className="flex flex-col gap-4 p-6">
      <p className="border-b pb-3 text-base font-medium text-primary">
        Dokumen
      </p>
      <DataTable 
        columns={docColumns} 
        data={data.path_to_file.map((path, index) => ({ 
          id: `${data.id}-${index + 1}`, 
          docId: data.id, 
          filePath: path, 
          name: `Dokumen ${index + 1}` 
        }))} 
      />
    </Card>
  );
}