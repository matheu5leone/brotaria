import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel_Decorative, Crimson_Text, IM_Fell_English } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { WalletProvider } from "@/hooks/useWallet";
import { QueryProvider } from "@/providers/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  weight: ["400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const imFellEnglish = IM_Fell_English({
  variable: "--font-fell",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brotaria - Seu Jardim Virtual",
  description: "Cultive plantas únicas geradas por IA",
  icons: {
    icon: "/imgs/brotaria.png",
    apple: "/imgs/brotaria.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzelDecorative.variable} ${crimsonText.variable} ${imFellEnglish.variable} antialiased`}
      >
        {/* SVG defs globais — gradientes de madeira para HexButton */}
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="hex-wood" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#7a4a22" />
              <stop offset="18%"  stopColor="#5c3a1e" />
              <stop offset="40%"  stopColor="#3d2010" />
              <stop offset="60%"  stopColor="#6b4228" />
              <stop offset="80%"  stopColor="#4a2e18" />
              <stop offset="100%" stopColor="#5c3a1e" />
            </linearGradient>
            <linearGradient id="hex-inner" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%"   stopColor="#2a1a0c" />
              <stop offset="100%" stopColor="#1e1008" />
            </linearGradient>
            <pattern id="hex-grain" patternUnits="userSpaceOnUse" width="64" height="8" patternTransform="rotate(5)">
              <rect width="64" height="8" fill="transparent" />
              <line x1="0" y1="2" x2="64" y2="2" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />
              <line x1="0" y1="5" x2="64" y2="5" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            </pattern>
          </defs>
        </svg>

        <QueryProvider>
          <AuthProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
