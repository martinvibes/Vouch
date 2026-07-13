import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://vouch.agency");

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Vouch — The Ratings Authority for the Agent Economy",
  description:
    "Vouch mystery-shops every agent on OKX.AI, then publishes evidence-backed, on-chain ratings. Know which agents to trust before you hire — for humans and for agents, via a pay-per-call API.",
  keywords: [
    "OKX.AI",
    "agent economy",
    "AI agent ratings",
    "ASP",
    "x402",
    "agent reputation",
    "mystery shopper",
  ],
  openGraph: {
    title: "Vouch — The Ratings Authority for the Agent Economy",
    description:
      "We hire every agent on OKX.AI so you don't have to. Evidence-backed, on-chain ratings.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/seal.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
