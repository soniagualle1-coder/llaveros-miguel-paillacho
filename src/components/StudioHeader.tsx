"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function StudioHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const isAdmin = pathname === "/pedidos";

  function goSection(sec: "personalizar" | "mascotas" | "duo") {
    if (isHome && typeof window !== "undefined") {
      window.history.replaceState(null, "", `/#${sec}`);
      window.dispatchEvent(new CustomEvent("mp-studio-section", { detail: sec }));
    } else {
      router.push(`/#${sec}`);
    }
  }

  return (
    <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="flex h-full w-full items-center justify-between gap-2 px-3 sm:px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-base text-white shadow-sm">
            🔑
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-black text-stone-900 sm:text-base">
              Llaveros 3D
            </span>
            <span className="hidden text-[10px] font-bold uppercase tracking-widest text-amber-600 sm:block">
              Miguel Paillacho
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => goSection("personalizar")}
            className="hidden rounded-full px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-amber-50 hover:text-amber-800 lg:inline-block"
          >
            Personalizar
          </button>
          <button
            type="button"
            onClick={() => goSection("mascotas")}
            className="hidden rounded-full px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-amber-50 hover:text-amber-800 lg:inline-block"
          >
            🐾 10,000 Mascotas
          </button>
          <button
            type="button"
            onClick={() => goSection("duo")}
            className="hidden rounded-full px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-rose-50 hover:text-rose-700 lg:inline-block"
          >
            💞 Dúo
          </button>

          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 sm:px-3">
            $2.50 c/u
          </span>

          <Link
            href="/pedidos"
            className={`rounded-full border-2 px-3 py-1 text-xs font-extrabold transition sm:px-3.5 sm:py-1.5 ${
              isAdmin
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:text-amber-800"
            }`}
          >
            🔐 Dueños
          </Link>
        </nav>
      </div>
    </header>
  );
}
