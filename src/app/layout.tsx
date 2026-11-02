import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";
import "./secoes.css";

const urbanist = Urbanist({
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400", "500", "600"],
  variable: "--fonte",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gadelha Odontologia | Ortodontia, estética e implantes no Lago Sul",
  description:
    "Ortodontia com alinhadores, estética do sorriso, prótese e implantes e prevenção para a família inteira. 30 anos de experiência. Lago Sul, Brasília. Agende pelo WhatsApp.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Gadelha Odontologia",
    title: "Gadelha Odontologia · Lago Sul, Brasília",
    description: "Ortodontia, estética do sorriso, prótese e implantes e prevenção para a família inteira. Agende pelo WhatsApp.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f3efe6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={urbanist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
