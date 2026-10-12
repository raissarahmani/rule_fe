"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { MarginHistoryDetailResponse } from "@/lib/api/rate-margin";

interface MarginDetailCardProps {
  data: MarginHistoryDetailResponse;
}

export function MarginDetailCard({ data }: MarginDetailCardProps) {
  return (
    <Card className="p-3">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-primary font-medium text-base">
          Informasi Data Otorisasi
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {/* Data Sekarang */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-foreground">Data Sekarang</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nilai limit sebelum pengajuan otorisasi dilakukan.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 bg-muted/30 p-4 rounded-lg">
            <div>
              <p className="text-foreground font-medium">Rate Jual BCA</p>
              <p className="text-foreground">
                {data.base_sell_rate
                  ? `${data.base_sell_rate.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Rate Beli BCA</p>
              <p className="text-foreground">
                {data.base_buy_rate
                  ? `${data.base_buy_rate.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Valuta</p>
              <p className="text-foreground">
                {data.source_ccy}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Margin Jual</p>
              <p className="text-foreground">
                {data.margin_sell_existing
                  ? `${data.margin_sell_existing.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Margin Beli</p>
              <p className="text-foreground">
                {data.margin_buy_existing
                  ? `${data.margin_buy_existing.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Rate Jual</p>
              <p className="text-foreground">
                {data.final_sell_rate_before
                  ? `${data.final_sell_rate_before.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Rate Beli</p>
              <p className="text-foreground">
                {data.final_buy_rate_before
                  ? `${data.final_buy_rate_before.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
          </div>
        </div>
        {/* Data Baru */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-foreground">Data Baru</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nilai limit baru yang diajukan untuk disetujui.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 bg-muted/30 p-4 rounded-lg">
            <div>
              <p className="text-foreground font-medium">Rate Jual BCA</p>
              <p className="text-foreground">
                {data.base_sell_rate
                  ? `${data.base_sell_rate.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Rate Beli BCA</p>
              <p className="text-foreground">
                {data.base_buy_rate
                  ? `${data.base_buy_rate.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Valuta</p>
              <p className="text-foreground">
                {data.source_ccy}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Margin Jual</p>
              <p className="text-foreground">
                {data.margin_sell_requested
                  ? `${data.margin_sell_requested.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Margin Beli</p>
              <p className="text-foreground">
                {data.margin_buy_requested
                  ? `${data.margin_buy_requested.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Rate Jual</p>
              <p className="text-foreground">
                {data.final_sell_rate_after
                  ? `${data.final_sell_rate_after.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Rate Beli</p>
              <p className="text-foreground">
                {data.final_buy_rate_after
                  ? `${data.final_buy_rate_after.toLocaleString("id-ID")}`
                  : `0`}
              </p>
            </div>
          </div>
        </div>
        {/* Komentar */}
        <div className="space-y-1">
          <p className="text-muted-foreground">Komentar</p>
          <p className="font-medium text-foreground">
            {data.note || "-"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
