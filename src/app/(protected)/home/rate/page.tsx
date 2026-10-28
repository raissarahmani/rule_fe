"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Pencil,
  Save,
  Search,
  RefreshCw,
  FileText,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getFinalRate,
  updateMargin,
  exportRate,
  UpdateMarginRequest,
} from "@/lib/api/rate-margin";
import { formatDateTime } from "@/lib/utils/date";
import { RateTable } from "./_components/table";
import { EditableRateData } from "./_components/columns";
import { useAuth } from "@/context/auth-context";
import { canEdit } from "@/lib/permissions";

export default function RatePage() {
  const { user } = useAuth();
  const [rates, setRates] = useState<EditableRateData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>("-");

  const fetchRates = useCallback(async () => {
    try {
      const data = await getFinalRate();
      if (data && data.length > 0) {
        const formattedData: EditableRateData[] = data.map((item) => ({
          ...item,
          margin_sell_input: item.margin_sell ?? 0,
          margin_buy_input: item.margin_buy ?? 0,
        }));

        setRates(formattedData);

        const timestamp = data[0].last_polled_at || new Date().toISOString();
        setLastUpdate(formatDateTime(timestamp));
      }
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // useEffect(() => {
  //   let isMounted = true;

  //   getFinalRate()
  //     .then((data) => {
  //       if (isMounted) {
  //         const formattedData: EditableRateData[] = (data || []).map((item) => ({
  //           ...item,
  //           margin_sell_input: item.margin_sell ?? 0,
  //           margin_buy_input: item.margin_buy ?? 0,
  //         }));

  //         setRates(formattedData);
  //         setLastUpdate(formatDateTime(new Date().toISOString()));
  //       }
  //     })
  //     .catch((error) => {
  //       console.error("Failed to fetch rates on mount:", error);
  //     })
  //     .finally(() => {
  //       if (isMounted) {
  //         setLoading(false);
  //       }
  //     });

  //   return () => {
  //     isMounted = false;
  //   };
  // }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (isMounted) {
        await fetchRates();
      }
    };

    loadInitialData();

    const interval = setInterval(() => {
      if (isMounted) {
        fetchRates();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchRates]);

  const handleMarginChange = (
    id: string,
    field: "margin_sell_input" | "margin_buy_input",
    val: string
  ) => {
    setRates((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: val } : item
      )
    );
  };

  const handleToggleEdit = async () => {
    if (!canEdit(user, "rate")) return;
    if (isEditing) {
      try {
        setSubmitting(true);

        const updatePromises = rates
          .filter((item) => {
            const sellChanged =
              item.margin_sell_input !== undefined &&
              Number(item.margin_sell_input) !== item.margin_sell;
            const buyChanged =
              item.margin_buy_input !== undefined &&
              Number(item.margin_buy_input) !== item.margin_buy;

            return sellChanged || buyChanged;
          })
          .map((item) => {
            const payload: UpdateMarginRequest = {
              id: item.id,
              margin_sell: Number(item.margin_sell_input) ?? item.margin_sell,
              margin_buy: Number(item.margin_buy_input) ?? item.margin_buy,
            };

            return updateMargin(payload);
          });

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);

          toast.success("Success!", {
            description: "Permintaan perubahan margin berhasil dikirim dan dalam proses otorisasi",
          });
        }

        setIsEditing(false);
        await fetchRates();
      } catch (error) {
        console.error("Failed to save rate configuration:", error);
        toast.error("Gagal", {
          description: "Permintaan perubahan margin gagal dikirim. Silakan coba lagi.",
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      setIsEditing(true);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchRates();
  };

  const handleExportRate = async () => {
    try {
      await exportRate();
      toast.success("Success", {
        description: "Laporan PDF rate berhasil diunduh.",
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast.error("Gagal", {
        description: "Gagal mengunduh laporan PDF. Silakan coba lagi.",
      });
    }
  };

  const filteredRates = rates.filter((item) =>
    Object.values(item).some((val) =>
      String(val ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header & Search */}
      <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold tracking-tight">Menu Rate</h1>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari Mata Uang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            maxLength={20}
          />
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Left Side: Table Card */}
        <Card className="flex-1 p-6">
          <div className="mb-4 flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {isEditing
                ? "Edit Konfigurasi Rate Harian"
                : "Konfigurasi Rate Harian"}
            </h2>
            <Button
              onClick={handleToggleEdit}
              disabled={submitting || loading || !canEdit(user, "rate")}
              variant="default"
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : isEditing ? (
                <Save className="mr-2 size-4" />
              ) : (
                <Pencil className="mr-2 size-4" />
              )}
              {isEditing ? "Simpan Perubahan" : "Edit Data"}
            </Button>
          </div>

          <RateTable
            data={filteredRates}
            loading={loading}
            isEditing={isEditing}
            onMarginChange={handleMarginChange}
          />
        </Card>

        {/* Right Side: Status Cards */}
        <div className="flex flex-col gap-4 lg:w-80">
          <Card className="p-4">
            <CardContent className="flex flex-col gap-3 p-0">
              <div className="border-b pb-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Update Terakhir
                </p>
                <p className="mt-1 text-sm font-semibold text-emerald-800">{lastUpdate} WIB</p>
                <Button
                  variant="default"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw
                    className={`mr-2 size-3.5 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh Rate BCA
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Catatan: <br />
                Rate BCA diperbarui otomatis setiap 1 menit dari API BCA. Perubahan margin akan langsung berdampak pada transaksi nasabah.
              </p>
            </CardContent>
          </Card>

          <Card className="p-4">
            <CardContent className="flex flex-col gap-3 p-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Quick Reports
              </p>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleExportRate}
              >
                <FileText className="mr-2 size-4 text-muted-foreground" />
                Download Rate PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
