import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { CurrencyProvider } from "@/components/currency-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppChrome } from "@/components/layout/app-chrome";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-sans",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: {
    default: "سامان | سیستم هوشمند مدیریت زندگی و دارایی",
    template: "%s | سامان",
  },
  description: "سامان (Saman Life OS) — سیستم جامع مدیریت مالی، بودجه‌بندی، رژیم و کالری‌شمار، تمرینات ورزشی، تمرکز و رشد فردی",
  applicationName: "سامان (Saman)",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "سامان",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
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
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazirmatn.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CurrencyProvider>
          <AppChrome>{children}</AppChrome>
          <Toaster position="top-center" dir="rtl" />
          <PwaRegister />
          </CurrencyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
