"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { menuItems } from "@/lib/menu";
import { cn } from "@/lib/utils";

type AppSidebarProps = React.ComponentProps<typeof Sidebar>;

export function AppSidebar({ ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const items = Object.values(menuItems);

  return (
    <Sidebar 
      collapsible="icon" 
      className={cn(
        "transition-colors duration-200",
        "group-data-[collapsible=icon]:bg-primary group-data-[collapsible=icon]:text-primary-foreground"
      )}
      {...props}
    >
      {/* Header */}
      <SidebarHeader className="border-b px-4 py-4 group-data-[collapsible=icon]:hidden bg-primary">
        <div className="flex items-center justify-center">
          <div className="group-data-[collapsible=icon]:hidden">
            <Image src="/bcas-logo.png" alt="BCAS Logo" width={150} height={150} />
          </div>
        </div>
      </SidebarHeader>

      {/* Menu */}
      <SidebarContent className="group-data-[collapsible=icon]:bg-primary">
        <SidebarMenu className="px-2 py-3">
          {/* Sidebar Trigger as a Menu Item */}
          <SidebarMenuItem className="flex w-full justify-end group-data-[collapsible=icon]:justify-center">
            <SidebarTrigger
              className={cn(
                "ml-auto transition-colors group-data-[collapsible=icon]:ml-0",
                "text-primary hover:bg-primary/10 hover:text-primary",
                "group-data-[collapsible=icon]:text-primary-foreground group-data-[collapsible=icon]:hover:bg-primary-foreground/10 group-data-[collapsible=icon]:hover:text-primary-foreground"
              )}
            />
          </SidebarMenuItem>

          {items.map((item) => {
            if (!item) return null;

            const Icon = item.icon;
            const isActive = pathname === item.url;
            const hasChildren = item.items && item.items.length > 0;
            const isParentActive =
              pathname === item.url ||
              item.items?.some((sub) => pathname === sub.url);

            if (hasChildren) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isParentActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className={cn(
                          "transition-colors",
                          isParentActive &&
                            "font-medium text-primary hover:text-primary",
                          isParentActive &&
                            isCollapsed &&
                            "group-data-[collapsible=icon]:text-primary"
                        )}
                      >
                        {Icon && <Icon className="size-4" />}
                        <span>{item.title}</span>
                        <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive = pathname === subItem.url;
                          const SubIcon = subItem.icon;
                          return (
                            <SidebarMenuSubItem key={subItem.url}>
                              <SidebarMenuSubButton
                                asChild
                                className={cn(
                                  "transition-colors",
                                  isSubActive &&
                                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                )}
                              >
                                <Link href={subItem.url}>
                                  {SubIcon && <SubIcon className="size-4" />}
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  className={cn(
                    "transition-colors",
                    isActive &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                    "group-data-[collapsible=icon]:text-primary-foreground group-data-[collapsible=icon]:hover:bg-primary-foreground/20 group-data-[collapsible=icon]:hover:text-primary-foreground",
                    isActive &&
                      isCollapsed &&
                      "group-data-[collapsible=icon]:bg-primary-foreground/20"
                  )}
                >
                  <Link href={item.url}>
                    {Icon && <Icon className="size-4" />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}