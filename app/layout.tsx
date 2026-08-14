import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ingeniería Biomédica | UNITEC",
  description: "Preguntas frecuentes, bitácora y repositorio técnico de Ingeniería Biomédica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
