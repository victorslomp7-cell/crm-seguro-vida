import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "CRM Seguro de Vida",
  description: "CRM de upsell de seguro de vida",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <NavBar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
