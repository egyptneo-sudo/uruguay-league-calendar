# Atualizar calendário com Casa/Fora

## Alterações
- Substituir os dados atuais pelo JSON enviado, preservando os 16 clubes e as 34 jornadas.
- Alargar cada jogo para aceitar `casa: true | false | null`.
- Mostrar `🏠 Casa` quando o clube joga em casa e `✈️ Fora` quando joga fora.
- Não mostrar qualquer indicador de local nas jornadas de taça, onde `casa` é `null`.
- Manter os escudos dos adversários, o filtro e a grelha responsiva existentes.

## Verificação
- Confirmar os 544 jogos e a distribuição dos indicadores.
- Testar no navegador uma jornada em casa, uma fora e uma de taça.
- Confirmar que o site continua sem erros.
