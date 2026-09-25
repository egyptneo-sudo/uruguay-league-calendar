import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { getClube, jornadasTaca, iniciais, type Jogo } from "@/lib/liga";

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
      <span className="inline-flex items-center gap-2 rounded-full bg-cup-muted px-3 py-1 text-xs font-medium text-cup">
        <span className="h-1.5 w-1.5 rounded-full bg-cup" />
        Indefinido — a sortear
      </span>
    );
  }
  return <span className="text-sm font-medium text-foreground">{jogo.adversario}</span>;
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
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
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
            <span className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-lg font-bold text-primary ring-1 ring-primary/25">
              {iniciais(clube.nome)}
            </span>
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

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/60">
                <th className="px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Jornada
                </th>
                <th className="px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Adversário
                </th>
              </tr>
            </thead>
            <tbody>
              {jogos.map((jogo) => {
                const eTaca = jornadasTaca.has(jogo.jornada);
                return (
                  <tr
                    key={jogo.jornada}
                    className={
                      eTaca
                        ? "border-b border-border bg-cup-muted/40 last:border-b-0"
                        : "border-b border-border last:border-b-0 odd:bg-secondary/25"
                    }
                  >
                    <td className="w-24 px-5 py-3 align-middle">
                      <span
                        className={
                          eTaca
                            ? "inline-flex h-8 w-9 items-center justify-center rounded-lg bg-cup text-xs font-bold text-cup-foreground"
                            : "inline-flex h-8 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-secondary-foreground"
                        }
                      >
                        {jogo.jornada}
                      </span>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <Adversario jogo={jogo} />
                      {eTaca && (
                        <span className="ml-2 hidden text-xs font-medium text-cup sm:inline">
                          Taça
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Jornadas de taça ({[...jornadasTaca].join(", ")}) destacadas em
          dourado · “Indefinido” = sorteio pendente · Sem casa/fora.
        </p>
      </div>
    </div>
  );
}
