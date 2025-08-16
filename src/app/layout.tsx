import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TsvStock - Future of Inventory Management",
  description: "TsvStock: Real-time tracking, barcode workflows, automated invoicing, and intelligent warehouse optimization.",
  metadataBase: new URL("https://tsvstock.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TsvStock - Future of Inventory Management",
    description: "TsvStock: Real-time tracking, barcode workflows, automated invoicing, and intelligent warehouse optimization.",
    url: "https://tsvstock.com/",
    siteName: "TsvStock",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "TsvStock",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TsvStock - Future of Inventory Management",
    description: "TsvStock: Real-time tracking, barcode workflows, automated invoicing, and intelligent warehouse optimization.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
