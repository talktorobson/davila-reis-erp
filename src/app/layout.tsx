import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SessionProviderWrapper from "@/components/providers/SessionProviderWrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "D'avila Reis Advogados - Protegemos Seu Negócio e Patrimônio",
  description: "20 anos especializados em direito empresarial e trabalhista preventivo. Defendemos empresários contra processos que podem atingir seu patrimônio pessoal. 200+ empresas protegidas, 2.500+ processos gerenciados.",
  keywords: ["advogado trabalhista", "direito empresarial", "proteção patrimonial", "consultoria preventiva", "Cerquilho", "São Paulo"],
  openGraph: {
    title: "D'avila Reis Advogados - Protegemos Seu Negócio e Patrimônio",
    description: "20 anos especializados em direito empresarial e trabalhista preventivo. Defendemos empresários contra processos que podem atingir seu patrimônio pessoal.",
    url: "https://davilareisadvogados.com.br",
    siteName: "D'avila Reis Advogados",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
