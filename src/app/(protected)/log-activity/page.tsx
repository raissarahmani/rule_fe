"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LogActivityTable } from "./_components/table";

export default function LogActivity() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Log Activity
      </h1>

      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari log aktivitas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <LogActivityTable searchQuery={searchQuery} />
    </div>
  );
}