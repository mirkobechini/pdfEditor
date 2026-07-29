import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PdfEditor",
  description: "PDF Editor Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* iubenda CMP — Cookie consent banner (loads after page render, appears at bottom) */}
        <Script
          id="iubenda-cmp"
          strategy="lazyOnload"
          src="https://embeds.iubenda.com/widgets/e5f130f1-5f68-489e-9f7e-57897c838141.js"
        />

        {/* Prevent flash of unstyled content — apply dark class before React hydrates */}
        <Script id="dark-mode-script" strategy="beforeInteractive">
          {`
            (function() {
              var dark = localStorage.getItem("darkMode");
              if (dark === "true" || (dark === null && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
                document.documentElement.classList.add("dark");
              }
            })();
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
