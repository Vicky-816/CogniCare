"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { MailCheck } from "lucide-react";

import { signIn, signUp, type AuthFormState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState("");

  async function continueWithGoogle() {
    setGoogleError("");
    const supabase = createClient();
    if (!supabase) {
      setGoogleError("Google sign-in is not configured yet. Please contact the site administrator.");
      return;
    }
    setGooglePending(true);
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("method", "google");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch {
      setGoogleError("Could not start Google sign-in. Please try again or use email.");
      setGooglePending(false);
    }
  }
  const isLogin = mode === "login";

  // After signing up, the next step happens in the person's email app, so it
  // gets a whole screen instead of a small message.
  if (!isLogin && state?.message && state.email) {
    return (
      <div className="w-full max-w-xl space-y-6 rounded-3xl border-2 bg-card p-6 sm:p-10">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-routine-soft text-routine">
          <MailCheck aria-hidden className="size-9" />
        </span>
        <h1 className="text-4xl font-bold">Check your email</h1>
        <p className="text-xl">
          We sent a link to <strong className="break-all">{state.email}</strong>. Open it on this device to confirm your
          account.
        </p>
        <ul role="list" className="space-y-2 text-lg text-muted-foreground">
          <li>It can take a few minutes to arrive.</li>
          <li>Look in your spam or junk folder if you do not see it.</li>
          <li>Once you have confirmed, come back and sign in.</li>
        </ul>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/auth/login">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-6 rounded-3xl border-2 bg-card p-6 sm:p-10">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{isLogin ? "Welcome back" : "Create your account"}</h1>
        <p className="text-lg text-muted-foreground">
          {isLogin
            ? "Sign in to continue to CogniCare."
            : "Create an account to set up CogniCare for someone you care for."}
        </p>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={googlePending || pending}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-[#747775] bg-white px-5 py-3 text-base font-semibold text-[#1f1f1f] shadow-sm transition-colors hover:bg-[#f8faff] focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 sm:text-lg"
        >
          <svg aria-hidden="true" viewBox="0 0 48 48" className="size-6 shrink-0">
            <path
              fill="#4285f4"
              d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"
            />
            <path
              fill="#34a853"
              d="M24 44.5c5.5 0 10.2-1.8 13.5-5l-6.6-5.1c-1.8 1.2-4.2 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.5 20.5 0 0 0 24 44.5Z"
            />
            <path fill="#fbbc05" d="M12.6 27.9a12.3 12.3 0 0 1 0-7.8v-5.3H5.8a20.5 20.5 0 0 0 0 18.4l6.8-5.3Z" />
            <path
              fill="#ea4335"
              d="M24 11.7c3 0 5.6 1 7.7 3l5.9-5.9A19.7 19.7 0 0 0 24 3.5 20.5 20.5 0 0 0 5.8 14.8l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"
            />
          </svg>
          <span>{googlePending ? "Connecting to Google?" : "Continue with Google"}</span>
        </button>
        <p className="text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          {isLogin
            ? "Use Google or your email and password to access your account."
            : "Already registered with this email? Continue with Google to access your existing account."}
        </p>
        {googleError && (
          <p
            role="alert"
            className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-lg text-destructive"
          >
            {googleError}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          <span>or continue with email</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        {!isLogin && (
          <>
            <p className="rounded-xl bg-accent-soft p-4 text-base">
              Use your own details here. You can add the person who will play after signing in. Only add photos you have
              permission to use.
            </p>
            <label className="block space-y-2 text-lg font-semibold">
              Your name
              <Input name="name" autoComplete="name" required minLength={2} />
            </label>
          </>
        )}
        <label className="block space-y-2 text-lg font-semibold">
          Email
          <Input name="email" type="email" autoComplete="email" required />
        </label>
        <div className="space-y-3">
          <label className="block space-y-2 text-lg font-semibold">
            Password
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={8}
            />
          </label>
          {!isLogin && <p className="text-base text-muted-foreground">Use at least 8 characters.</p>}
          <label className="flex min-h-12 w-fit cursor-pointer items-center gap-3 text-lg">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
              className="size-6 accent-primary"
            />
            Show password
          </label>
        </div>

        <div aria-live="polite">
          {state?.error && (
            <p
              role="alert"
              className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-lg font-semibold text-destructive"
            >
              {state.error}
            </p>
          )}
          {state?.message && !state.email && (
            <p role="status" className="rounded-xl bg-routine-soft p-4 text-lg text-success">
              {state.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={pending || googlePending} className="w-full">
          {pending ? "Please waitâ€¦" : isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="text-lg">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link
          className="font-semibold text-primary underline underline-offset-4 hover:decoration-2"
          href={isLogin ? "/auth/signup" : "/auth/login"}
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}

