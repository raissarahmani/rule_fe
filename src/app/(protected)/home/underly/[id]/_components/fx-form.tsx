"use client";

import { HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnderlyResponse } from "@/lib/api/underly";

interface UnderlyFormProps {
  data: UnderlyResponse | null;
  expiryDate: string;
  setExpiryDate: (val: string) => void;
  isExpirySame: boolean;
  setIsExpirySame: (val: boolean) => void;
  amountApproved: number | string;
  setAmountApproved: (val: number | string) => void;
  isLimitSame: boolean;
  setIsLimitSame: (val: boolean) => void;
  note: string;
  setNote: (val: string) => void;
}

const formatNumber = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === "") return "";
  const cleanNumber = String(val).replace(/,/g, "");
  if (isNaN(Number(cleanNumber))) return "";
  return Number(cleanNumber).toLocaleString("en-US");
};

const formatDateDisplay = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "-";

  const cleanStr = dateStr.split("T")[0];
  const parts = cleanStr.split("-");

  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${month}/${day}/${year}`;
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
};

export default function UnderlyFXForm({
  data,
  expiryDate,
  setExpiryDate,
  isExpirySame,
  setIsExpirySame,
  amountApproved,
  setAmountApproved,
  isLimitSame,
  setIsLimitSame,
  note,
  setNote,
}: UnderlyFormProps) {
  const isPending = data?.doc_status?.toLowerCase() === "pending";
  const isApproved = data?.doc_status?.toLowerCase() === "approved";

  const currentExpiry = isPending
    ? isExpirySame
      ? (data?.expiry_date ?? "")
      : expiryDate
    : (data?.expiry_date ?? expiryDate);

  const currentAmount = isPending
    ? isLimitSame
      ? (data?.amount_submitted ?? "")
      : amountApproved
    : isApproved && data?.amount_approved !== undefined
    ? data.amount_approved
    : amountApproved;

  const formattedAmount = formatNumber(currentAmount);

  const expiryCheckboxChecked = isPending
    ? isExpirySame
    : isApproved
    ? data?.expiry_date === expiryDate
    : false;

  const limitCheckboxChecked = isPending
    ? isLimitSame
    : isApproved && data?.amount_approved !== undefined
    ? data.amount_approved === data.amount_submitted
    : false;

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div className="border-b pb-3">
        <p className="text-base font-medium text-emerald-600">
          Informasi Underlying
        </p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-foreground">
        <span>Jenis underlying</span>
        <span className="font-semibold">Pembelian Valas</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Kode Underlying</Label>
          <Input value={data?.id || "-"} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Tipe Dokumen</Label>
          <Input value={data?.doc_type ?? "-"} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Nomor Dokumen</Label>
          <Input value={data?.title ?? "-"} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Tanggal Dokumen</Label>
          <Input value={formatDateDisplay(data?.expiry_date) || "-"} disabled />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Limit Pengajuan</Label>
          <div className="flex gap-2">
            <Input value={data?.ccy ?? "IDR"} disabled className="w-24" />
            <Input
              value={
                data?.amount_submitted !== undefined && data?.amount_submitted !== null
                  ? data.amount_submitted.toLocaleString("en-US")
                  : "0"
              }
              disabled
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="same-limit"
              checked={limitCheckboxChecked}
              disabled={!isPending}
              onCheckedChange={(checked) => {
                if (!isPending) return;
                const checkedState = !!checked;
                setIsLimitSame(checkedState);
                if (checkedState)
                  setAmountApproved(data?.amount_submitted ?? 0);
              }}
            />
            <Label
              htmlFor="same-limit"
              className="cursor-pointer text-xs font-normal"
            >
              Nilai limit pengajuan = nilai limit approval
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Label>Limit Approval</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="size-4 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Limit approval dapat berbeda dari limit pengajuan
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            type="text"
            placeholder="0"
            value={formattedAmount}
            onChange={(e) => {
              const rawVal = e.target.value.replace(/[^0-9]/g, "");
              setAmountApproved(rawVal);
            }}
            disabled={!isPending || isLimitSame}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Tanggal Jatuh Tempo</Label>
          <Input
            type="date"
            value={currentExpiry}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={!isPending || isExpirySame}
          />
          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="same-expiry"
              checked={expiryCheckboxChecked}
              disabled={!isPending}
              onCheckedChange={(checked) => {
                if (!isPending) return;
                const checkedState = !!checked;
                setIsExpirySame(checkedState);
                if (checkedState) {
                  setExpiryDate(formatDateDisplay(data?.expiry_date) ?? "");
                } else {
                  setExpiryDate("");
                }
              }}
            />
            <Label
              htmlFor="same-expiry"
              className="cursor-pointer text-xs font-normal"
            >
              Tanggal jatuh tempo tetap sama
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Catatan Approval</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={!isPending}
            maxLength={255}
          />
        </div>
      </div>
    </Card>
  );
}