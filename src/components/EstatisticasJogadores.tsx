import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { getResultadosClient } from "@/lib/resultados-client";
import { liga } from "@/lib/liga";

type PlayerValues = {
  nome_jogador: string;
  clube: string;
  golos: string;
  assistencias: string;
  jogos: string;
};

type PlayerRecord = {
  id: string;
  nome_jogador: string;
  clube: string;
  golos: number;
  assistencias: number;
  jogos: number;
};

type PlayerRow = PlayerValues & {
  rowKey: string;
  id: string | null;
  baseline: PlayerValues;
};

type SortField = "golos" | "assistencias" | "jogos";
type Feedback = { type: "success" | "error"; message: string };

const emptyValues = (): PlayerValues => ({
  nome_jogador: "",
  clube: "",
  golos: "",
  assistencias: "",
  jogos: "",
});

const toValues = (record: PlayerRecord): PlayerValues => ({
  nome_jogador: record.nome_jogador ?? "",
  clube: record.clube ?? "",
  golos: String(record.golos ?? 0),
  assistencias: String(record.assistencias ?? 0),
  jogos: String(record.jogos ?? 0),
});

const createDraft = (): PlayerRow => {
  const values = emptyValues();
  return {
    ...values,
    rowKey: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    id: null,
    baseline: values,
  };
};

function valuesChanged(row: PlayerRow): boolean {
  return (
    row.nome_jogador !== row.baseline.nome_jogador ||
    row.clube !== row.baseline.clube ||
    row.golos !== row.baseline.golos ||
    row.assistencias !== row.baseline.assistencias ||
    row.jogos !== row.baseline.jogos
  );
}

function isEmptyDraft(row: PlayerRow): boolean {
  return row.id === null &&
    !row.nome_jogador.trim() &&
    !row.clube &&
    !row.golos &&
    !row.assistencias &&
    !row.jogos;
}

function compareRows(a: PlayerRow, b: PlayerRow, sortField: SortField, direction: "asc" | "desc"): number {
  const directionFactor = direction === "desc" ? -1 : 1;
  const primaryDifference = (Number(a[sortField]) - Number(b[sortField])) * directionFactor;
  if (primaryDifference !== 0) return primaryDifference;

  if (sortField !== "golos") {
    const goalsDifference = Number(b.golos) - Number(a.golos);
    if (goalsDifference !== 0) return goalsDifference;
  }

  if (sortField !== "assistencias") {
    const assistsDifference = Number(b.assistencias) - Number(a.assistencias);
    if (assistsDifference !== 0) return assistsDifference;
  }

  return a.nome_jogador.localeCompare(b.nome_jogador, "pt");
}

