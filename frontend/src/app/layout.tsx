import type { Metadata } from "next";
// Self-hosted fonts (with Cyrillic): no Google Fonts download at dev/build time
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  // Absolute URLs for canonical links and og:image; set SITE_URL in production
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "MyHub", template: "%s · MyHub" },
  description: "Персональный сайт, который собирается из твоих данных.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" suppressHydrationWarning className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
