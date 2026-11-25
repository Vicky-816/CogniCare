"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_PROFILE_ID, isDemoMode } from "@/lib/demo-mode";

export function DemoBanner() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setActive(isDemoMode()));
  }, []);
  if (!active) return null;
  return (
    <aside
      aria-label="Sample demo"
      className="flex flex-wrap items-center justify-center gap-4 bg-accent-soft px-4 py-3 text-base"
    >
      <strong>Demo · fictional sample data</strong>
      <Link className="underline" href={`/play/${DEMO_PROFILE_ID}`}>
        Patient home
      </Link>
      <Link className="underline" href={`/family/profiles/${DEMO_PROFILE_ID}`}>
        Caregiver progress
      </Link>
      <button
        className="min-h-11 underline"
        onClick={() => {
          document.cookie = "cognicare-demo=; Path=/; Max-Age=0; SameSite=Lax";
          window.location.assign("/");
        }}
      >
        Exit demo
      </button>
    </aside>
  );
}
