import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";

// Body text: Atkinson Hyperlegible was designed by the Braille Institute for
// low-vision readers. Letters that are easy to confuse (I/l/1, O/0, b/d) look
// distinct.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  adjustFontFallback: false,
});

// Headlines: a friendly, characterful grotesque with a sturdy weight.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

// No maximumScale here on purpose: users must always be able to pinch-zoom.
export const viewport: Viewport = {
  themeColor: "#f4f5f2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (dark-mode tools such as
    // Night Eye, translators, etc.) add attributes to <html> before React
    // loads. This stops a harmless "hydration mismatch" warning about them.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Lets keyboard and screen reader users jump past the header. */}
        <a
          href="#main-content"
          className="sr-only rounded-xl bg-primary px-5 py-3 text-lg font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to main content
        </a>
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
