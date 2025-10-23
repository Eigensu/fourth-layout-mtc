"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/Loading";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/common/consts";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const next = pathname || "/";
      router.replace(`${ROUTES.LOGIN}?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // While redirecting, render nothing to avoid flashing content
    return null;
  }

  return <>{children}</>;
}
