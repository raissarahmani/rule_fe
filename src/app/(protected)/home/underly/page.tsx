"use client";

import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAllUnderly,
  getUnderlyHistory,
  getUnderlyStat,
  UnderlyResponse,
  EnrichedUnderlyHistory,
  UnderlyStatResponse,
  UnderlyParam
} from "@/lib/api/underly";
import { cn } from "@/lib/utils";
import { StatCard } from "./_components/card";
import { UnderlyingTable } from "./_components/table";
import { columns, historyColumns } from "./_components/columns"

type TabType = "list" | "history";

export default function UnderlyingPage() {
  const [listData, setListData] = useState<UnderlyResponse[]>([]);
  const [historyData, setHistoryData] = useState<EnrichedUnderlyHistory[]>([]);
  const [stats, setStats] = useState<UnderlyStatResponse>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("list");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const apiParams: UnderlyParam = {
          type: selectedType !== "ALL" ? selectedType : undefined,
          search: debouncedSearch.length > 0 ? debouncedSearch : undefined,
        };

        if (activeTab === "list") {
          const [listRes, statRes] = await Promise.all([
            getAllUnderly(apiParams),
            getUnderlyStat({ type: apiParams.type }),
          ]);

          setListData(listRes || []);
          updateStats(statRes);
        } else {
          const [historyRes, statRes] = await Promise.all([
            getUnderlyHistory(apiParams),
            getUnderlyStat({ type: apiParams.type }),
          ]);

          const enrichedHistory: EnrichedUnderlyHistory[] = (historyRes || []).map(
            (historyItem) => {
              const matchingDoc = listData.find(
                (doc) => doc.id === historyItem.DocID
              );

              return {
                ...matchingDoc,
                ...historyItem,
                submitted_at: matchingDoc?.created_at,
                action_at: historyItem.CreatedAt,
              };
            }
          );

          setHistoryData(enrichedHistory);
          updateStats(statRes);
        }
      } catch (error) {
        console.error("Failed to fetch underlying data:", error);
      } finally {
        setLoading(false);
      }
    }

    function updateStats(statRes: any) {
      const rawStat = Array.isArray(statRes) ? statRes[0] : statRes;
      if (rawStat) {
        setStats({
          total: rawStat.total ?? 0,
          pending: rawStat.pending ?? 0,
          approved: rawStat.approved ?? 0,
          rejected: rawStat.rejected ?? 0,
        });
      }
    }

    fetchData();
  }, [selectedType, debouncedSearch, activeTab]);

  const currentTabRawData = activeTab === "list" ? listData : historyData;

  const displayedData = useMemo(() => {
    if (!debouncedSearch) return currentTabRawData;

    const query = debouncedSearch.toLowerCase();
    return currentTabRawData.filter((item: any) => {
      return Object.entries(item).some(([, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === "object") return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [currentTabRawData, debouncedSearch]);

  return (
    <div className="flex flex-col gap-6 p-6 w-full min-w-0 max-w-full overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-semibold tracking-tight">Underlying</h1>
        
        <div className="flex items-center gap-3">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Jenis Underlying" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Jenis</SelectItem>
              <SelectItem value="REMITTANCE">Outward Remittance</SelectItem>
              <SelectItem value="FX">Pembelian Valas</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Dokumen"
          value={stats.total}
          loading={loading}
        />
        <StatCard
          label="Menunggu Otorisasi"
          value={stats.pending}
          loading={loading}
          valueClassName="text-amber-500"
        />
        <StatCard
          label="Disetujui"
          value={stats.approved}
          loading={loading}
          valueClassName="text-primary"
        />
        <StatCard
          label="Ditolak"
          value={stats.rejected}
          loading={loading}
          valueClassName="text-destructive"
        />
      </div>

      <div className="flex flex-col gap-4 w-full min-w-0">
        <div className="flex flex-row gap-8 border-b border-border">
          <p
            onClick={() => setActiveTab("list")}
            className={cn(
              "cursor-pointer pb-2 text-sm font-medium transition-colors",
              activeTab === "list"
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Daftar Underlying
          </p>
          <p
            onClick={() => setActiveTab("history")}
            className={cn(
              "cursor-pointer pb-2 text-sm font-medium transition-colors",
              activeTab === "history"
                ? "border-b-2 border-primary font-semibold text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Riwayat Otorisasi
          </p>
        </div>

        <div className="w-full min-w-0 overflow-x-auto">
          {activeTab === "list" ? (
            <UnderlyingTable
              columns={columns}
              data={displayedData as UnderlyResponse[]}
              loading={loading}
            />
          ) : (
            <UnderlyingTable
              columns={historyColumns}
              data={displayedData as EnrichedUnderlyHistory[]}
              loading={loading}
            />
          )}
        </div>
        
      </div>
    </div>
  );
}