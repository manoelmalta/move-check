"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function ProductSearch({ initialQuery, basePath = "/produtos" }: { initialQuery: string; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      router.replace(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath]
  );

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        defaultValue={initialQuery}
        onChange={(e) => {
          const v = e.target.value;
          clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer);
          (window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
            () => handleSearch(v),
            350
          );
        }}
        placeholder="Buscar por código interno ou descrição…"
        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-[#0057B8] focus:ring-1 focus:ring-[#0057B8]/20 shadow-sm"
      />
    </div>
  );
}
