"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";

import { LogoMark } from "@/components/logo";
import { PinDialog } from "@/components/pin/pin-dialog";
import { Button } from "@/components/ui/button";
import { setPatientMode } from "@/lib/profiles/pin";
import { getProfileStore } from "@/lib/profiles/store";
import { useProfiles } from "@/lib/profiles/use-profiles";
import { siteConfig } from "@/lib/site";

// The header while someone is playing. It is deliberately quiet: one small
// "Family" button leads out, and it asks for the PIN if one is set.
export function PlayHeader() {
  const router = useRouter();
  const { profiles } = useProfiles();
  const [pinOpen, setPinOpen] = useState(false);

  async function openFamilyArea() {
    const pin = await getProfileStore().getPin();
    if (pin) setPinOpen(true);
    else router.push("/family");
  }

  return (
    <header className="border-b-2 bg-card">
      <div className="mx-auto flex min-h-20 w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/play"
          aria-label={`${siteConfig.name}: choose who is playing`}
          className="flex min-h-12 shrink-0 items-center gap-3 rounded-lg font-display text-2xl font-bold"
        >
          <LogoMark />
          {/* The name is hidden on small phones so the two buttons always fit. */}
          <span className="hidden sm:inline">{siteConfig.name}</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {profiles.length > 1 && (
            <Button asChild variant="secondary" size="sm">
              <Link href="/play">Switch person</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void openFamilyArea()}>
            <Lock aria-hidden className="size-5" />
            Family
          </Button>
        </div>
      </div>
      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onUnlocked={() => {
          setPatientMode(false);
          setPinOpen(false);
          router.push("/family");
        }}
      />
    </header>
  );
}
