"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner"
import { LimitResponse, updateGlobalLimit } from "@/lib/api/limit";
import { Loader2 } from "lucide-react";

interface EditLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limits: LimitResponse[];
  onSuccess: () => void;
}

export function EditLimitDialog({
  open,
  onOpenChange,
  limits,
  onSuccess,
}: EditLimitDialogProps) {
  const fxLimit = limits.find((item) => item.trx_type === "FX");
  const remittanceLimit = limits.find((item) => item.trx_type === "REMITTANCE");
  const [prevOpen, setPrevOpen] = useState(open);

  const [fxAmount, setFxAmount] = useState<string>("0");
  const [fxNoChange, setFxNoChange] = useState<boolean>(false);

  const [remittanceAmount, setRemittanceAmount] = useState<string>("0");
  const [remittanceNoChange, setRemittanceNoChange] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFxAmount("0");
      setFxNoChange(false);
      setRemittanceAmount("0");
      setRemittanceNoChange(false);
    }
  }

  const handleSave = async () => {
    setSubmitting(true);
    const apiCalls: Promise<any>[] = [];

    if (!fxNoChange && fxLimit && fxAmount) {
      apiCalls.push(
        updateGlobalLimit({
          id: fxLimit.id,
          amount_requested: parseFloat(fxAmount),
        })
      );
    }

    if (!remittanceNoChange && remittanceLimit && remittanceAmount) {
      apiCalls.push(
        updateGlobalLimit({
          id: remittanceLimit.id,
          amount_requested: parseFloat(remittanceAmount),
        })
      );
    }

    if (apiCalls.length === 0) {
      toast.info("Tidak ada perubahan untuk disimpan");
      setSubmitting(false);
      return;
    }

    try {
      await Promise.all(apiCalls);

      toast.success("Berhasil mengirim permintaan edit limit");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Gagal mengirim permintaan edit limit:", error);

      const errorMessage =
        error?.response?.data?.message ||
        "Gagal mengirim permintaan edit limit. Silakan coba lagi.";

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-primary font-semibold">
            Edit Limit
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Limit global jual beli
            </span>
            <div className="flex items-center gap-2">
              <Input
                value={fxLimit?.ccy || "USD"}
                disabled
                className="w-24 bg-muted text-center"
              />
              <Input
                type="number"
                placeholder="0"
                value={fxAmount}
                disabled={fxNoChange || submitting}
                onChange={(e) => setFxAmount(e.target.value)}
                className="flex-1"
                maxLength={10}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="fx-no-change"
                checked={fxNoChange}
                onCheckedChange={(checked) => setFxNoChange(Boolean(checked))}
              />
              <label
                htmlFor="fx-no-change"
                className="cursor-pointer select-none text-xs text-muted-foreground"
              >
                Tidak ada perubahan
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Limit global remittance
            </span>
            <div className="flex items-center gap-2">
              <Input
                value={remittanceLimit?.ccy || "USD"}
                disabled
                className="w-24 bg-muted text-center"
              />
              <Input
                type="number"
                placeholder="0"
                value={remittanceAmount}
                disabled={remittanceNoChange || submitting}
                onChange={(e) => setRemittanceAmount(e.target.value)}
                className="flex-1"
                maxLength={10}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="remittance-no-change"
                checked={remittanceNoChange}
                onCheckedChange={(checked) =>
                  setRemittanceNoChange(Boolean(checked))
                }
              />
              <label
                htmlFor="remittance-no-change"
                className="cursor-pointer select-none text-xs text-muted-foreground"
              >
                Tidak ada perubahan
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}