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
  // o iPhone transforma telefone e endereço em link azul por conta própria; os links da página já são nossos
  formatDetection: { telephone: false, address: false, email: false },
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
  // o site é claro: sem isto, alguns Android escurecem a página sozinhos
  colorScheme: "only light",
};

// Roda antes da primeira pintura. A espiral só começa a se desenhar (classe "abre") com a página à vista e já
// pintada: quem abria a aba em segundo plano, ou tinha a primeira pintura atrasada, encontrava o desenho pronto.
// Se a medida da pintura não vier, 1,5 s depois de a página estar à vista ela começa de todo jeito.
// Recarregar volta ao início, para a abertura aparecer sempre.
const INICIO = `(function(){var d=document,r=d.documentElement;r.classList.add('js');try{history.scrollRestoration='manual'}catch(e){}function abre(){r.classList.add('abre')}function visivel(){if(d.visibilityState!=='visible')return;d.removeEventListener('visibilitychange',visivel);try{var o=new PerformanceObserver(function(l){if(l.getEntriesByName('first-contentful-paint').length){o.disconnect();abre()}});o.observe({type:'paint',buffered:true})}catch(e){}setTimeout(abre,1500)}d.addEventListener('visibilitychange',visivel);visivel()})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={urbanist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INICIO }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
