"use client";

import { Spin } from "antd";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getAccessToken } from "@/lib/auth-token";

type AuthGuardProps = {
  children: ReactNode;
};

const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login" as Route);
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-[#09091b]">
        <Spin size="large" />
      </div>
    );
  }

  return children;
};

export default AuthGuard;
