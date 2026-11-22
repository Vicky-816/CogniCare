import { AuthControls } from "@/components/auth/auth-controls";
import { Logo } from "@/components/logo";

// The header on public pages (home, 404).
export function SiteHeader() {
  return (
    <header className="border-b-2 bg-card">
      <div className="mx-auto flex min-h-20 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Logo />
        <AuthControls showHomeLink />
      </div>
    </header>
  );
}
