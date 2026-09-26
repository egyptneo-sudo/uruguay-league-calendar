import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { SiteFooter } from "@/components/SiteFooter";
import { useControladores } from "@/lib/controladores";
import { liga, slugify, jornadasTaca } from "@/lib/liga";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calendário Liga Uruguaia" },
      {
        name: "description",
        content:
          "Calendário de jogos dos 16 clubes da Primeira Divisão do Uruguai: 34 jornadas, adversários e jornadas de taça.",
      },
      { property: "og:title", content: "Calendário Liga Uruguaia" },
      {
        property: "og:description",
        content:
          "Calendário de jogos dos 16 clubes da Primeira Divisão do Uruguai: 34 jornadas, adversários e jornadas de taça.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: controladores } = useControladores();
  const [busca, setBusca] = useState("");

  const clubes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return liga.clubes;
    return liga.clubes.filter((c) => c.nome.toLowerCase().includes(q));
  }, [busca]);

  return (
    <div className="page-backdrop min-h-screen">
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <header className="pt-14 pb-10 text-center sm:pt-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
            Primeira Divisão · Uruguai
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Calendário <span className="text-primary">Liga Uruguaia</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            {liga.clubes.length} clubes · {liga.total_jornadas} jornadas ·{" "}
            {jornadasTaca.size} jornadas de taça
          </p>
        </header>

        <div className="relative mx-auto mb-10 max-w-md">
          <svg
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar clube…"
            aria-label="Pesquisar clube"
            className="w-full rounded-2xl border border-input bg-card py-3 pr-4 pl-11 text-sm text-foreground shadow-lg shadow-black/20 outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-ring/40"
          />
        </div>

        {clubes.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Nenhum clube encontrado para “{busca}”.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clubes.map((clube) => {
              const slug = slugify(clube.nome);
              const controlador = controladores?.get(clube.nome) ?? "";
              return (
                <li key={clube.nome}>
                  <Link
                    to="/clube/$slug"
                    params={{ slug }}
                    className="card-hover group flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4"
                  >
                    <EscudoClube nome={clube.nome} tamanho="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {clube.nome}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {controlador || `${clube.jogos.length} jornadas`}
                      </span>
                    </span>
                    <svg
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <SiteFooter />
      </div>
    </div>
  );
}
