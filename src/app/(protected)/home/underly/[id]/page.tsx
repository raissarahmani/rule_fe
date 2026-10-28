"use client";

import { use, useState, useEffect } from "react";
import { isAxiosError } from "axios";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { canApprove } from "@/lib/permissions";
import UnderlyORForm from "./_components/or-form";
import UnderlyFXForm from "./_components/fx-form";
import DocumentCard from "./_components/doc-section";
import DuplicateDoc from "./_components/duplicate-section";
import {
  getUnderlyById,
  getSimilarUnderly,
  updateStatusUnderly,
  UnderlyResponse,
  DuplicateUnderlyResponse,
  UpdateStatusUnderlyRequest,
} from "@/lib/api/underly";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UnderlyDetailPage({ params }: PageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const docId = resolvedParams.id;

  const [data, setData] = useState<UnderlyResponse | null>(null);
  const [duplicateData, setDuplicateData] = useState<DuplicateUnderlyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expiryDate, setExpiryDate] = useState<string>("");
  const [isExpirySame, setIsExpirySame] = useState<boolean>(true);
  const [amountApproved, setAmountApproved] = useState<number | string>("");
  const [isLimitSame, setIsLimitSame] = useState<boolean>(true);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      if (!docId) return;
      try {
        setLoading(true);
        const [resDetail, resDuplicate] = await Promise.all([
          getUnderlyById(docId),
          getSimilarUnderly(docId),
        ]);

        setData(resDetail);
        setDuplicateData(resDuplicate);

        if (resDetail) {
          setExpiryDate(resDetail.expiry_date ?? "");
          setAmountApproved(resDetail.amount_submitted ?? 0);
        }
      } catch (error) {
        console.error("Failed to fetch underlying details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [docId]);

  const handleUpdateStatus = async (status: "APPROVED" | "REJECTED") => {
    if (!docId || !data || !canApprove(user, "underlying")) return;

    try {
      setIsSubmitting(true);

      const finalExpiry = isExpirySame
        ? data.expiry_date ?? ""
        : expiryDate;

      const strExpiry = new Date(finalExpiry).toISOString();

      const finalAmount = isLimitSame
        ? data.amount_submitted ?? 0
        : Number(amountApproved);

      const payload: UpdateStatusUnderlyRequest = {
        doc_id: docId,
        status,
        expiry_date: strExpiry,
        amount_approved: finalAmount,
        note: note || undefined,
      };

      await updateStatusUnderly(payload);

      const isApprove = status === "APPROVED";
      toast.success(
        isApprove
          ? "Dokumen underlying berhasil disetujui"
          : "Dokumen underlying berhasil ditolak"
      );

      router.push("/home/underly");
    } catch (error: unknown) {
      console.error(`Failed to ${status.toLowerCase()} underlying:`, error);

      const errorMessage =
        (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
        `Gagal memproses otorisasi underlying. Silakan coba lagi.`;

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>

        <Skeleton className="h-16 w-full rounded-xl" />

        <Card className="flex flex-col gap-6 p-6">
          <Skeleton className="h-6 w-44" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-32 w-full" />
        </Card>


        <Card className="flex flex-col gap-4 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/home/underly">
            <ArrowLeftIcon className="size-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          Detail Underlying
        </h1>
      </div>

      {duplicateData?.is_duplicate && (
        <Card className="flex flex-row items-start gap-3 border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertCircleIcon className="mt-0.5 size-5 flex-shrink-0 text-amber-600" />
          <p className="text-sm font-medium">
            Data underlying dengan kombinasi Negara Tujuan, Nomor Rekening, dan
            Tipe Dokumen yang sama sudah terdaftar. Silahkan periksa kembali data
            yang akan anda otorisasi.
          </p>
        </Card>
      )}

      {data?.type?.toUpperCase() === "REMITTANCE" && (
        <UnderlyORForm
          data={data}
          expiryDate={expiryDate}
          setExpiryDate={setExpiryDate}
          isExpirySame={isExpirySame}
          setIsExpirySame={setIsExpirySame}
          amountApproved={amountApproved}
          setAmountApproved={setAmountApproved}
          isLimitSame={isLimitSame}
          setIsLimitSame={setIsLimitSame}
          note={note}
          setNote={setNote}
        />
      )}

      {data?.type?.toUpperCase() === "FX" && (
        <UnderlyFXForm
          data={data}
          expiryDate={expiryDate}
          setExpiryDate={setExpiryDate}
          isExpirySame={isExpirySame}
          setIsExpirySame={setIsExpirySame}
          amountApproved={amountApproved}
          setAmountApproved={setAmountApproved}
          isLimitSame={isLimitSame}
          setIsLimitSame={setIsLimitSame}
          note={note}
          setNote={setNote}
        />
      )}

      <DocumentCard data={data} />

      {duplicateData?.is_duplicate && (
        <DuplicateDoc data={duplicateData.similar_docs ?? []} />
      )}

      {data?.doc_status?.toLowerCase() === "pending" && canApprove(user, "underlying") && (
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => handleUpdateStatus("REJECTED")}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tolak
          </Button>
          <Button
            className="bg-primary"
            disabled={isSubmitting}
            onClick={() => handleUpdateStatus("APPROVED")}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Setujui
          </Button>
        </div>
      )}
    </div>
  );
}
