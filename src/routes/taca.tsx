import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { SiteFooter } from "@/components/SiteFooter";
import { useControladores } from "@/lib/controladores";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";
import { getJogosDaJornada } from "@/lib/taca";
import { cn } from "@/lib/utils";

type TacaFase = "oitavas" | "quartos" | "meias" | "final";

type TacaConfronto = {
  fase: TacaFase;
  slot: number;
  casa: string | null;
  fora: string | null;
};

type ResultadoBanco = {
  jornada: number;
  casa: string;
  fora: string;
  golos_casa: number | null;
  golos_fora: number | null;
  jogado: boolean;
};

type PartidaDisplay = {
  fase: TacaFase;
  slot: number;
  jornada: number;
  casa: string | null;
  fora: string | null;
  resultado?: ResultadoBanco;
};

const FASES = [
  { fase: "oitavas", titulo: "Oitavas de Final", jornada: 7, slots: 8 },
  { fase: "quartos", titulo: "Quartos de Final", jornada: 16, slots: 4 },
  { fase: "meias", titulo: "Meias-Finais", jornada: 24, slots: 2 },
  { fase: "final", titulo: "Final", jornada: 33, slots: 1 },
] as const;

function getPartidaKey(casa: string | null, fora: string | null) {
  return [casa ?? "", fora ?? ""].join("::");
}

function getMatchKey(casa: string | null, fora: string | null) {
  return `${(casa ?? "").trim()}::${(fora ?? "").trim()}`;
}

export const Route = createFileRoute("/taca")({
  component: TacaPage,
});

