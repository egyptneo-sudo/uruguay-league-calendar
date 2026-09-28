import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { SiteFooter } from "@/components/SiteFooter";
import { useControladores } from "@/lib/controladores";
import { getClube, jornadasTaca, type Jogo } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";

type ResultadoJogo = {
  jornada: number;
  casa: string;
  fora: string;
  golos_casa: number | null;
  golos_fora: number | null;
  jogado: boolean;
};

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

function Adversario({ jogo, controladores }: { jogo: Jogo; controladores?: Map<string, string> | undefined }) {
  const controlador = controladores?.get(jogo.adversario) ?? "";

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
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-3">
        <EscudoClube nome={jogo.adversario} tamanho="sm" />
        <span className="min-w-0 text-sm font-semibold text-foreground">
          {jogo.adversario}
        </span>
      </div>
      {controlador ? (
        <span className="ml-9 text-[10px] text-muted-foreground">{controlador}</span>
      ) : null}
    </div>
  );
}

function ClassificacaoResultado({
  clubeNome,
  jogo,
  resultado,
  controladores,
}: {
  clubeNome: string;
  jogo: Jogo;
  resultado?: ResultadoJogo | undefined;
  controladores?: Map<string, string> | undefined;
}) {
  if (!resultado || resultado.golos_casa == null || resultado.golos_fora == null) {
    return <Adversario jogo={jogo} />;
  }

  const clubeFoiCasa = resultado.casa === clubeNome;
  const golosClube = clubeFoiCasa ? resultado.golos_casa : resultado.golos_fora;
  const golosAdversario = clubeFoiCasa ? resultado.golos_fora : resultado.golos_casa;
  const nomeAdversario = clubeFoiCasa ? resultado.fora : resultado.casa;
  const controladorAdversario = controladores?.get(nomeAdversario) ?? "";
  const estadoResultado =
    golosClube > golosAdversario ? "vitoria" : golosClube < golosAdversario ? "derrota" : "empate";

  const estadoClasses = {
    vitoria: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    empate: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    derrota: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  }[estadoResultado];

  return (
    <div className={"rounded-lg border p-2.5 ".concat(estadoClasses)}>
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-current/80">
        <span>Jogado</span>
        <span>✓</span>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
        <div className="flex min-w-0 items-center gap-2">
          <EscudoClube nome={clubeNome} tamanho="sm" />
          <span className="truncate">{clubeNome}</span>
        </div>
        <span className="shrink-0 text-base font-black">{golosClube} - {golosAdversario}</span>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate">{nomeAdversario}</span>
            <EscudoClube nome={nomeAdversario} tamanho="sm" />
          </div>
          {controladorAdversario ? (
            <span className="text-[10px] text-muted-foreground">{controladorAdversario}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ClubePage() {
  const { clube } = Route.useLoaderData();
  const { data: controladores } = useControladores();
  const [filtroJornada, setFiltroJornada] = useState<number | "todas">("todas");
  const [resultados, setResultados] = useState<Record<number, ResultadoJogo>>({});
  const [fetchError, setFetchError] = useState(false);

  const controladorClube = controladores?.get(clube.nome) ?? "";

  useEffect(() => {
    let isMounted = true;

    const fetchResultados = async () => {
      try {
        const client = getResultadosClient();
        const { data, error } = await client
          .from("resultados")
          .select("jornada, casa, fora, golos_casa, golos_fora, jogado")
          .eq("jogado", true)
          .not("golos_casa", "is", null)
          .not("golos_fora", "is", null)
          .or(`casa.eq.${clube.nome},fora.eq.${clube.nome}`);

        if (error) throw error;

        const mapa: Record<number, ResultadoJogo> = {};
        for (const item of data ?? []) {
          const jornada = Number(item.jornada);
          if (!Number.isFinite(jornada)) continue;
          if (item.casa !== clube.nome && item.fora !== clube.nome) continue;
          mapa[jornada] = item as ResultadoJogo;
        }

        if (isMounted) {
          setResultados(mapa);
          setFetchError(false);
        }
      } catch {
        if (isMounted) {
          setResultados({});
          setFetchError(true);
        }
      }
    };

    void fetchResultados();

    return () => {
      isMounted = false;
    };
  }, [clube.nome]);

  const proximoJogoJornada = useMemo(() => {
    if (fetchError) return null;

    const proximo = clube.jogos
      .filter((jogo) => jogo.adversario !== "Indefinido")
      .find((jogo) => !resultados[jogo.jornada]);

    return proximo?.jornada ?? null;
  }, [clube.jogos, fetchError, resultados]);

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
              {controladorClube ? (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{controladorClube}</span>
                </div>
              ) : null}
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
            const resultado = resultados[jogo.jornada];
            const eJogado = Boolean(resultado && resultado.jogado && resultado.golos_casa !== null && resultado.golos_fora !== null);
            const eProximo = !eJogado && jogo.adversario !== "Indefinido" && proximoJogoJornada === jogo.jornada;

            return (
              <li
                key={jogo.jornada}
                className={[
                  "flex min-h-28 flex-col justify-between rounded-xl border p-4 transition-colors",
                  eTaca
                    ? "border-cup/30 bg-cup-muted/40"
                    : eJogado
                      ? "border-border bg-card/80"
                      : eProximo
                        ? "border-blue-500/40 bg-blue-500/5 shadow-sm shadow-blue-500/10"
                        : "border-border bg-card",
                ].join(" ")}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Jornada {jogo.jornada}
                  </span>
                  {eTaca ? (
                    <span className="rounded-md bg-cup px-2 py-1 text-[10px] font-bold text-cup-foreground uppercase">
                      Taça
                    </span>
                  ) : eJogado ? (
                    <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                      ✓ Jogado
                    </span>
                  ) : eProximo ? (
                    <span className="rounded-md bg-blue-500/15 px-2 py-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                      Próximo
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

                {eJogado ? (
                  <ClassificacaoResultado
                    clubeNome={clube.nome}
                    jogo={jogo}
                    resultado={resultado}
                    controladores={controladores}
                  />
                ) : (
                  <Adversario jogo={jogo} controladores={controladores} />
                )}
              </li>
            );
          })}
        </ul>

        <SiteFooter />
      </div>
    </div>
  );
}
