"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { FinalRateResponse } from "@/lib/api/rate-margin";
import ReactCountryFlag from "react-country-flag";
import { Lock } from "lucide-react";

export interface EditableRateData extends FinalRateResponse {
  margin_sell_input?: number | string;
  margin_buy_input?: number | string;
}

interface ColumnProps {
  isEditing: boolean;
  onMarginChange: (
    id: string,
    field: "margin_sell_input" | "margin_buy_input",
    val: string
  ) => void;
}

function getCurrencyName(currencyCode: string, locale = "en-US"): string {
  try {
    const isoCodeMap: Record<string, string> = {
      CNH: "CNY",
      RMB: "CNY",
    };
    const targetCode = isoCodeMap[currencyCode] || currencyCode;
    const displayNames = new Intl.DisplayNames([locale], { type: "currency" });
    return displayNames.of(targetCode) || currencyCode;
  } catch {
    return currencyCode;
  }
}

const ccyToCountryCode: Record<string, string> = {
  USD: "US",
  JPY: "JP",
  GBP: "GB",
  EUR: "EU",
  CNH: "CN",
  SGD: "SG",
  AUD: "AU",
  HKD: "HK",
};

const formatNumber = (val?: number) =>
  val !== undefined ? val.toLocaleString("en-US") : "0";

export const getColumns = ({
  isEditing,
  onMarginChange,
}: ColumnProps): ColumnDef<EditableRateData, unknown>[] => [
  {
    accessorKey: "source_ccy",
    header: "Mata Uang",
    cell: ({ row }) => {
      const ccy = row.original.source_ccy;
      const countryCode = ccyToCountryCode[ccy] || ccy.slice(0, 2);
      const fullName = getCurrencyName(ccy, "en-US");

      return (
        <div className="flex items-center gap-2.5 w-50">
          <ReactCountryFlag
            countryCode={countryCode}
            svg
            style={{ width: "1.8em", height: "1.2em", borderRadius: "0.375rem" }}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-foreground leading-tight">{ccy}</span>
            <span className="text-xs text-muted-foreground">{fullName}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "base_sell_rate",
    header: "Rate Jual BCA",
    cell: ({ row }) => (
      <div className="flex justify-between items-center gap-1.5 text-muted-foreground">
        <span>{formatNumber(row.original.base_sell_rate)}</span>
        <Lock className="size-3.5 opacity-70" />
      </div>
    ),
  },
  {
    accessorKey: "base_buy_rate",
    header: "Rate Beli BCA",
    cell: ({ row }) => (
      <div className="flex justify-between items-center gap-1.5 text-muted-foreground">
        <span>{formatNumber(row.original.base_buy_rate)}</span>
        <Lock className="size-3.5 opacity-70" />
      </div>
    ),
  },
  {
    accessorKey: "margin_sell",
    header: "Margin Jual",
    cell: ({ row }) => {
      if (isEditing) {
        return (
          <Input
            type="number"
            step="any"
            className="h-8 w-28"
            value={row.original.margin_sell_input ?? ""}
            onChange={(e) =>
              onMarginChange(row.original.id, "margin_sell_input", e.target.value)
            }
          />
        );
      }
      return formatNumber(row.original.margin_sell);
    },
  },
  {
    accessorKey: "margin_buy",
    header: "Margin Beli",
    cell: ({ row }) => {
      if (isEditing) {
        return (
          <Input
            type="number"
            step="any"
            className="h-8 w-28"
            value={row.original.margin_buy_input ?? ""}
            onChange={(e) =>
              onMarginChange(row.original.id, "margin_buy_input", e.target.value)
            }
          />
        );
      }
      return formatNumber(row.original.margin_buy);
    },
  },
  {
    accessorKey: "final_sell_rate",
    header: "Rate Jual",
    cell: ({ row }) => (
      <span className="font-semibold text-emerald-800 dark:text-emerald-400">
        {formatNumber(row.original.final_sell_rate)}
      </span>
    ),
  },
  {
    accessorKey: "final_buy_rate",
    header: "Rate Beli",
    cell: ({ row }) => (
      <span className="font-semibold text-emerald-800 dark:text-emerald-400">
        {formatNumber(row.original.final_buy_rate)}
      </span>
    ),
  },
];