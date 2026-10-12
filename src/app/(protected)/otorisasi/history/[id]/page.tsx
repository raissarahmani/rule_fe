"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

import { getLimitHistoryById, LimitHistoryJoinedResponse } from "@/lib/api/limit";
import { getMarginHistoryById, MarginHistoryDetailResponse } from "@/lib/api/rate-margin";
import { formatDateTime } from "@/lib/utils/date";

import { LimitDetailCard } from "./_components/limit-history";
import { MarginDetailCard } from "./_components/margin-history";

type UnifiedDetail =
  | { type: "limit"; data: LimitHistoryJoinedResponse }
  | { type: "margin"; data: MarginHistoryDetailResponse }
  | null;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function HistoryDetail({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type")?.toLowerCase();
  const { id } = use(params);

  const [detail, setDetail] = useState<UnifiedDetail>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      const cleanId = id?.split("?")[0];
      if (!cleanId) return;
      setLoading(true);

      try {
        if (typeParam === "limit") {
          const res = await getLimitHistoryById(cleanId);
          setDetail(res ? { type: "limit", data: res } : null);
        } else {
          const res = await getMarginHistoryById(cleanId);
          setDetail(res ? { type: "margin", data: res } : null);
        }
      } catch (error) {
        console.error("Failed to fetch detail:", error);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id, typeParam]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-44 mb-4" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6 space-y-6">
          <Skeleton className="h-6 w-44" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </Card>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/otorisasi/history">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">Detail Otorisasi</h1>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center border rounded-lg bg-background">
          <p className="text-muted-foreground">Data otorisasi tidak ditemukan.</p>
          <Button variant="outline" onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const { type, data } = detail;
  const statusUpper = (data.action_type || "").toUpperCase();
  const isApproved = statusUpper === "APPROVE";

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* HEADER */}
        <div className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/otorisasi/history">
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">Detail Otorisasi</h1>
        </div>

        {/* CARD 1: INFORMASI OTORISASI */}
        <Card className="p-3">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-primary font-medium">Informasi Otorisasi</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm mt-4">
              <div className="flex flex-col">
                <p className="text-muted-foreground">Jenis Otorisasi</p>
                <p className="font-medium uppercase">{type === "limit" ? "LIMIT" : "RATE"}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground">Diajukan oleh</p>
                <p className="font-medium">{data.requested_by || "-"}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground">Tanggal Pengajuan</p>
                <p className="font-medium">{formatDateTime(data.requested_at ?? "") || "-"}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground">Tanggal Otorisasi</p>
                <p className="font-medium">{formatDateTime(data.created_at) || "-"}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-muted-foreground">Status</p>
                <div>
                  <p className={isApproved ? "text-primary" : "text-destructive"}>
                    {isApproved ? "Disetujui" : "Ditolak"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: DETAILS BY TYPE */}
        {type === "limit" ? (
          <LimitDetailCard data={data as LimitHistoryJoinedResponse} />
        ) : (
          <MarginDetailCard data={data as MarginHistoryDetailResponse} />
        )}

        {/* BOTTOM ACTION BUTTON */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Kembali
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}