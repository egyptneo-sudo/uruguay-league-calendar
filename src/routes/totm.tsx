import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { getResultadosClient } from "@/lib/resultados-client";
import { liga } from "@/lib/liga";

type TotmPlayer = {
  jornada: number;
  slot: number;
  posicao: string;
  nome_jogador: string;
  overall: number;
  clube: string;
};

const slotsByRow = [
  [9, 10, 11],
  [6, 7, 8],
  [2, 3, 4, 5],
  [1],
];

const positionBySlot: Record<number, string> = {
  1: "GR",
  2: "DD",
  3: "DC",
  4: "DC",
  5: "DE",
  6: "MC",
  7: "MC",
  8: "MC",
  9: "AD",
  10: "AC",
  11: "AE",
};

export const Route = createFileRoute("/totm")({
  head: () => ({
    meta: [
      { title: "Team Of The Matchday | Liga Uruguaia OSM" },
      {
        name: "description",
        content: "A equipa da jornada da Liga Uruguaia OSM, em formação 4-3-3.",
      },
    ],
  }),
  component: TotmPage,
});

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0]!)[0] ?? "";
  const last = words.length > 1 ? Array.from(words[words.length - 1]!)[0] ?? "" : "";
  return `${first}${last}`.toLocaleUpperCase("pt-PT");
}

function getCardColors(overall: number): string {
  if (overall >= 100) return "from-purple-400 to-purple-600 text-white border-purple-200/70";
  if (overall >= 90) return "from-yellow-400 to-yellow-600 text-slate-950 border-yellow-100/70";
  if (overall >= 85) return "from-yellow-300 to-yellow-500 text-slate-950 border-yellow-50/70";
  if (overall >= 80) return "from-gray-300 to-gray-500 text-slate-900 border-white/70";
  if (overall >= 75) return "from-orange-400 to-orange-600 text-white border-orange-200/60";
  return "from-gray-600 to-gray-800 text-white border-gray-300/40";
}

