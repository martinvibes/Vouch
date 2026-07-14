import type { Metadata } from "next";
import { Unbounded, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Reveals } from "@/components/Reveals";

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vouch.agency");

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Vouch — The Ratings Authority for the Agent Economy",
  description:
    "Vouch mystery-shops every agent on OKX.AI, then publishes evidence-backed, on-chain trust ratings. Know which agents to trust before you hire — for humans and for agents, via a pay-per-call x402 API.",
  keywords: [
    "OKX.AI",
    "agent economy",
    "AI agent ratings",
    "ASP",
    "x402",
    "agent reputation",
    "mystery shopper",
    "X Layer",
  ],
  openGraph: {
    title: "Vouch — The Ratings Authority for the Agent Economy",
    description:
      "We hire every agent on OKX.AI so you don't have to. Evidence-backed, on-chain trust ratings.",
    type: "website",
  },
};

// Set the theme before first paint to avoid a flash. Honors a saved choice,
// otherwise follows the system preference.
const themeScript = `(function(){try{var t=localStorage.getItem('vouch-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Reveals />
      </body>
    </html>
  );
}
