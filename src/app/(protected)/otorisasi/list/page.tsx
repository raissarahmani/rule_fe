"use client";

import { useState, useEffect } from "react";
import { isAxiosError } from "axios";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { resolveGlobalLimit } from "@/lib/api/limit";
import { resolveMargin } from "@/lib/api/rate-margin";
import { LimitListTable, RateListTable } from "./_components/table";
import { useAuth } from "@/context/auth-context";
import { canApprove } from "@/lib/permissions";

type AuthorizationType = "all" | "limit" | "rate";
type TabType = "limit" | "rate";

function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function OtorisasiListPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("limit");
  const [authorizationType, setAuthorizationType] = useState<AuthorizationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setReason("");
  };

  const handleResolve = async (status: "Approve" | "Reject", note?: string) => {
    if (!canApprove(user, activeTab)) return;
    if (selectedIds.length === 0) {
      toast.info("Pilih setidaknya satu item untuk diproses");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = (id: string) => ({
        id,
        status,
        ...(note ? { note } : {}),
      });

      if (activeTab === "limit") {
        await Promise.all(
          selectedIds.map((id) => resolveGlobalLimit(payload(id)))
        );
      } else if (activeTab === "rate") {
        await Promise.all(
          selectedIds.map((id) => resolveMargin(payload(id)))
        );
      }

      const actionText = status === "Approve" ? "disetujui" : "ditolak";
      const count = selectedIds.length;
      toast.success(
        `${count} otorisasi ${activeTab === "limit" ? "limit" : "margin"} berhasil ${actionText}`
      );

      setSelectedIds([]);
      setReason("");
      setRejectModalOpen(false);
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Failed to resolve authorization:", error);

      const errorMessage =
        (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
        `Gagal memproses otorisasi. Silakan coba lagi.`;

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Otorisasi Data
      </h1>

      <div className="flex flex-col gap-6">
        {/* Filter and Search Bar */}
        <div className="flex flex-col w-full gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Jenis Otorisasi:
            </span>
            <Select
              value={authorizationType}
              onValueChange={(val) => setAuthorizationType(val as AuthorizationType)}
            >
              <SelectTrigger className="w-100">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="rate">Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-1/2">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari data otorisasi..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={50}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-row gap-8 border-b border-border">
          <p
            onClick={() => handleTabChange("limit")}
            className={cn(
              "cursor-pointer pb-2 text-sm font-medium transition-colors relative",
              activeTab === "limit"
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Daftar Otorisasi Limit
          </p>
          <p
            onClick={() => handleTabChange("rate")}
            className={cn(
              "cursor-pointer pb-2 text-sm font-medium transition-colors relative",
              activeTab === "rate"
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Daftar Otorisasi Rate
          </p>
        </div>

        {/* Tables rendered based on active tab */}
        <div className="mt-2">
          {activeTab === "limit" ? (
            <div className="rounded-md border p-4 text-sm">
              <LimitListTable
                key={refreshKey}
                searchQuery={debouncedSearch}
                authorizationType={authorizationType}
                onSelectionChange={setSelectedIds}
              />
            </div>
          ) : (
            <div className="rounded-md border p-4 text-sm">
              <RateListTable
                key={refreshKey}
                searchQuery={debouncedSearch}
                authorizationType={authorizationType}
                onSelectionChange={setSelectedIds}
              />
            </div>
          )}
        </div>

        {/* Bottom Right Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="destructive"
            disabled={selectedIds.length === 0 || isSubmitting || !canApprove(user, activeTab)}
            onClick={() => setRejectModalOpen(true)}
          >
            Tolak
          </Button>
          <Button
            disabled={selectedIds.length === 0 || isSubmitting || !canApprove(user, activeTab)}
            onClick={() => handleResolve("Approve")}
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Setujui
          </Button>
        </div>

        {/* Rejection Note Modal */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg text-primary">
                Catatan Penolakan
              </DialogTitle>
            </DialogHeader>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              className="min-h-[100px]"
              maxLength={100}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectModalOpen(false);
                  setReason("");
                }}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResolve("Reject", reason)}
                disabled={isSubmitting || !reason.trim()}
              >
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Tolak
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );  
}
