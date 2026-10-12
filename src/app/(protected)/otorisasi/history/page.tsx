"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HistoryTable } from "./_components/table";

type AuthorizationType = "all" | "limit" | "rate";

function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function OtorisasiListPage() {
  const [authorizationType, setAuthorizationType] = useState<AuthorizationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
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

        {/* Tables rendered based on active tab */}
        <div className="mt-2">
          <div className="rounded-md border p-4 text-sm">
            <HistoryTable
              searchQuery={debouncedSearch}
              authorizationType={authorizationType}
            />
          </div>
        </div>
      </div>
    </div>
  );  
} 