function PlayerCard({ player, index }: { player: TotmPlayer; index: number }) {
  const position = positionBySlot[player.slot] ?? player.posicao;
  const colors = getCardColors(player.overall);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.32, delay: index * 0.045, ease: "easeOut" }}
      title={`${player.nome_jogador} · ${player.overall} · ${player.clube}`}
      className={`relative flex h-[110px] w-[80px] shrink-0 flex-col overflow-hidden rounded-xl border bg-gradient-to-b shadow-lg shadow-black/25 sm:h-[150px] sm:w-[110px] ${colors}`}
    >
      <div className="flex items-start justify-between px-2 pt-1.5 sm:px-2.5 sm:pt-2">
        <span className="font-display text-xl font-bold leading-none sm:text-3xl">{player.overall}</span>
        <span className="pt-0.5 text-[9px] font-bold uppercase sm:text-xs">{position}</span>
      </div>

      <div className="grid flex-1 place-items-center pb-1">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-black/15 text-base font-bold ring-1 ring-white/25 sm:h-12 sm:w-12 sm:text-xl">
          {getInitials(player.nome_jogador)}
        </span>
      </div>

      <div className="min-w-0 bg-black/10 px-1.5 pb-1.5 pt-1 text-center sm:px-2 sm:pb-2 sm:pt-1.5">
        <p className="truncate text-[9px] font-bold leading-tight sm:text-xs" title={player.nome_jogador}>
          {player.nome_jogador}
        </p>
        <div className="mt-1 flex min-w-0 items-center justify-center gap-1">
          <EscudoClube nome={player.clube} tamanho="sm" className="h-4 w-4 rounded-sm text-[5px] ring-0 sm:h-5 sm:w-5" />
          <span className="truncate text-[7px] leading-tight sm:text-[9px]" title={player.clube}>
            {player.clube}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function TotmPage() {
  const [jornada, setJornada] = useState<number | null>(null);
  const [loadedJornada, setLoadedJornada] = useState<number | null>(null);
  const [players, setPlayers] = useState<TotmPlayer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const findLatestJornada = async () => {
      const client = getResultadosClient();
      const { data, error } = await client
        .from("totm")
        .select("jornada")
        .order("jornada", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) setJornada(error ? 1 : data?.jornada ?? 1);
    };

    void findLatestJornada();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (jornada === null) return;
    let cancelled = false;

    const fetchJornada = async () => {
      const client = getResultadosClient();
      const { data, error } = await client
        .from("totm")
        .select("jornada, slot, posicao, nome_jogador, overall, clube")
        .eq("jornada", jornada);

      if (cancelled) return;

      if (error) {
        setPlayers([]);
        setLoadError(`Não foi possível carregar o TOTM: ${error.message}`);
      } else {
        setPlayers((data ?? []) as TotmPlayer[]);
        setLoadError(null);
      }

      setLoadedJornada(jornada);
    };

    void fetchJornada();
    return () => {
      cancelled = true;
    };
  }, [jornada]);

  const jornadas = Array.from({ length: liga.total_jornadas }, (_, index) => index + 1);
  const playersBySlot = new Map(players.map((player) => [player.slot, player]));

  return (
    <main className="page-backdrop min-h-screen px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="pb-7 pt-10 text-center sm:pb-9 sm:pt-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Liga Uruguaia OSM
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-5xl">
            Team Of The Matchday
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Os 11 destaques da jornada em formação 4-3-3</p>
        </header>

        <div className="mx-auto mb-6 flex max-w-[700px] items-center justify-between gap-3">
          <label htmlFor="totm-public-jornada" className="text-sm font-semibold text-foreground">
            Jornada
          </label>
          <div className="flex items-center gap-3">
            {loadedJornada !== null && loadedJornada !== jornada ? (
              <span className="text-xs text-muted-foreground" role="status">A carregar...</span>
            ) : null}
            <select
              id="totm-public-jornada"
              value={jornada ?? 1}
              onChange={(event) => setJornada(Number(event.target.value))}
              disabled={jornada === null}
              className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
            >
              {jornadas.map((option) => (
                <option key={option} value={option}>
                  Jornada {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadedJornada === null ? (
          <div className="mx-auto flex aspect-[7/9] w-full max-w-[700px] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            A carregar equipa da jornada...
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={loadedJornada}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              {loadError ? (
                <div role="alert" className="mx-auto max-w-[700px] rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center text-sm text-destructive">
                  {loadError}
                </div>
              ) : players.length === 0 ? (
                <div className="mx-auto max-w-[700px] rounded-xl border border-dashed border-border bg-card/80 p-8 text-center text-sm text-muted-foreground">
                  Ainda sem TOTM desta jornada
                </div>
              ) : (
                <div
                  aria-label={`Equipa da jornada ${loadedJornada} em formação 4-3-3`}
                  className="relative mx-auto aspect-[7/9] w-full max-w-[700px] overflow-hidden rounded-2xl border border-emerald-950/50 bg-emerald-900 shadow-2xl shadow-emerald-950/20"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 10%)",
                  }}
                >
                  <div className="pointer-events-none absolute inset-[3.5%] border border-white/30" />
                  <div className="pointer-events-none absolute left-[3.5%] right-[3.5%] top-1/2 border-t border-white/30" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[23%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
                  <div className="pointer-events-none absolute left-1/2 top-[3.5%] h-[17%] w-[58%] -translate-x-1/2 border border-white/30" />
                  <div className="pointer-events-none absolute left-1/2 top-[3.5%] h-[8%] w-[30%] -translate-x-1/2 border border-white/30" />
                  <div className="pointer-events-none absolute bottom-[3.5%] left-1/2 h-[17%] w-[58%] -translate-x-1/2 border border-white/30" />
                  <div className="pointer-events-none absolute bottom-[3.5%] left-1/2 h-[8%] w-[30%] -translate-x-1/2 border border-white/30" />

                  <div className="absolute inset-[5%] z-10 flex flex-col justify-around">
                    {slotsByRow.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex w-full items-center justify-around gap-1">
                        {row.map((slot) => {
                          const player = playersBySlot.get(slot);
                          return player ? (
                            <PlayerCard key={slot} player={player} index={slot - 1} />
                          ) : (
                            <div key={slot} className="h-[110px] w-[80px] shrink-0 sm:h-[150px] sm:w-[110px]" aria-hidden="true" />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
