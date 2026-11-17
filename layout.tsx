import type { Metadata } from "next";
import type { ReactNode } from "react";
import StudioHeader from "@/components/StudioHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Llaveros Personalizados 3D · Miguel Paillacho",
  description:
    "Personaliza tu llavero en 3D a pantalla dividida: solo tu nombre como llavero o superficie para grabar, 200 formas (30 de mecanizado), 40 letras, 10,000 diseños para mascotas y crea tu dúo favorito. Todos a $2.50.",
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Anton&family=Archivo+Black&family=Abril+Fatface&family=Audiowide&family=Bangers&family=Barlow+Condensed&family=Bebas+Neue&family=Caveat&family=Cinzel&family=Comfortaa&family=Dancing+Script&family=Exo+2&family=Fjalla+One&family=Fredoka&family=Great+Vibes&family=Indie+Flower&family=Josefin+Sans&family=Kanit&family=Lato&family=Lobster&family=Merriweather&family=Montserrat&family=Nunito&family=Open+Sans&family=Orbitron&family=Oswald&family=Pacifico&family=Permanent+Marker&family=Playfair+Display&family=Poppins:wght@400;600;700;800;900&family=Press+Start+2P&family=Quicksand&family=Raleway&family=Righteous&family=Roboto&family=Russo+One&family=Satisfy&family=Staatliches&family=Titillium+Web&display=swap";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="flex min-h-dvh flex-col bg-stone-50 text-stone-900 antialiased">
        <StudioHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
