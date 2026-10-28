"use client";

import { useEffect, useState } from "react";
import { Pencil, Search, User, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getGlobalLimit,
  getApprovedLimitHistory,
  LimitResponse,
  LimitHistoryResponse,
} from "@/lib/api/limit";
import { formatDateTime } from "@/lib/utils/date";
import { LimitTable } from "./_components/table";
import { EditLimitDialog } from "./_components/edit-modal";
import { useAuth } from "@/context/auth-context";
import { canEdit } from "@/lib/permissions";

export default function LimitPage() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<LimitResponse[]>([]);
  const [history, setHistory] = useState<LimitHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [limitData, historyData] = await Promise.all([
        getGlobalLimit(),
        getApprovedLimitHistory(),
      ]);
      setLimits(limitData || []);
      setHistory(historyData || []);
    } catch (error) {
      console.error("Failed to fetch limit data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [limitData, historyData] = await Promise.all([
          getGlobalLimit(),
          getApprovedLimitHistory(),
        ]);
        if (isMounted) {
          setLimits(limitData || []);
          setHistory(historyData || []);
        }
      } catch (error) {
        console.error("Failed to fetch limit data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSuccess = () => {
    loadData();
  };

  const fxLimit = limits.find((item) => item.trx_type === "FX");
  const remittanceLimit = limits.find((item) => item.trx_type === "REMITTANCE");

  const filteredHistory = history.filter((item) =>
    Object.values(item).some((val) =>
      String(val ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    ),
  );

  const formatCurrency = (val?: number) =>
    val !== undefined ? val.toLocaleString("en-US") : "0";

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="border-b pb-3 text-2xl font-semibold">Limit</h1>
      <div className="flex flex-col gap-3">
        <h2 className="text-md font-semibold">Limit saat ini</h2>
        <Card className="p-6">
          <CardContent className="flex flex-col gap-6 p-0 md:flex-row md:items-stretch md:justify-between">
            <div className="flex w-1/2 flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  LIMIT AKTIF
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="mr-1 size-3" /> Active
                </Badge>
              </div>
              <div className="rounded-md border bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">
                  Limit Global Jual Beli
                </p>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {loading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    `${formatCurrency(fxLimit?.amount)} ${fxLimit?.ccy || "USD"}`
                  )}
                </div>
              </div>
              <div className="rounded-md border bg-card p-4 shadow-sm">
                <p className="text-xs font-medium text-muted-foreground">
                  Limit Global Remittance
                </p>
                <div className="mt-1 text-xl font-bold text-foreground">
                  {loading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    `${formatCurrency(remittanceLimit?.amount)} ${remittanceLimit?.ccy || "USD"}`
                  )}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col justify-between border-t pt-4 md:w-1/3 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  INFORMASI PERUBAHAN
                </p>
                <div className="mt-3 flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Terakhir diubah oleh:
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <User className="size-3.5 text-muted-foreground" />
                      {limits[0]?.user_submit || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Tanggal diubah:{" "}
                    </span>
                    <span className="font-medium">
                      {formatDateTime(limits[0]?.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-end">
                <Button
                  className="w-full md:w-auto"
                  onClick={() => setDialogOpen(true)}
                  disabled={!canEdit(user, "limit")}
                >
                  <Pencil className="mr-2 size-4" /> Edit Limit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <h2 className="text-lg font-semibold">Riwayat Perubahan</h2>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <LimitTable data={filteredHistory} loading={loading} />
      </div>

      <EditLimitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        limits={limits}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
