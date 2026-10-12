"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { LimitHistoryJoinedResponse } from "@/lib/api/limit";

interface LimitDetailCardProps {
  data: LimitHistoryJoinedResponse;
}

export function LimitDetailCard({ data }: LimitDetailCardProps) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
            <div>
              <p className="text-foreground font-medium">Limit Global Jual Beli</p>
              <p className="text-foreground">
                {data.fx_amount_before
                  ? `${data.fx_amount_before.toLocaleString("id-ID")} ${
                      data.ccy
                    }`
                  : `0 ${data.ccy}`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Limit Global Remittance</p>
              <p className="text-foreground">
                {data.remittance_amount_before
                  ? `${data.remittance_amount_before.toLocaleString("id-ID")} ${
                      data.ccy
                    }`
                  : `0 ${data.ccy}`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
            <div>
              <p className="text-foreground font-medium">Limit Global Jual Beli</p>
              <p className="text-foreground">
                {data.fx_amount_after
                  ? `${data.fx_amount_after.toLocaleString("id-ID")} ${
                      data.ccy
                    }`
                  : `0 ${data.ccy}`}
              </p>
            </div>
            <div>
              <p className="text-foreground font-medium">Limit Global Remittance</p>
              <p className="text-foreground">
                {data.remittance_amount_after
                  ? `${data.remittance_amount_after.toLocaleString("id-ID")} ${
                      data.ccy
                    }`
                  : `0 ${data.ccy}`}
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
