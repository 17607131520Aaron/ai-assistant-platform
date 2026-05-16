"use client";

import { Spin } from "antd";

import { useRequestLoadingStore } from "@/lib/request-loading";

type RequestLoadingProviderProps = {
  children: React.ReactNode;
};

const RequestLoadingProvider = ({ children }: RequestLoadingProviderProps) => {
  const pending = useRequestLoadingStore((state) => state.pending);
  const visible = pending > 0;

  return (
    <>
      {children}
      {visible ? (
        <div
          aria-busy
          aria-live="polite"
          className="pointer-events-auto fixed inset-0 z-9999 flex items-center justify-center bg-black/35"
        >
          <Spin size="large" />
        </div>
      ) : null}
    </>
  );
};

export default RequestLoadingProvider;
