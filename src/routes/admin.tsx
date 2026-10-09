import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { EstatisticasJogadores } from "@/components/EstatisticasJogadores";
import { EscudoClube } from "@/components/EscudoClube";
import { TotmEditor } from "@/components/TotmEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";
import { getJogosDaJornada } from "@/lib/taca";

type ResultadoRow = {
  key: string;
  casa: string;
  fora: string;
  golos_casa: number | null;
  golos_fora: number | null;
  jogado: boolean;
};

type AdminTab = "resultados" | "controladores" | "taca" | "totm" | "estatisticas";

type TacaFase = "quartos" | "meias" | "final";

type TacaConfronto = {
  id?: string;
  fase: TacaFase;
  slot: number;
  casa: string | null;
  fora: string | null;
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

function AdminPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("resultados");
  const [jornada, setJornada] = useState(1);
  const [rows, setRows] = useState<ResultadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});
  const [controladores, setControladores] = useState<Record<string, string>>({});
  const [controladoresLoading, setControladoresLoading] = useState(true);
  const [controladoresSaving, setControladoresSaving] = useState<Record<string, boolean>>({});
  const [controladoresFeedback, setControladoresFeedback] = useState<Record<string, string>>({});
  const [tacaConfrontos, setTacaConfrontos] = useState<Record<string, TacaConfronto>>({});
  const [tacaFeedback, setTacaFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});
  const [tacaSaving, setTacaSaving] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const fetchControladores = async () => {
      setControladoresLoading(true);
      const client = getResultadosClient();
      const { data, error } = await client.from("clubes_controladores").select("clube, controlador");

      if (error) {
        setControladores({});
        setControladoresLoading(false);
        return;
      }

      const nextValores = Object.fromEntries(
        (data ?? []).map((item) => [item.clube, item.controlador ?? ""]),
      );

      setControladores(nextValores);
      setControladoresLoading(false);
    };

    void fetchControladores();
  }, []);

  useEffect(() => {
    const fetchTacaConfrontos = async () => {
      const client = getResultadosClient();
      const { data, error } = await client.from("taca_confrontos").select("fase, slot, casa, fora");

      if (error || !data) {
        setTacaConfrontos({});
        return;
      }

      const nextMap: Record<string, TacaConfronto> = {};

      for (const item of data) {
        nextMap[`${item.fase}:${item.slot}`] = {
          fase: item.fase as TacaFase,
          slot: Number(item.slot),
          casa: item.casa ?? null,
          fora: item.fora ?? null,
        };
      }

      setTacaConfrontos(nextMap);
    };

    void fetchTacaConfrontos();
  }, []);

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

  const handleSaveControlador = async (clube: string) => {
    const controlador = (controladores[clube] ?? "").trim();
    setControladoresSaving((current) => ({ ...current, [clube]: true }));

    try {
      const client = getResultadosClient();
      const { error } = await client.from("clubes_controladores").upsert(
        { clube, controlador },
        { onConflict: "clube" },
      );

      if (error) {
        setControladoresFeedback((current) => ({
          ...current,
          [clube]: `Erro ao guardar: ${error.message}`,
        }));
        return;
      }

      setControladoresFeedback((current) => ({
        ...current,
        [clube]: "Guardado ✅",
      }));
    } finally {
      setControladoresSaving((current) => ({ ...current, [clube]: false }));
    }
  };

  const clubesOrdemAlfabetica = useMemo(
    () => [...liga.clubes].map((clube) => clube.nome).sort((a, b) => a.localeCompare(b)),
    [],
  );

  const getTacaSlotKey = (fase: TacaFase, slot: number) => `${fase}:${slot}`;

  const updateTacaValue = (fase: TacaFase, slot: number, lado: "casa" | "fora", value: string) => {
    const key = getTacaSlotKey(fase, slot);
    const current = tacaConfrontos[key] ?? { fase, slot, casa: null, fora: null };

    setTacaConfrontos((currentMap) => ({
      ...currentMap,
      [key]: {
        ...current,
        [lado]: value === "" ? null : value,
      },
    }));
  };

  const handleSaveTacaSlot = async (fase: TacaFase, slot: number) => {
    const key = getTacaSlotKey(fase, slot);
    const registro = tacaConfrontos[key] ?? { fase, slot, casa: null, fora: null };
    const casa = registro.casa ?? "";
    const fora = registro.fora ?? "";

    if (casa && fora && casa === fora) {
      setTacaFeedback((current) => ({
        ...current,
        [key]: { type: "error", message: "O mesmo clube não pode jogar contra si" },
      }));
      return;
    }

    setTacaSaving((current) => ({ ...current, [key]: true }));

    try {
      const client = getResultadosClient();

      if (!casa && !fora) {
        const { error } = await client.from("taca_confrontos").delete().eq("fase", fase).eq("slot", slot);

        if (error) {
          setTacaFeedback((current) => ({
            ...current,
            [key]: { type: "error", message: error.message },
          }));
          return;
        }

        setTacaFeedback((current) => ({
          ...current,
          [key]: { type: "success", message: "Guardado ✅" },
        }));
        return;
      }

      const { error } = await client.from("taca_confrontos").upsert(
        {
          fase,
          slot,
          casa: casa || null,
          fora: fora || null,
        },
        { onConflict: "fase,slot" },
      );

      if (error) {
        setTacaFeedback((current) => ({
          ...current,
          [key]: { type: "error", message: error.message },
        }));
        return;
      }

      setTacaFeedback((current) => ({
        ...current,
        [key]: { type: "success", message: "Guardado ✅" },
      }));
    } finally {
      setTacaSaving((current) => ({ ...current, [key]: false }));
    }
  };

  const renderTacaFase = (fase: TacaFase, slots: number[], titulo: string) => (
    <div key={fase} className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-xl font-bold text-foreground">{titulo}</h2>

      <div className="space-y-4">
        {slots.map((slot) => {
          const key = getTacaSlotKey(fase, slot);
          const registro = tacaConfrontos[key] ?? { fase, slot, casa: null, fora: null };
          const casaAtual = registro.casa ?? "";
          const foraAtual = registro.fora ?? "";

          return (
            <div key={key} className="rounded-2xl border border-border bg-background p-4">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Slot {slot}
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Casa
                  </label>
                  <select
                    value={casaAtual}
                    onChange={(event) => updateTacaValue(fase, slot, "casa", event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">— Selecionar clube —</option>
                    {clubesOrdemAlfabetica.map((clube) => (
                      <option key={clube} value={clube}>
                        {clube}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Fora
                  </label>
                  <select
                    value={foraAtual}
                    onChange={(event) => updateTacaValue(fase, slot, "fora", event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">— Selecionar clube —</option>
                    {clubesOrdemAlfabetica.map((clube) => (
                      <option key={clube} value={clube}>
                        {clube}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 lg:min-w-[124px]">
                  <button
                    type="button"
                    onClick={() => void handleSaveTacaSlot(fase, slot)}
                    disabled={Boolean(tacaSaving[key])}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {tacaSaving[key] ? "A guardar..." : "Guardar"}
                  </button>

                  {tacaFeedback[key] ? (
                    <div
                      className={
                        tacaFeedback[key].type === "success"
                          ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500"
                          : "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                      }
                    >
                      {tacaFeedback[key].message}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

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
            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
              {activeTab === "resultados"
                ? "Resultados"
                : activeTab === "controladores"
                  ? "Controladores"
                  : activeTab === "taca"
                    ? "Taça"
                    : activeTab === "totm"
                      ? "TOTM"
                      : "Estatísticas"}
            </h1>
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

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 md:w-auto">
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            <TabsTrigger value="controladores">Controladores</TabsTrigger>
            <TabsTrigger value="taca">Taça</TabsTrigger>
            <TabsTrigger value="totm">TOTM</TabsTrigger>
            <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="resultados">
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
                            feedback[row.key]?.type === "success"
                              ? "mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500"
                              : "mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                          }
                        >
                          {feedback[row.key]?.message}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="controladores">
            <div className="rounded-2xl border border-border bg-card p-4">
              {controladoresLoading ? (
                <div className="text-sm text-muted-foreground">A carregar controladores...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0 text-left">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="px-3 py-3 text-left">Clube</th>
                        <th className="px-3 py-3 text-left">Controlador</th>
                        <th className="px-3 py-3 text-right">Guardar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liga.clubes.map((clube) => (
                        <tr key={clube.nome} className="border-t border-border align-middle">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <EscudoClube nome={clube.nome} tamanho="sm" />
                              <span className="text-sm font-medium text-foreground">{clube.nome}</span>
                            </div>
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={controladores[clube.nome] ?? ""}
                              onChange={(event) =>
                                setControladores((current) => ({
                                  ...current,
                                  [clube.nome]: event.target.value,
                                }))
                              }
                              placeholder="Controlador"
                              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                            />
                          </td>

                          <td className="px-3 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleSaveControlador(clube.nome)}
                              disabled={Boolean(controladoresSaving[clube.nome])}
                              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {controladoresSaving[clube.nome] ? "A guardar..." : "Guardar"}
                            </button>

                            {controladoresFeedback[clube.nome] ? (
                              <div className="mt-2 text-left text-xs text-muted-foreground">
                                {controladoresFeedback[clube.nome]}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="taca">
            <div className="space-y-6">
              {renderTacaFase("quartos", [1, 2, 3, 4], "Quartos de Final")}
              {renderTacaFase("meias", [1, 2], "Meias-Finais")}
              {renderTacaFase("final", [1], "Final")}
            </div>
          </TabsContent>

          <TabsContent value="totm">
            <TotmEditor />
          </TabsContent>

          <TabsContent value="estatisticas">
            <EstatisticasJogadores />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
