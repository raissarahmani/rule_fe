"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  loading: boolean;
  valueClassName?: string;
}

export function StatCard({
  label,
  value,
  loading,
  valueClassName,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex justify-between px-6">
        <span className="text-sm text-foreground">{label}</span>
        <span className={cn("text-3xl font-bold", valueClassName)}>
          {loading ? <Loader2 className="size-5 animate-spin" /> : value}
        </span>
      </CardContent>
    </Card>
  );
}