import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { EscudoClube } from "@/components/EscudoClube";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";

type ResultadoRow = {
  key: string;
  casa: string;
  fora: string;
  golos_casa: number | null;
  golos_fora: number | null;
  jogado: boolean;
};

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const client = getResultadosClient();
    const { data } = await client.auth.getSession();

    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminPage,
});

function getJogosDaJornada(jornada: number) {
  const jogos = new Map<string, { casa: string; fora: string }>();
  const ordemJornada1 = new Map<string, number>([
    ["Boston River::Peñarol", 0],
    ["Cerro Largo::Montevideo Wanderers", 1],
    ["CA Cerro::Defensor SC", 2],
    ["CA Juventud::CD Maldonado", 3],
    ["Central Español FC::Nacional", 4],
    ["CA Progreso::Liverpool FC Montevideo", 5],
    ["Albion FC::Racing Club de Montevideo", 6],
    ["Danubio FC::Montevideo City Torque", 7],
  ]);

  for (const clube of liga.clubes) {
    for (const jogo of clube.jogos) {
      if (jogo.jornada !== jornada || jogo.adversario === "Indefinido") continue;

      const par = [clube.nome, jogo.adversario];
      const key = par.slice().sort((a, b) => a.localeCompare(b)).join("::");

      if (jogo.casa === true) {
        if (!jogos.has(key)) {
          jogos.set(key, { casa: clube.nome, fora: jogo.adversario });
        }
        continue;
      }

      if (jogo.casa === false) {
        if (!jogos.has(key)) {
          jogos.set(key, { casa: jogo.adversario, fora: clube.nome });
        }
        continue;
      }

      const [casaNull, foraNull] = par.slice().sort((a, b) => a.localeCompare(b));
      if (!jogos.has(key)) {
        jogos.set(key, { casa: casaNull, fora: foraNull });
      }
    }
  }

  const jogosOrdenados = [...jogos.values()];

  if (jornada === 1) {
    return jogosOrdenados.sort((a, b) => {
      const keyA = [a.casa, a.fora].slice().sort((x, y) => x.localeCompare(y)).join("::");
      const keyB = [b.casa, b.fora].slice().sort((x, y) => x.localeCompare(y)).join("::");
      return (ordemJornada1.get(keyA) ?? Number.MAX_SAFE_INTEGER) - (ordemJornada1.get(keyB) ?? Number.MAX_SAFE_INTEGER);
    });
  }

  return jogosOrdenados;
}

function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [jornada, setJornada] = useState(1);
  const [rows, setRows] = useState<ResultadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});

  useEffect(() => {
    try {
      const client = getResultadosClient();
      client.auth.getSession().then(({ data }) => setSession(data.session ?? null));
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession ?? null);
      });

      return () => subscription.unsubscribe();
    } catch {
      setSession(null);
      return undefined;
    }
  }, []);

  const jornadaOptions = useMemo(
    () => Array.from({ length: liga.total_jornadas }, (_, index) => index + 1),
    [],
  );

  useEffect(() => {
    const client = getResultadosClient();

    const fetchResults = async () => {
      setLoading(true);
      const { data, error } = await client.from("resultados").select("*").eq("jornada", jornada);

      if (error) {
        setRows([]);
        setLoading(false);
        return;
      }

      const mapa = new Map<string, (typeof data)[number]>();
      for (const item of data ?? []) {
        mapa.set(`${item.casa}::${item.fora}`, item);
      }

      const nextRows = getJogosDaJornada(jornada).map(({ casa, fora }) => {
        const item = mapa.get(`${casa}::${fora}`);
        return {
          key: `${casa}::${fora}`,
          casa,
          fora,
          golos_casa: item?.golos_casa ?? null,
          golos_fora: item?.golos_fora ?? null,
          jogado: Boolean(item?.jogado),
        };
      });

      setRows(nextRows);
      setLoading(false);
    };

    void fetchResults();
  }, [jornada]);

  useEffect(() => {
    const client = getResultadosClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        navigate({ to: "/login" });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const updateScore = (key: string, side: "golos_casa" | "golos_fora", value: string) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.key !== key) return row;

        const parsed = value === "" ? null : Number(value);

        return {
          ...row,
          [side]: parsed === null || Number.isFinite(parsed) ? parsed : row[side],
        };
      }),
    );
  };

  const handleSave = async (row: ResultadoRow) => {
    setSavingRows((current) => ({ ...current, [row.key]: true }));

    try {
      const client = getResultadosClient();
      const { error } = await client.from("resultados").upsert(
        {
          jornada,
          casa: row.casa,
          fora: row.fora,
          golos_casa: row.golos_casa,
          golos_fora: row.golos_fora,
          jogado: row.jogado,
        },
        { onConflict: "jornada,casa,fora" },
      );

      if (error) {
        setFeedback((current) => ({
          ...current,
          [row.key]: { type: "error", message: error.message },
        }));
        return;
      }

      setFeedback((current) => ({
        ...current,
        [row.key]: { type: "success", message: "Guardado ✅" },
      }));
    } finally {
      setSavingRows((current) => ({ ...current, [row.key]: false }));
    }
  };

  const handleLogout = async () => {
    const client = getResultadosClient();
    await client.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">Resultados</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{session?.user?.email ?? "Sessão ativa"}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <label htmlFor="jornada" className="mb-2 block text-sm font-medium text-foreground">
            Jornada
          </label>
          <select
            id="jornada"
            value={String(jornada)}
            onChange={(event) => setJornada(Number(event.target.value))}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            {jornadaOptions.map((option) => (
              <option key={option} value={option}>
                Jornada {option}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Carregando resultados...
          </div>
        ) : (
          <div className="space-y-4">
            {rows.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Nenhum jogo encontrado para esta jornada.
              </div>
            ) : (
              rows.map((row) => (
                <div key={row.key} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <EscudoClube nome={row.casa} tamanho="sm" />
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                          {row.casa}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={row.golos_casa ?? ""}
                          onChange={(event) => updateScore(row.key, "golos_casa", event.target.value)}
                          className="h-11 w-16 rounded-lg border border-input bg-background px-2 text-center text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                          aria-label={`Golos ${row.casa}`}
                          placeholder="0"
                        />
                        <span className="text-base font-semibold text-muted-foreground">vs</span>
                        <input
                          type="number"
                          min={0}
                          value={row.golos_fora ?? ""}
                          onChange={(event) => updateScore(row.key, "golos_fora", event.target.value)}
                          className="h-11 w-16 rounded-lg border border-input bg-background px-2 text-center text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                          aria-label={`Golos ${row.fora}`}
                          placeholder="0"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="min-w-0 truncate text-right text-sm font-semibold text-foreground">
                          {row.fora}
                        </span>
                        <EscudoClube nome={row.fora} tamanho="sm" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 lg:justify-end">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={row.jogado}
                          onChange={(event) =>
                            setRows((current) =>
                              current.map((currentRow) =>
                                currentRow.key === row.key
                                  ? { ...currentRow, jogado: event.target.checked }
                                  : currentRow,
                              ),
                            )
                          }
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        Jogado
                      </label>

                      <button
                        type="button"
                        onClick={() => void handleSave(row)}
                        disabled={savingRows[row.key]}
                        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingRows[row.key] ? "A guardar..." : "Guardar"}
                      </button>
                    </div>
                  </div>

                  {feedback[row.key] ? (
                    <div
                      className={
                        feedback[row.key].type === "success"
                          ? "mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500"
                          : "mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      }
                    >
                      {feedback[row.key].message}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