export function EstatisticasJogadores() {
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clubFilter, setClubFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("golos");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});

  const clubs = useMemo(
    () => liga.clubes.map((club) => club.nome).sort((a, b) => a.localeCompare(b, "pt")),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const loadRows = async () => {
      setLoading(true);
      const client = getResultadosClient();
      const { data, error } = await client
        .from("estatisticas_jogadores")
        .select("id, nome_jogador, clube, golos, assistencias, jogos")
        .order("golos", { ascending: false });

      if (cancelled) return;

      if (error) {
        setRows([]);
        setLoadError(`Erro ao carregar estatísticas: ${error.message}`);
      } else {
        const records = (data ?? []) as PlayerRecord[];
        setRows(records.map((record) => {
          const values = toValues(record);
          return { ...values, rowKey: `db-${record.id}`, id: record.id, baseline: values };
        }));
        setLoadError(null);
      }

      setLoading(false);
    };

    void loadRows();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt");
    const filteredRows = rows.filter((row) => {
      if (row.id === null) return true;
      const clubMatches = !clubFilter || row.clube === clubFilter;
      const nameMatches = !query || row.nome_jogador.toLocaleLowerCase("pt").includes(query);
      return clubMatches && nameMatches;
    });

    const drafts = filteredRows.filter((row) => row.id === null);
    const savedRows = filteredRows
      .filter((row) => row.id !== null)
      .sort((a, b) => compareRows(a, b, sortField, sortDirection));
    return [...drafts, ...savedRows];
  }, [clubFilter, rows, search, sortDirection, sortField]);

  const updateRow = (rowKey: string, field: keyof PlayerValues, value: string) => {
    setRows((current) => current.map((row) =>
      row.rowKey === rowKey ? { ...row, [field]: value } : row,
    ));
    setFeedback((current) => {
      const next = { ...current };
      delete next[rowKey];
      return next;
    });
  };

  const discardOtherEmptyDrafts = (activeRowKey: string) => {
    setRows((current) => current.filter((row) => row.rowKey === activeRowKey || !isEmptyDraft(row)));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => current === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSave = async (row: PlayerRow) => {
    const nomeJogador = row.nome_jogador.trim();
    const golos = Number(row.golos);
    const assistencias = Number(row.assistencias);
    const jogos = Number(row.jogos);

    if (!nomeJogador || !row.clube) {
      setFeedback((current) => ({
        ...current,
        [row.rowKey]: { type: "error", message: "Jogador e clube são obrigatórios." },
      }));
      return;
    }

    if ([row.golos, row.assistencias, row.jogos].some((value) => value.trim() === "") ||
      ![golos, assistencias, jogos].every((value) => Number.isInteger(value) && value >= 0)) {
      setFeedback((current) => ({
        ...current,
        [row.rowKey]: { type: "error", message: "Golos, assistências e jogos devem ser inteiros iguais ou superiores a 0." },
      }));
      return;
    }

    const duplicates = rows.filter((candidate) =>
      candidate.rowKey !== row.rowKey &&
      candidate.nome_jogador.trim() === nomeJogador &&
      candidate.clube === row.clube,
    );

    if (duplicates.length > 0 && !window.confirm(`Já existe ${nomeJogador} (${row.clube}). Queres substituir esse registo?`)) {
      return;
    }

    setSavingRows((current) => ({ ...current, [row.rowKey]: true }));
    setFeedback((current) => {
      const next = { ...current };
      delete next[row.rowKey];
      return next;
    });

    try {
      const client = getResultadosClient();
      const { data, error } = await client
        .from("estatisticas_jogadores")
        .upsert(
          {
            nome_jogador: nomeJogador,
            clube: row.clube,
            golos,
            assistencias,
            jogos,
          },
          { onConflict: "nome_jogador,clube" },
        )
        .select("id, nome_jogador, clube, golos, assistencias, jogos")
        .single();

      if (error) {
        setFeedback((current) => ({
          ...current,
          [row.rowKey]: { type: "error", message: `Erro ao guardar: ${error.message}` },
        }));
        return;
      }

      const savedRecord = data as PlayerRecord;
      const values = toValues(savedRecord);
      const idsToRemove = new Set(
        [row.id, ...duplicates.map((duplicate) => duplicate.id)]
          .filter((id): id is string => id !== null && id !== savedRecord.id),
      );

      if (idsToRemove.size > 0) {
        const { error: cleanupError } = await client
          .from("estatisticas_jogadores")
          .delete()
          .in("id", [...idsToRemove]);

        if (cleanupError) {
          setFeedback((current) => ({
            ...current,
            [row.rowKey]: {
              type: "error",
              message: `Guardado, mas não foi possível limpar o registo anterior: ${cleanupError.message}`,
            },
          }));
        } else {
          setFeedback((current) => ({
            ...current,
            [row.rowKey]: { type: "success", message: "Guardado ✅" },
          }));
        }
      } else {
        setFeedback((current) => ({
          ...current,
          [row.rowKey]: { type: "success", message: "Guardado ✅" },
        }));
      }

      const savedRow: PlayerRow = {
        ...values,
        rowKey: row.rowKey,
        id: savedRecord.id,
        baseline: values,
      };
      const duplicateKeys = new Set(duplicates.map((duplicate) => duplicate.rowKey));
      setRows((current) => [
        savedRow,
        ...current.filter((candidate) =>
          candidate.rowKey !== row.rowKey &&
          !duplicateKeys.has(candidate.rowKey) &&
          !idsToRemove.has(candidate.id ?? ""),
        ),
      ]);
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [row.rowKey]: {
          type: "error",
          message: error instanceof Error ? `Erro ao guardar: ${error.message}` : "Erro ao guardar o jogador.",
        },
      }));
    } finally {
      setSavingRows((current) => ({ ...current, [row.rowKey]: false }));
    }
  };

  const handleDelete = async (row: PlayerRow) => {
    if (!window.confirm(`Tens a certeza que queres apagar ${row.nome_jogador || "esta linha"}?`)) return;

    if (!row.id) {
      setRows((current) => current.filter((candidate) => candidate.rowKey !== row.rowKey));
      return;
    }

    setSavingRows((current) => ({ ...current, [row.rowKey]: true }));
    try {
      const client = getResultadosClient();
      const { error } = await client.from("estatisticas_jogadores").delete().eq("id", row.id);

      if (error) {
        setFeedback((current) => ({
          ...current,
          [row.rowKey]: { type: "error", message: `Erro ao apagar: ${error.message}` },
        }));
        return;
      }

      setRows((current) => current.filter((candidate) => candidate.rowKey !== row.rowKey));
      setFeedback((current) => {
        const next = { ...current };
        delete next[row.rowKey];
        return next;
      });
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [row.rowKey]: {
          type: "error",
          message: error instanceof Error ? `Erro ao apagar: ${error.message}` : "Erro ao apagar o jogador.",
        },
      }));
    } finally {
      setSavingRows((current) => ({ ...current, [row.rowKey]: false }));
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />;
    return sortDirection === "desc"
      ? <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      : <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={clubFilter}
            onChange={(event) => setClubFilter(event.target.value)}
            aria-label="Filtrar por clube"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Todos os clubes</option>
            {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
          </select>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pesquisar jogador"
            aria-label="Pesquisar jogador"
            className="min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-64"
          />
        </div>

        <button
          type="button"
          onClick={() => setRows((current) => [createDraft(), ...current.filter((row) => !isEmptyDraft(row))])}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 lg:self-auto"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar jogador
        </button>
      </div>

      {loadError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">A carregar estatísticas...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Jogador</th>
                <th className="px-3 py-3">Clube</th>
                <th className="px-3 py-3">
                  <button type="button" onClick={() => handleSort("golos")} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    Golos {renderSortIcon("golos")}
                  </button>
                </th>
                <th className="px-3 py-3">
                  <button type="button" onClick={() => handleSort("assistencias")} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    Assistências {renderSortIcon("assistencias")}
                  </button>
                </th>
                <th className="px-3 py-3">
                  <button type="button" onClick={() => handleSort("jogos")} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    Jogos {renderSortIcon("jogos")}
                  </button>
                </th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const dirty = valuesChanged(row);
                const saving = Boolean(savingRows[row.rowKey]);
                const rowFeedback = feedback[row.rowKey];

                return (
                  <tr
                    key={row.rowKey}
                    onFocusCapture={() => discardOtherEmptyDrafts(row.rowKey)}
                    onClickCapture={() => discardOtherEmptyDrafts(row.rowKey)}
                    className={`border-t border-border transition-colors ${dirty ? "border-l-2 border-l-sky-500 bg-sky-500/5" : "border-l-2 border-l-transparent"}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {dirty ? <Pencil className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-label="Alterações por guardar" /> : null}
                        <input
                          type="text"
                          value={row.nome_jogador}
                          onChange={(event) => updateRow(row.rowKey, "nome_jogador", event.target.value)}
                          aria-label="Jogador"
                          placeholder="Nome do jogador"
                          className="w-full min-w-40 rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <select
                        value={row.clube}
                        onChange={(event) => updateRow(row.rowKey, "clube", event.target.value)}
                        aria-label="Clube"
                        className="w-full min-w-44 rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                      >
                        <option value="">Selecionar clube</option>
                        {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
                      </select>
                    </td>
                    {(["golos", "assistencias", "jogos"] as const).map((field) => (
                      <td key={field} className="px-3 py-2.5">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={row[field]}
                          onChange={(event) => updateRow(row.rowKey, field, event.target.value)}
                          aria-label={field === "golos" ? "Golos" : field === "assistencias" ? "Assistências" : "Jogos"}
                          className="w-24 rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSave(row)}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Save className="h-3.5 w-3.5" aria-hidden="true" />
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(row)}
                            disabled={saving}
                            aria-label={`Apagar ${row.nome_jogador || "linha"}`}
                            className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Apagar
                          </button>
                        </div>
                        {rowFeedback ? (
                          <span role="status" className={rowFeedback.type === "success" ? "text-xs text-emerald-500" : "text-xs text-destructive"}>
                            {rowFeedback.message}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Nenhum jogador encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}