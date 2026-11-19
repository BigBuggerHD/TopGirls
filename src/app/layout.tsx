import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Top Girls – Premium-Anzeigenportal", template: "%s | Top Girls" },
  description: "Top Girls – das Premium-Anzeigenportal für volljährige Anbieterinnen, Agenturen, Clubs und Massagestudios. Nur für Erwachsene ab 18 Jahren.",
  applicationName: "Top Girls",
  openGraph: { siteName: "Top Girls", locale: "de_DE", type: "website" },
  robots: { index: true, follow: true },
  other: { rating: "adult", "RATING": "RTA-5042-1996-1400-1577-RTA" },
};

export const viewport: Viewport = { themeColor: "#0D0D0D", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-DE" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-gold focus:px-4 focus:py-2 focus:text-background">
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
