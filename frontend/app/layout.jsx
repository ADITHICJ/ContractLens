import React from "react";
import { Inter, Outfit } from "next/font/google";
import ClientProviders from "../components/ClientProviders";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata = {
  title: "ContractLens | AI-Powered Contract Risk Detection & Legal Analysis",
  description: "Instantly analyze legal contracts to detect high-risk clauses, contradictions, payment liabilities, and arbitration issues using advanced Vectorless RAG.",
  keywords: ["legal tech", "contract analysis", "AI contract review", "RAG", "PageIndex"],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-slate-950 text-slate-100 flex flex-col font-sans">
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
