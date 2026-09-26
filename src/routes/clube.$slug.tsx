import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { getClube, jornadasTaca, type Jogo } from "@/lib/liga";

export const Route = createFileRoute("/clube/$slug")({
  loader: ({ params }) => {
    const clube = getClube(params.slug);
    if (!clube) throw notFound();
    return { clube };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Clube não encontrado — Calendário Liga Uruguaia" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { clube } = loaderData;
    return {
      meta: [
        { title: `${clube.nome} — Calendário Liga Uruguaia` },
        {
          name: "description",
          content: `Calendário completo do ${clube.nome} na Liga Uruguaia: adversários das 34 jornadas e jornadas de taça.`,
        },
        {
          property: "og:title",
          content: `${clube.nome} — Calendário Liga Uruguaia`,
        },
        {
          property: "og:description",
          content: `Calendário completo do ${clube.nome} na Liga Uruguaia: adversários das 34 jornadas e jornadas de taça.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: ClubeNaoEncontrado,
  component: ClubePage,
});

function ClubeNaoEncontrado() {
  return (
    <div className="page-backdrop flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-3xl font-bold text-foreground">
        Clube não encontrado
      </h1>
      <p className="text-muted-foreground">
        O clube que procuras não existe neste calendário.
      </p>
      <Link
        to="/"
        className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ver todos os clubes
      </Link>
    </div>
  );
}

function Adversario({ jogo }: { jogo: Jogo }) {
  if (jogo.adversario.toLowerCase() === "indefinido") {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cup-muted text-[10px] font-bold text-cup ring-1 ring-cup/25">
          IN
        </span>
        <span className="text-xs font-medium text-cup">Indefinido — a sortear</span>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      <EscudoClube nome={jogo.adversario} tamanho="sm" />
      <span className="min-w-0 text-sm font-semibold text-foreground">
        {jogo.adversario}
      </span>
    </div>
  );
}

function ClubePage() {
  const { clube } = Route.useLoaderData();
  const [filtroJornada, setFiltroJornada] = useState<number | "todas">("todas");

  const jogos = useMemo(
    () =>
      clube.jogos.filter(
        (j) => filtroJornada === "todas" || j.jornada === filtroJornada,
      ),
    [clube, filtroJornada],
  );

  return (
    <div className="page-backdrop min-h-screen">
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <header className="pt-10 pb-8 sm:pt-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Todos os clubes
          </Link>

          <div className="mt-6 flex items-center gap-4">
            <EscudoClube nome={clube.nome} tamanho="lg" />
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {clube.nome}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {clube.jogos.length} jornadas · {jornadasTaca.size} jornadas de
                taça
              </p>
            </div>
          </div>
        </header>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label htmlFor="filtro-jornada" className="text-sm font-medium text-muted-foreground">
            Filtrar por jornada
          </label>
          <select
            id="filtro-jornada"
            value={String(filtroJornada)}
            onChange={(e) =>
              setFiltroJornada(e.target.value === "todas" ? "todas" : Number(e.target.value))
            }
            className="rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/40"
          >
            <option value="todas">Todas</option>
            {Array.from({ length: clube.jogos.length }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Jornada {n}
              </option>
            ))}
          </select>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {jogos.map((jogo) => {
            const eTaca = jornadasTaca.has(jogo.jornada);
            return (
              <li
                key={jogo.jornada}
                className={
                  eTaca
                    ? "flex min-h-28 flex-col justify-between rounded-xl border border-cup/30 bg-cup-muted/40 p-4"
                    : "flex min-h-28 flex-col justify-between rounded-xl border border-border bg-card p-4"
                }
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Jornada {jogo.jornada}
                  </span>
                  {eTaca ? (
                    <span className="rounded-md bg-cup px-2 py-1 text-[10px] font-bold text-cup-foreground uppercase">
                      Taça
                    </span>
                  ) : jogo.casa === true ? (
                    <span className="rounded-md bg-primary/15 px-2 py-1 text-[10px] font-bold text-primary uppercase">
                      🏠 Casa
                    </span>
                  ) : jogo.casa === false ? (
                    <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-bold text-secondary-foreground uppercase">
                      ✈️ Fora
                    </span>
                  ) : null}
                </div>
                <Adversario jogo={jogo} />
              </li>
            );
          })}
        </ul>

        <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>Criado por ne0.sys</span>
          <a
            href="https://www.instagram.com/ne0.sys/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            📸 Instagram
          </a>
          <span>💬 Discord: neosupreme</span>
          <a
            href="https://www.tiktok.com/@sj34"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            🎵 TikTok
          </a>
        </footer>
      </div>
    </div>
  );
}
