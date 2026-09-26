import { liga } from "@/lib/liga";

export function getJogosDaJornada(jornada: number) {
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