function TacaPage() {
  const [confrontos, setConfrontos] = useState<Record<string, TacaConfronto>>({});
  const [resultados, setResultados] = useState<Record<string, ResultadoBanco>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const client = getResultadosClient();

        const [{ data: confrontosData, error: confrontosError }, { data: resultadosData, error: resultadosError }] =
          await Promise.all([
            client.from("taca_confrontos").select("fase, slot, casa, fora"),
            client.from("resultados").select("jornada, casa, fora, golos_casa, golos_fora, jogado").in("jornada", [7, 16, 24, 33]),
          ]);

        if (confrontosError || resultadosError) {
          if (isMounted) {
            setConfrontos({});
            setResultados({});
            setLoading(false);
          }
          return;
        }

        const nextConfrontos: Record<string, TacaConfronto> = {};
        for (const item of confrontosData ?? []) {
          nextConfrontos[`${item.fase}:${item.slot}`] = {
            fase: item.fase as TacaFase,
            slot: Number(item.slot),
            casa: item.casa ?? null,
            fora: item.fora ?? null,
          };
        }

        const nextResultados: Record<string, ResultadoBanco> = {};
        for (const item of resultadosData ?? []) {
          const key = `${item.jornada}:${item.casa}::${item.fora}`;
          nextResultados[key] = item as ResultadoBanco;
          const reverseKey = `${item.jornada}:${item.fora}::${item.casa}`;
          nextResultados[reverseKey] = item as ResultadoBanco;
        }

        if (isMounted) {
          setConfrontos(nextConfrontos);
          setResultados(nextResultados);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setConfrontos({});
          setResultados({});
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const oitavas = useMemo(() => {
    const jogos = getJogosDaJornada(7);
    return jogos.map((jogo, index) => ({
      fase: "oitavas" as const,
      slot: index + 1,
      jornada: 7,
      casa: jogo.casa,
      fora: jogo.fora,
      resultado: getResultadoParaJogo(resultados, 7, jogo.casa, jogo.fora),
    }));
  }, [resultados]);

  const fases = useMemo(() => {
    const mapaFases: Record<TacaFase, PartidaDisplay[]> = {
      oitavas: oitavas,
      quartos: Array.from({ length: 4 }, (_, index) => {
        const slot = index + 1;
        const item = confrontos[`quartos:${slot}`];
        return {
          fase: "quartos",
          slot,
          jornada: 16,
          casa: item?.casa ?? null,
          fora: item?.fora ?? null,
          resultado: getResultadoParaJogo(resultados, 16, item?.casa ?? null, item?.fora ?? null),
        };
      }),
      meias: Array.from({ length: 2 }, (_, index) => {
        const slot = index + 1;
        const item = confrontos[`meias:${slot}`];
        return {
          fase: "meias",
          slot,
          jornada: 24,
          casa: item?.casa ?? null,
          fora: item?.fora ?? null,
          resultado: getResultadoParaJogo(resultados, 24, item?.casa ?? null, item?.fora ?? null),
        };
      }),
      final: Array.from({ length: 1 }, (_, index) => {
        const slot = index + 1;
        const item = confrontos[`final:${slot}`];
        return {
          fase: "final",
          slot,
          jornada: 33,
          casa: item?.casa ?? null,
          fora: item?.fora ?? null,
          resultado: getResultadoParaJogo(resultados, 33, item?.casa ?? null, item?.fora ?? null),
        };
      }),
    };

    return mapaFases;
  }, [confrontos, oitavas, resultados]);

  const colunas = FASES.map((fase) => ({ ...fase, jogos: fases[fase.fase] }));

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center gap-3 text-primary">
          <Trophy className="h-5 w-5" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Mata-mata</p>
        </header>

        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Taça</h1>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            A carregar o bracket da taça...
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {colunas.map((coluna) => (
              <div key={coluna.fase} className="space-y-4">
                <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                  <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                    {coluna.titulo}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">J{coluna.jornada}</p>
                </div>

                <div className="space-y-3">
                  {coluna.jogos.map((jogo) => (
                    <TacaCard key={`${coluna.fase}-${jogo.slot}`} jogo={jogo} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}

function getResultadoParaJogo(
  resultados: Record<string, ResultadoBanco>,
  jornada: number,
  casa: string | null,
  fora: string | null,
): ResultadoBanco | undefined {
  if (!casa || !fora) return undefined;

  const keys = [
    `${jornada}:${casa}::${fora}`,
    `${jornada}:${fora}::${casa}`,
  ];

  return keys.map((key) => resultados[key]).find(Boolean);
}

function TacaCard({ jogo }: { jogo: PartidaDisplay }) {
  const { data: controladores } = useControladores();
  const casa = jogo.casa ?? "";
  const fora = jogo.fora ?? "";
  const resultado = jogo.resultado;
  const casaControlador = controladores?.get(casa) ?? "";
  const foraControlador = controladores?.get(fora) ?? "";

  const isIndefinido = !casa || !fora;
  const isJogado = Boolean(
    resultado && resultado.jogado && resultado.golos_casa !== null && resultado.golos_fora !== null,
  );

  const casaGolos = resultado && resultado.golos_casa != null ? Number(resultado.golos_casa) : null;
  const foraGolos = resultado && resultado.golos_fora != null ? Number(resultado.golos_fora) : null;
  const vencedor =
    casaGolos != null && foraGolos != null
      ? casaGolos > foraGolos
        ? casa
        : foraGolos > casaGolos
          ? fora
          : null
      : null;

  const cardStyle = cn(
    "min-w-[260px] rounded-xl border px-4 py-3 transition-colors",
    isIndefinido && "border-border/70 bg-slate-900/40 text-slate-300",
    !isIndefinido && !isJogado && "border-primary/20 bg-card text-foreground shadow-sm",
    isJogado && "border-border bg-card",
  );

  return (
    <div className={cardStyle}>
      <div className="relative flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-left">
            {!isIndefinido ? <EscudoClube nome={casa} tamanho="sm" /> : <div className="grid h-6 w-6 place-items-center rounded-full border border-border/60 bg-slate-800/70 text-[10px] font-bold text-slate-300">?</div>}
            <span
              title={casaControlador ? `Controlador: ${casaControlador}` : undefined}
              className={cn(
                "text-sm",
                isJogado && vencedor === casa && "text-foreground",
                isJogado && vencedor !== casa && vencedor !== null && "text-muted-foreground",
                isJogado && vencedor === null && "text-foreground",
                isIndefinido && "text-slate-300",
              )}
            >
              {isIndefinido ? "?" : casa}
            </span>
          </div>
          {casaControlador ? (
            <span className="pl-8 text-xs text-muted-foreground">{casaControlador}</span>
          ) : null}
        </div>

        <div className="flex min-h-[20px] items-center justify-center">
          {isIndefinido ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">Aguarda sorteio</span>
          ) : isJogado && casaGolos != null && foraGolos != null ? (
            <span className={cn("text-sm font-black tabular-nums", vencedor === casa && "text-emerald-600 dark:text-emerald-400", vencedor === null && "text-foreground")}>{casaGolos} - {foraGolos}</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">vs</span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-left">
            {!isIndefinido ? <EscudoClube nome={fora} tamanho="sm" /> : <div className="grid h-6 w-6 place-items-center rounded-full border border-border/60 bg-slate-800/70 text-[10px] font-bold text-slate-300">?</div>}
            <span
              title={foraControlador ? `Controlador: ${foraControlador}` : undefined}
              className={cn(
                "text-sm",
                isJogado && vencedor === fora && "text-foreground",
                isJogado && vencedor !== fora && vencedor !== null && "text-muted-foreground",
                isJogado && vencedor === null && "text-foreground",
                isIndefinido && "text-slate-300",
              )}
            >
              {isIndefinido ? "?" : fora}
            </span>
          </div>
          {foraControlador ? (
            <span className="pl-8 text-xs text-muted-foreground">{foraControlador}</span>
          ) : null}
        </div>

        {isJogado && (
          <div className="absolute right-0 top-0">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
              FT
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
