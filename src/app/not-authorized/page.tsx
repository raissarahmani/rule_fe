import Link from "next/link";

import { ShieldAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotAuthorizedPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlertIcon className="size-8 text-destructive" />
        </div>

        <h1 className="text-2xl font-semibold">
          Tidak Memiliki Akses
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Silakan kembali ke halaman yang sesuai dengan role Anda.
        </p>

        <Button
          asChild
          className="mt-6"
        >
          <Link href="/">
            Kembali ke Beranda
          </Link>
        </Button>
      </div>
    </div>
  );
}