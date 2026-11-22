import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

// The email-confirmation link sends people here with ?error=confirmation when
// it could not be used. Reading it must happen inside <Suspense>.
async function LoginNotice({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const { error } = await searchParams;
  if (error !== "confirmation" && error !== "google") return null;
  return (
    <p
      role="alert"
      className="rounded-xl border-2 border-destructive bg-destructive/10 p-4 text-lg font-semibold text-destructive"
    >
      {error === "google"
        ? "Google sign-in could not be completed. Please try again or sign in with email."
        : "That email link could not be used. It may have expired, or it was opened on a different device. Try signing in below. If that does not work, create your account again."}
    </p>
  );
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  return (
    <div className="w-full max-w-xl space-y-4">
      <Suspense fallback={null}>
        <LoginNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm mode="login" />
    </div>
  );
}
