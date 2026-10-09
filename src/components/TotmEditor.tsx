import { useEffect, useMemo, useState } from "react";
import { liga } from "@/lib/liga";
import { getResultadosClient } from "@/lib/resultados-client";

const slotDefinitions = [
  { slot: 1, position: "GR", label: "GR — Guarda-redes" },
  { slot: 2, position: "DD", label: "DD — Defesa direito" },
  { slot: 3, position: "DC", label: "DC — Defesa central direito" },
  { slot: 4, position: "DC", label: "DC — Defesa central esquerdo" },
  { slot: 5, position: "DE", label: "DE — Defesa esquerdo" },
  { slot: 6, position: "MC", label: "MC — Médio centro" },
  { slot: 7, position: "MC", label: "MC — Médio centro" },
  { slot: 8, position: "MC", label: "MC — Médio centro" },
  { slot: 9, position: "AD", label: "AD — Avançado direito" },
  { slot: 10, position: "AC", label: "AC — Avançado centro" },
  { slot: 11, position: "AE", label: "AE — Avançado esquerdo" },
] as const;

type SlotValue = {
  nome_jogador: string;
  overall: string;
  clube: string;
};

type TotmRecord = {
  slot: number;
  nome_jogador: string;
  overall: number;
  clube: string;
};

const createEmptySlots = (): Record<number, SlotValue> =>
  Object.fromEntries(
    slotDefinitions.map(({ slot }) => [slot, { nome_jogador: "", overall: "", clube: "" }]),
  ) as Record<number, SlotValue>;

export function TotmEditor() {
  const [jornada, setJornada] = useState(1);
  const [slots, setSlots] = useState<Record<number, SlotValue>>(createEmptySlots);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const jornadaOptions = useMemo(
    () => Array.from({ length: liga.total_jornadas }, (_, index) => index + 1),
    [],
  );
  const clubes = useMemo(
    () => liga.clubes.map((clube) => clube.nome).sort((a, b) => a.localeCompare(b)),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchTotm = async () => {
      setLoading(true);
      setFeedback(null);
      const client = getResultadosClient();
      const { data, error } = await client
        .from("totm")
        .select("slot, nome_jogador, overall, clube")
        .eq("jornada", jornada);

      if (cancelled) return;

      if (error) {
        setSlots(createEmptySlots());
        setFeedback({ type: "error", message: `Erro ao carregar TOTM: ${error.message}` });
        setLoading(false);
        return;
      }

      const nextSlots = createEmptySlots();
      for (const record of (data ?? []) as TotmRecord[]) {
        if (!nextSlots[record.slot]) continue;
        nextSlots[record.slot] = {
          nome_jogador: record.nome_jogador ?? "",
          overall: record.overall == null ? "" : String(record.overall),
          clube: record.clube ?? "",
        };
      }

      setSlots(nextSlots);
      setLoading(false);
    };

    void fetchTotm();
    return () => {
      cancelled = true;
    };
  }, [jornada]);

  const updateSlot = (slot: number, field: keyof SlotValue, value: string) => {
    setSlots((current) => ({
      ...current,
      [slot]: { ...current[slot], [field]: value },
    }));
    setFeedback(null);
  };

  const handleSave = async () => {
    const invalidSlot = slotDefinitions.find(({ slot }) => {
      const value = slots[slot];
      const overall = Number(value.overall);
      return (
        !value.nome_jogador.trim() ||
        !Number.isInteger(overall) ||
        overall < 1 ||
        !value.clube
      );
    });

    if (invalidSlot) {
      setFeedback({
        type: "error",
        message: `Preenche jogador, overall (mínimo 1) e clube em ${invalidSlot.label}.`,
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const records = slotDefinitions.map(({ slot, position }) => ({
        jornada,
        slot,
        posicao: position,
        nome_jogador: slots[slot].nome_jogador.trim(),
        overall: Number(slots[slot].overall),
        clube: slots[slot].clube,
      }));
      const client = getResultadosClient();
      const { error } = await client.from("totm").upsert(records, { onConflict: "jornada,slot" });

      if (error) {
        setFeedback({ type: "error", message: `Erro ao guardar: ${error.message}` });
        return;
      }

      setFeedback({ type: "success", message: "Guardado ✅" });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? `Erro ao guardar: ${error.message}` : "Erro ao guardar o TOTM.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="max-w-xs">
        <label htmlFor="totm-jornada" className="mb-2 block text-sm font-medium text-foreground">
          Jornada
        </label>
        <select
          id="totm-jornada"
          value={jornada}
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
        <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
          A carregar TOTM...
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {slotDefinitions.map(({ slot, label }) => (
              <fieldset key={slot} className="min-w-0 space-y-3 rounded-xl border border-border bg-background/30 p-4">
                <legend className="px-1 text-sm font-semibold text-foreground">{label}</legend>

                <div>
                  <label htmlFor={`totm-player-${slot}`} className="mb-1.5 block text-xs text-muted-foreground">
                    Nome do jogador
                  </label>
                  <input
                    id={`totm-player-${slot}`}
                    type="text"
                    value={slots[slot].nome_jogador}
                    onChange={(event) => updateSlot(slot, "nome_jogador", event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-3">
                  <div>
                    <label htmlFor={`totm-overall-${slot}`} className="mb-1.5 block text-xs text-muted-foreground">
                      Overall
                    </label>
                    <input
                      id={`totm-overall-${slot}`}
                      type="number"
                      min={1}
                      max={999}
                      step={1}
                      value={slots[slot].overall}
                      onChange={(event) => updateSlot(slot, "overall", event.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    />
                  </div>

                  <div>
                    <label htmlFor={`totm-club-${slot}`} className="mb-1.5 block text-xs text-muted-foreground">
                      Clube
                    </label>
                    <select
                      id={`totm-club-${slot}`}
                      value={slots[slot].clube}
                      onChange={(event) => updateSlot(slot, "clube", event.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    >
                      <option value="">Selecionar clube</option>
                      {clubes.map((clube) => (
                        <option key={clube} value={clube}>
                          {clube}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>
            ))}
          </div>

          <div className="flex flex-col items-start gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "A guardar..." : "Guardar TOTM"}
            </button>

            {feedback ? (
              <p
                role="status"
                className={
                  feedback.type === "success"
                    ? "text-sm text-emerald-500"
                    : "text-sm text-destructive"
                }
              >
                {feedback.message}
              </p>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
