"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/_components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { menuItems, type MenuItem } from "@/lib/menu";
import { useAuth } from "@/context/auth-context";
import { canAccessRoute } from "@/lib/permissions";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const menuList = Object.values(menuItems);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (loading) return <main className="p-6" role="status">Memeriksa akses...</main>;
  if (!user || !canAccessRoute(user, pathname)) return (
    <main className="p-6">
      <p role="alert">Akses Rule Treasury tidak tersedia. Hubungi administrator untuk memeriksa akun dan izin menu Anda.</p>
      <a className="mr-4 underline" href="/rule/login">Masuk kembali</a>
      <button className="underline" onClick={logout}>Keluar</button>
    </main>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex flex-1 flex-col min-w-0">
          <NavUser />

          <main className="flex-1 bg-muted p-6 min-w-0">
            <Breadcrumb className="mb-6">
              <BreadcrumbList>
                {pathSegments.map((segment, index) => {
                  const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
                  const isLast = index === pathSegments.length - 1;

                  const findMenuItem = (items: MenuItem[]): MenuItem | null => {
                    for (const item of items) {
                      if (item.url === href) return item;
                      if (item.items) {
                        const childMatch = findMenuItem(item.items);
                        if (childMatch) return childMatch;
                      }
                    }
                    return null;
                  };

                  const menuItem = findMenuItem(menuList);
                  const Icon = menuItem?.icon;

                  const title =
                    menuItem?.title ||
                    segment
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (char) => char.toUpperCase());

                  return (
                    <React.Fragment key={href}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="flex items-center gap-1.5">
                            {Icon && <Icon className="size-4 shrink-0" />}
                            <span>{title}</span>
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link
                              href={href}
                              className="flex items-center gap-1.5"
                            >
                              {Icon && <Icon className="size-4 shrink-0" />}
                              <span>{title}</span>
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  );
                })}
              </BreadcrumbList>
            </Breadcrumb>

            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
