"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  UserRoundIcon,
  LogOutIcon,
  ChevronDownIcon,
} from "lucide-react";
// import { useAuth } from "@/context/auth-context";
// import { normalizeUserDomain } from "@/lib/utils/name";
// import { logout as apiLogout } from "@/lib/api/auth";

export function NavUser() {
  const router = useRouter();
  // const { userDomain, role, logout, loading } = useAuth();

  // const handleLogout = async () => {
  //   try {
  //     await apiLogout();
  //   } catch (error) {
  //     console.error("API logout failed:", error);
  //   } finally {
  //     logout();
  //     router.push("/login");
  //   }
  // };

  // if (loading) {
  //   return (
  //     <div className="flex items-center justify-end border-b bg-background px-6 py-3 h-[65px]" />
  //   );
  // }

  return (
    <div className="flex items-center justify-end border-b bg-background px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <UserRoundIcon className="size-5" />
        </div>
        {/* <div className="text-right">
          <p className="text-sm font-semibold text-foreground capitalize">
            {userDomain ? normalizeUserDomain(userDomain) : "User"}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {role}
          </p>
        </div> */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 cursor-pointer"
            >
              <ChevronDownIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48"
          >
            <DropdownMenuItem
              // onClick={handleLogout}
              className="
                cursor-pointer
                text-destructive
                focus:text-destructive
              "
            >
              <LogOutIcon className="mr-2 size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}