import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="w-full max-w-xl">
      <AuthForm mode="signup" />
    </div>
  );
}
