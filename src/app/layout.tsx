import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { AppearanceProvider } from "@/components/appearance-provider";
import { HeroProvider } from "@/components/hero-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppChrome } from "@/components/layout/app-chrome";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";
import "./joojo.css";
import "./responsive.css";
import "./motion.css";
import { MobileViewport } from "@/components/mobile-viewport";

export const metadata: Metadata = {
  title: {
    default: "جوجو | سیستم هوشمند مدیریت زندگی و دارایی",
    template: "%s | جوجو",
  },
  description: "جوجو (Joojo Life OS) — سیستم جامع مدیریت مالی، بودجه‌بندی، رژیم و کالری‌شمار، تمرینات ورزشی، تمرکز و رشد فردی",
  applicationName: "جوجو (Joojo)",
  manifest: "/manifest.json?v=4",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "جوجو",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/joojo/stella-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/joojo/stella-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/joojo/stella-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#251e24" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-appearance="joojo" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <MobileViewport />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider>
            <LocaleProvider>
              <AppearanceProvider>
                <HeroProvider>
                  <AppChrome>{children}</AppChrome>
                  <Toaster position="top-center" />
                  <PwaRegister />
                </HeroProvider>
              </AppearanceProvider>
            </LocaleProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
