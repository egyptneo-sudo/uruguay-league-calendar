import { createFileRoute } from "@tanstack/react-router";
import { EscudoClube } from "@/components/EscudoClube";
import { SiteFooter } from "@/components/SiteFooter";
import { useControladores } from "@/lib/controladores";
import { teamValues, type TeamValue } from "@/lib/liga";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/team-values")({
  head: () => ({
    meta: [
      { title: "Team Values — Liga Uruguaia" },
      {
        name: "description",
        content: "Objetivos, valor do plantel e rendimento fixo dos 16 clubes da Liga Uruguaia.",
      },
      { property: "og:title", content: "Team Values — Liga Uruguaia" },
      {
        property: "og:description",
        content: "Objetivos, valor do plantel e rendimento fixo dos 16 clubes da Liga Uruguaia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamValuesPage,
});

function objetivoClass(objetivo: number) {
  if (objetivo <= 3) return "bg-objective-high-muted text-objective-high ring-objective-high/25";
  if (objetivo <= 8) return "bg-objective-mid-muted text-objective-mid ring-objective-mid/25";
  return "bg-objective-low-muted text-objective-low ring-objective-low/25";
}

function ObjetivoBadge({ objetivo }: { objetivo: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-8 items-center justify-center rounded-md px-2 text-xs font-bold ring-1",
        objetivoClass(objetivo),
      )}
    >
      {objetivo}
    </span>
  );
}

function Clube({ item, controlador }: { item: TeamValue; controlador?: string | undefined }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-3">
        <EscudoClube nome={item.clube} tamanho="sm" />
        <span className="min-w-0 font-semibold text-foreground">{item.clube}</span>
      </div>
      {controlador ? (
        <span className="ml-9 text-[11px] text-muted-foreground">{controlador}</span>
      ) : null}
    </div>
  );
}

function TeamValuesPage() {
  const { data: controladores } = useControladores();
  return (
    <div className="page-backdrop min-h-screen">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <header className="pt-14 pb-9 sm:pt-20 sm:pb-11">
          <p className="text-xs font-semibold text-primary uppercase">Primeira Divisão · Uruguai</p>
          <h1 className="font-display mt-2 text-4xl font-bold text-foreground sm:text-5xl">
            Team Values
          </h1>
        </header>

        <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
          <table className="w-full border-collapse text-left">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-5 py-4 text-xs font-bold uppercase">Clube</th>
                <th className="px-5 py-4 text-xs font-bold uppercase">Objetivo</th>
                <th className="px-5 py-4 text-xs font-bold uppercase">Valor do plantel</th>
                <th className="px-5 py-4 text-xs font-bold uppercase">Rendimento fixo</th>
              </tr>
            </thead>
            <tbody>
              {teamValues.map((item) => (
                <tr key={item.clube} className="border-t border-border transition-colors hover:bg-accent/45">
                  <td className="px-5 py-4"><Clube item={item} controlador={controladores?.get(item.clube)} /></td>
                  <td className="px-5 py-4"><ObjetivoBadge objetivo={item.objetivo} /></td>
                  <td className="px-5 py-4 text-sm font-medium text-foreground">{item.valor_plantel}</td>
                  <td className="px-5 py-4 text-sm font-medium text-foreground">{item.rendimento_fixo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:hidden">
          {teamValues.map((item) => (
            <li key={item.clube} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
              <Clube item={item} controlador={controladores?.get(item.clube)} />
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Objetivo</dt>
                  <dd className="mt-1"><ObjetivoBadge objetivo={item.objetivo} /></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Valor do plantel</dt>
                  <dd className="mt-1 font-semibold text-foreground">{item.valor_plantel}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Rendimento fixo</dt>
                  <dd className="mt-1 font-semibold text-foreground">{item.rendimento_fixo}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <SiteFooter />
      </div>
    </div>
  );
}