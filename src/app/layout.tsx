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
import "./responsive.css";
import "./motion.css";
import { MobileViewport } from "@/components/mobile-viewport";

export const metadata: Metadata = {
  title: {
    default: "حسابداری | مدیریت مالی شخصی",
    template: "%s | حسابداری",
  },
  description: "مدیریت دخل‌وخرج، حساب‌ها، بودجه و برنامه‌های شخصی",
  applicationName: "حسابداری",
  manifest: "/manifest.json?v=5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "حسابداری",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192.png?v=5", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=5", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180", type: "image/png" }],
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
    { media: "(prefers-color-scheme: light)", color: "#edf2f8" },
    { media: "(prefers-color-scheme: dark)", color: "#101a28" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" data-appearance="masculine" suppressHydrationWarning>
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
