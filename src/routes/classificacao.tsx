import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { SiteFooter } from "@/components/SiteFooter";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";
import { cn } from "@/lib/utils";

type ResultadoBanco = {
  jornada: number;
  casa: string;
  fora: string;
  golos_casa: number | null;
  golos_fora: number | null;
  jogado: boolean;
};

type EstatisticaClube = {
  clube: string;
  pj: number;
  v: number;
  e: number;
  d: number;
  gm: number;
  gs: number;
  dg: number;
  pts: number;
};

const JORNADAS_TACA = new Set([7, 16, 24, 33]);

function criarEstatisticasBase(): Map<string, EstatisticaClube> {
  const stats = new Map<string, EstatisticaClube>();
  for (const clube of liga.clubes) {
    stats.set(clube.nome, {
      clube: clube.nome,
      pj: 0,
      v: 0,
      e: 0,
      d: 0,
      gm: 0,
      gs: 0,
      dg: 0,
      pts: 0,
    });
  }
  return stats;
}

function ordenarClassificacao(items: EstatisticaClube[]) {
  return [...items].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gm !== a.gm) return b.gm - a.gm;
    return a.clube.localeCompare(b.clube);
  });
}

function calcularClassificacao(resultados: ResultadoBanco[]) {
  const stats = criarEstatisticasBase();

  for (const resultado of resultados) {
    const casaStats = stats.get(resultado.casa);
    const foraStats = stats.get(resultado.fora);

    if (!casaStats || !foraStats || resultado.golos_casa == null || resultado.golos_fora == null) {
      continue;
    }

    const golosCasa = Number(resultado.golos_casa);
    const golosFora = Number(resultado.golos_fora);

    casaStats.pj += 1;
    foraStats.pj += 1;

    casaStats.gm += golosCasa;
    casaStats.gs += golosFora;
    foraStats.gm += golosFora;
    foraStats.gs += golosCasa;

    if (golosCasa > golosFora) {
      casaStats.v += 1;
      casaStats.pts += 3;
      foraStats.d += 1;
    } else if (golosCasa < golosFora) {
      foraStats.v += 1;
      foraStats.pts += 3;
      casaStats.d += 1;
    } else {
      casaStats.e += 1;
      foraStats.e += 1;
      casaStats.pts += 1;
      foraStats.pts += 1;
    }
  }

  for (const item of stats.values()) {
    item.dg = item.gm - item.gs;
  }

  const ordenada = ordenarClassificacao([...stats.values()]);

  if (ordenada.length === 0) {
    return [...stats.values()].sort((a, b) => a.clube.localeCompare(b.clube));
  }

  return ordenada;
}

export const Route = createFileRoute("/classificacao")({
  head: () => ({
    meta: [
      { title: "Classificação — Liga Uruguaia" },
      {
        name: "description",
        content: "Classificação atual da Liga Uruguaia, ignorando jornadas de taça.",
      },
      { property: "og:title", content: "Classificação — Liga Uruguaia" },
      {
        property: "og:description",
        content: "Classificação atual da Liga Uruguaia, ignorando jogos de taça.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClassificacaoPage,
});

function ClassificacaoPage() {
  const [rows, setRows] = useState<EstatisticaClube[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchClassificacao = async () => {
      try {
        const client = getResultadosClient();

        const { data, error } = await client
          .from("resultados")
          .select("*")
          .eq("jogado", true)
          .not("golos_casa", "is", null)
          .not("golos_fora", "is", null)
          .not("jornada", "in", "(7,16,24,33)");

        if (error) {
          throw error;
        }

        const dados = (data ?? []).filter((item) => !JORNADAS_TACA.has(Number(item.jornada)));
        const estatisticas = calcularClassificacao(dados as ResultadoBanco[]);

        if (!cancelled) {
          setRows(estatisticas);
        }
      } catch {
        if (!cancelled) {
          setRows(calcularClassificacao([]));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchClassificacao();
    return () => {
      cancelled = true;
    };
  }, []);

  const linhas = rows.length > 0 ? rows : calcularClassificacao([]);

  return (
    <div className="page-backdrop min-h-screen">
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <header className="pt-14 pb-8 sm:pt-20 sm:pb-10">
          <div className="flex items-center gap-3 text-primary">
            <Trophy className="h-5 w-5" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]">Primeira Divisão · Uruguai</p>
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold text-foreground sm:text-5xl">
            Classificação
          </h1>
        </header>

        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          ⚠️ Jogos de taça (jornadas 7, 16, 24 e 33) não contam para a classificação.
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            A carregar classificação...
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] sm:px-4">Pos</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] sm:px-4">Escudo</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] sm:px-4">Clube</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] sm:px-4">PJ</th>
                    <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] md:table-cell sm:px-4">V</th>
                    <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] md:table-cell sm:px-4">E</th>
                    <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] md:table-cell sm:px-4">D</th>
                    <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] md:table-cell sm:px-4">GM</th>
                    <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] md:table-cell sm:px-4">GS</th>
                    <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] md:table-cell sm:px-4">DG</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-[0.12em] sm:px-4">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((item, index) => {
                    const top4 = index < 4;
                    const bottom3 = index >= linhas.length - 3;

                    return (
                      <tr
                        key={item.clube}
                        className={cn(
                          "border-t border-border transition-colors hover:bg-accent/40",
                          top4 && "border-l-4 border-l-emerald-500",
                          !top4 && !bottom3 && "border-l-4 border-l-transparent",
                          bottom3 && "border-l-4 border-l-red-500",
                        )}
                      >
                        <td className="px-3 py-3 text-sm font-semibold text-foreground sm:px-4">{index + 1}</td>
                        <td className="px-3 py-3 sm:px-4">
                          <EscudoClube nome={item.clube} tamanho="sm" />
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-foreground sm:px-4">
                          <span className="inline-flex items-center gap-2">{item.clube}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-foreground sm:px-4">{item.pj}</td>
                        <td className="hidden px-3 py-3 text-sm text-foreground md:table-cell sm:px-4">{item.v}</td>
                        <td className="hidden px-3 py-3 text-sm text-foreground md:table-cell sm:px-4">{item.e}</td>
                        <td className="hidden px-3 py-3 text-sm text-foreground md:table-cell sm:px-4">{item.d}</td>
                        <td className="hidden px-3 py-3 text-sm text-foreground md:table-cell sm:px-4">{item.gm}</td>
                        <td className="hidden px-3 py-3 text-sm text-foreground md:table-cell sm:px-4">{item.gs}</td>
                        <td className="hidden px-3 py-3 text-sm text-foreground md:table-cell sm:px-4">{item.dg}</td>
                        <td className="px-3 py-3 text-base font-black text-primary sm:px-4">{item.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <SiteFooter />
      </div>
    </div>
  );
}
