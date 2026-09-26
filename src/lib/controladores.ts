import { useQuery } from "@tanstack/react-query";
import { getResultadosClient } from "@/lib/resultados-client";

export type ControladoresMap = Map<string, string>;

async function fetchControladores(): Promise<ControladoresMap> {
  const client = getResultadosClient();
  const { data, error } = await client.from("clubes_controladores").select("clube, controlador");

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    const clube = item.clube?.trim();
    const controlador = item.controlador?.trim();

    if (!clube || !controlador) continue;
    map.set(clube, controlador);
  }

  return map;
}

export function useControladores() {
  return useQuery({
    queryKey: ["controladores"],
    queryFn: fetchControladores,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
