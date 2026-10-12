"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns, EditableRateData } from "./columns";

interface RateTableProps {
  data: EditableRateData[];
  loading: boolean;
  isEditing: boolean;
  onMarginChange: (
    id: string,
    field: "margin_sell_input" | "margin_buy_input",
    val: string
  ) => void;
}

export function RateTable({
  data,
  loading,
  isEditing,
  onMarginChange,
}: RateTableProps) {
  const columns = useMemo(
    () => getColumns({ isEditing, onMarginChange }),
    [isEditing, onMarginChange]
  );

  return <DataTable columns={columns} data={data} loading={loading} />;
}