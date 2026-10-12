"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// import { useAuth } from "@/context/auth-context";
import { PageLoader } from "@/components/page-loader";

export default function HomePage() {
  // const { role, isLoggedIn, loading } = useAuth();
  const router = useRouter();

  // useEffect(() => {
  //   if (loading) return;

  //   if (!isLoggedIn) {
  //     router.replace("/login");
  //     return;
  //   }

  //   const isSA = role === "OPR - SA" || role === "SPV - SA";

  //   if (isSA) {
  //     router.replace("/users");
  //   } else {
      router.replace("/home");
  //   }
    
  // }, [role, isLoggedIn, loading, router]);

  return <PageLoader />;
}