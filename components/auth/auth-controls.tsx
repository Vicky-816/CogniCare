"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/supabase/env";
import { setPatientMode } from "@/lib/profiles/pin";
import { syncAllProfiles } from "@/lib/profiles/sync-all";
import { clearDeviceHistory } from "@/lib/supabase/sync";

type AuthState = "loading" | "signed-in" | "signed-out";

export function AuthControls({ showHomeLink = false }: { showHomeLink?: boolean }) {
  // Without Supabase settings nobody can sign in, so there is nothing to load.
  const [state, setState] = useState<AuthState>(supabaseEnv() ? "loading" : "signed-out");
  const [signingOut, startTransition] = useTransition();

  useEffect(() => {
    const client = createClient();
    if (!client) return;
    // This fires once straight away with the saved session (no network wait),
    // and again whenever someone signs in or out.
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      setState(session?.user ? "signed-in" : "signed-out");
      if (session?.user && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        window.setTimeout(() => void syncAllProfiles(), 0);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  function handleSignOut() {
    startTransition(async () => {
      // Upload anything new first. Only if that worked is this device's copy
      // cleared, so the next person on a shared tablet does not see it and
      // nothing is lost.
      try {
        const result = await syncAllProfiles();
        if (result.ok) clearDeviceHistory();
        setPatientMode(false);
      } catch {
        // Keep the device copy if anything went wrong.
      }
      await signOut();
    });
  }

  if (state === "loading") {
    // Reserve the space so the header does not jump when the buttons appear.
    return <div aria-hidden className="h-12 w-32" />;
  }

  if (state === "signed-in") {
    return (
      <div className="flex items-center gap-2">
        {showHomeLink && (
          <Button asChild variant="secondary">
            <Link href="/family">Family area</Link>
          </Button>
        )}
        <Button type="button" variant="outline" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild variant="accent">
        <Link href="/auth/signup">Create account</Link>
      </Button>
    </div>
  );
}
