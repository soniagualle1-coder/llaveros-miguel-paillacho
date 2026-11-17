export const FONTS: string[] = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Poppins",
  "Raleway",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Lobster",
  "Pacifico",
  "Bebas Neue",
  "Anton",
  "Permanent Marker",
  "Caveat",
  "Dancing Script",
  "Great Vibes",
  "Satisfy",
  "Cinzel",
  "Abril Fatface",
  "Bangers",
  "Righteous",
  "Fredoka",
  "Press Start 2P",
  "Orbitron",
  "Audiowide",
  "Russo One",
  "Titillium Web",
  "Exo 2",
  "Josefin Sans",
  "Quicksand",
  "Comfortaa",
  "Kanit",
  "Barlow Condensed",
  "Fjalla One",
  "Alfa Slab One",
  "Archivo Black",
  "Staatliches",
  "Indie Flower",
];

const loaded = new Set<string>();

/** Carga una fuente de Google Fonts para poder usarla dentro de un canvas. */
export function loadFont(family: string, weight = 700): Promise<void> {
  const key = `${weight}|${family}`;
  if (loaded.has(key)) return Promise.resolve();
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  return document.fonts
    .load(`${weight} 48px "${family}"`)
    .then(() => {
      loaded.add(key);
    })
    .catch(() => {
      /* la fuente se dibuja con una alternativa si falla */
    });
}
