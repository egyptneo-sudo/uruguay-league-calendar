import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";

type PlayerStats = {
  id: string;
  nome_jogador: string;
  clube: string;
  golos: number;
  assistencias: number;
  jogos: number;
};

type LeaderboardKind = "artilheiros" | "assistencias" | "ga";

const metricLabels: Record<LeaderboardKind, string> = {
  artilheiros: "Golos",
  assistencias: "Assistências",
  ga: "G/A",
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const particles = new Set(["da", "das", "de", "do", "dos", "e"]);
  const significantWords = words.filter((word) => !particles.has(word.toLocaleLowerCase("pt")));
  const usableWords = significantWords.length > 0 ? significantWords : words;

  if (usableWords.length === 0) return "?";
  if (usableWords.length === 1) return Array.from(usableWords[0]!)[0]!.toLocaleUpperCase("pt-PT");

  const first = Array.from(usableWords[0]!)[0] ?? "";
  const last = Array.from(usableWords[usableWords.length - 1]!)[0] ?? "";
  return `${first}${last}`.toLocaleUpperCase("pt-PT");
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (const character of name.trim().toLocaleLowerCase("pt")) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360} 54% 32%)`;
}

function getMetric(player: PlayerStats, kind: LeaderboardKind): number {
  if (kind === "artilheiros") return player.golos;
  if (kind === "assistencias") return player.assistencias;
  return player.golos + player.assistencias;
}

function comparePlayers(a: PlayerStats, b: PlayerStats, kind: LeaderboardKind): number {
  const metricDifference = getMetric(b, kind) - getMetric(a, kind);
  if (metricDifference !== 0) return metricDifference;

  if (b.golos !== a.golos) return b.golos - a.golos;
  if (kind === "artilheiros" && b.assistencias !== a.assistencias) {
    return b.assistencias - a.assistencias;
  }
  if (kind === "assistencias" && b.golos !== a.golos) return b.golos - a.golos;
  return a.nome_jogador.localeCompare(b.nome_jogador, "pt");
}

function getRankStyle(rank: number): string {
  if (rank === 0) return "bg-amber-400/10";
  if (rank === 1) return "bg-slate-300/10";
  if (rank === 2) return "bg-orange-500/10";
  return "";
}

function getMedal(rank: number): string {
  if (rank === 0) return "🥇";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return "";
}

function Leaderboard({
  kind,
  players,
  loading,
  error,
  clubFilter,
  search,
  filtersApplied,
  onClearFilters,
}: {
  kind: LeaderboardKind;
  players: PlayerStats[];
  loading: boolean;
  error: string | null;
  clubFilter: string;
  search: string;
  filtersApplied: boolean;
  onClearFilters: () => void;
}) {
  const rankedPlayers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt");
    const filtered = players.filter((player) => {
      const clubMatches = !clubFilter || player.clube === clubFilter;
      const nameMatches = !query || player.nome_jogador.toLocaleLowerCase("pt").includes(query);
      return clubMatches && nameMatches;
    });

    return filtered
      .filter((player) => getMetric(player, kind) > 0)
      .sort((a, b) => comparePlayers(a, b, kind));
  }, [clubFilter, kind, players, search]);

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">A carregar estatísticas...</div>;
  }

  if (error) {
    return <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>;
  }

  if (players.length === 0) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Ainda sem estatísticas registadas</div>;
  }

  if (rankedPlayers.length === 0) {
    if (filtersApplied) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum jogador encontrado com estes filtros</p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Limpar filtros
          </button>
        </div>
      );
    }

    return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">Ainda não há jogadores com esta métrica</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              <th className="w-20 px-3 py-3 text-xs font-bold uppercase tracking-wide sm:px-4">Posição</th>
              <th className="w-14 px-2 py-3" aria-label="Avatar" />
              <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide sm:px-4">Jogador</th>
              <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide sm:px-4">Clube</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide sm:px-4">{metricLabels[kind]}</th>
              <th className="w-16 px-3 py-3 text-right text-xs font-bold uppercase tracking-wide sm:px-4">PJ</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {rankedPlayers.map((player, index) => {
                const rank = index + 1;
                const medal = getMedal(index);
                const gaTotal = player.golos + player.assistencias;

                return (
                  <motion.tr
                    key={`${kind}-${player.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.035, 0.35) }}
                    className={`border-t border-border transition-colors hover:bg-accent/40 ${getRankStyle(index)}`}
                  >
                    <td className="px-3 py-3 text-sm font-bold text-foreground sm:px-4">
                      <span className="inline-flex items-center gap-1.5">
                        {medal ? <span aria-hidden="true">{medal}</span> : null}
                        <span>{rank}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ring-1 ring-white/15"
                        style={{ backgroundColor: getAvatarColor(player.nome_jogador) }}
                        aria-label={`Iniciais de ${player.nome_jogador}`}
                      >
                        {getInitials(player.nome_jogador)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm font-bold text-foreground sm:px-4">{player.nome_jogador}</td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-2">
                        <EscudoClube nome={player.clube} tamanho="sm" className="h-8 w-8" />
                        <span className="text-sm text-foreground">{player.clube}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <div className="font-display text-lg font-bold tabular-nums text-primary sm:text-xl">
                        {getMetric(player, kind)}
                      </div>
                      {kind === "ga" ? (
                        <div className="text-[10px] text-muted-foreground">
                          {player.golos} golos · {player.assistencias} assist.
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground sm:px-4">{player.jogos}</td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas · Liga Uruguaia OSM" },
      { name: "description", content: "Melhores marcadores e assistentes da Liga Uruguaia OSM." },
    ],
  }),
  component: EstatisticasPage,
});

function EstatisticasPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardKind>("artilheiros");
  const [clubFilter, setClubFilter] = useState("");
  const [search, setSearch] = useState("");

  const clubs = useMemo(
    () => liga.clubes.map((club) => club.nome).sort((a, b) => a.localeCompare(b, "pt")),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchPlayers = async () => {
      const client = getResultadosClient();
      const { data, error: fetchError } = await client
        .from("estatisticas_jogadores")
        .select("id, nome_jogador, clube, golos, assistencias, jogos");

      if (cancelled) return;

      if (fetchError) {
        setError(`Não foi possível carregar as estatísticas: ${fetchError.message}`);
      } else {
        setPlayers((data ?? []) as PlayerStats[]);
      }
      setLoading(false);
    };

    void fetchPlayers();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtersApplied = Boolean(clubFilter || search.trim());
  const clearFilters = () => {
    setClubFilter("");
    setSearch("");
  };

  const leaderboardProps = {
    players,
    loading,
    error,
    clubFilter,
    search,
    filtersApplied,
    onClearFilters: clearFilters,
  };

  return (
    <main className="page-backdrop min-h-screen px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="pb-7 pt-12 sm:pb-9 sm:pt-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Liga Uruguaia OSM</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-5xl">
            Estatísticas <span className="text-muted-foreground">· Liga Uruguaia OSM</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Melhores marcadores e assistentes</p>
        </header>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={clubFilter}
            onChange={(event) => setClubFilter(event.target.value)}
            aria-label="Filtrar por clube"
            className="rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:max-w-xs"
          >
            <option value="">Todos os clubes</option>
            {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
          </select>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar jogador"
            aria-label="Pesquisar por nome de jogador"
            className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 sm:max-w-sm"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeaderboardKind)} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:inline-flex sm:w-auto">
            <TabsTrigger value="artilheiros" className="gap-1.5 px-2 sm:px-3">⚽ <span>Artilheiros</span></TabsTrigger>
            <TabsTrigger value="assistencias" className="gap-1.5 px-2 sm:px-3">🅰️ <span>Assistências</span></TabsTrigger>
            <TabsTrigger value="ga" className="gap-1.5 px-2 sm:px-3">⭐ <span>G/A</span></TabsTrigger>
          </TabsList>

          <TabsContent value="artilheiros">
            <Leaderboard kind="artilheiros" {...leaderboardProps} />
          </TabsContent>
          <TabsContent value="assistencias">
            <Leaderboard kind="assistencias" {...leaderboardProps} />
          </TabsContent>
          <TabsContent value="ga">
            <Leaderboard kind="ga" {...leaderboardProps} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}