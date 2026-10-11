import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "FR Engenharia Civil | Segurança, Regularização e Laudos",
  description: "Soluções técnicas em engenharia civil, licenças, regularização de imóveis, laudos e avaliações.",
  metadataBase: new URL("https://frengenharia.vercel.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
