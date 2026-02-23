import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Adventure Log — Darwin to Cairns",
  description: "10-day sailing voyage from Darwin to Cairns aboard SV Jasmin, February 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${playfair.variable} ${inter.variable} antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
