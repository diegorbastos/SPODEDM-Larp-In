# Validação e roteiro de apresentação

## Executado em 15/11/2026

- `npm ci`: instalação reproduzível pelo lockfile.
- `npm test`: 11 testes aprovados (regras, persistência e direção das dependências).
- `npx expo install --check`: dependências compatíveis com SDK 54.
- `npx expo export --platform all`: bundles Hermes Android/iOS e bundle web.
- Prévia web via Metro: boas-vindas, abas, detalhes e formulários.
- Inspeção visual em viewports de 390 × 844 e 320 × 740.
- Meta Instagram alterada de 30 para 45 minutos; total diário informado: 20.
- Registro de 1.500 minutos recusado, preservando os 20 minutos anteriores.
- Reabertura da prévia preservou meta, uso e estado de boas-vindas concluído.
- Sessão de 1 minuto concluída após recarregar; histórico creditou exatamente 1 minuto.
- Sessão de 25 minutos interrompida com confirmação; total concluído permaneceu 1 minuto.
- Gráfico exibiu dias sem registro com “—”, sem tratá-los como zero uso.
- Correção do relógio inicial: atualização imediata ao iniciar sessão.
- Ajustes de área segura, altura da barra inferior e quebra de texto em tela compacta.

Os dados acima são entradas de teste na prévia local; não são dados iniciais
embutidos no aplicativo. Novas instalações começam vazias.

## Testes automatizados

1. Domínio e aplicação não importam frameworks nem camadas externas.
2. Apresentação não importa armazenamento ou composição.
3. Estado inicial sem estatísticas fabricadas.
4. Registros concorrentes preservados; atualização substitui o total diário.
5. Validação de limites, entradas inválidas, rede inexistente e soma de 24 horas.
6. Foco persistente, bloqueio de início duplicado e conclusão idempotente.
7. Cancelamento não soma tempo concluído.
8. Mudança de dia não reaproveita o uso anterior.
9. Falha de escrita e dados corrompidos geram erro.
10. Restauração recupera armazenamento corrompido.
11. Retenção remove registros antigos.

## Pendências antes de distribuição

- Testar Android/iOS físicos: Expo Go compatível ou build próprio.
- Validar botão Voltar do Android, teclado, rotação, fontes ampliadas e leitores
  TalkBack/VoiceOver. A prévia web não comprova o comportamento nativo.
- Gerar e instalar APK pelo perfil EAS `preview`, usando a conta do responsável.
- Validar primeiro plano/segundo plano e encerramento pelo sistema no dispositivo.
- Preparar ícone de loja, capturas nativas e requisitos de distribuição caso o
  projeto evolua para publicação. Nenhuma publicação foi realizada.

## Auditoria das dependências

A instalação do lockfile apresentou 14 avisos na auditoria npm, incluindo dois
de severidade alta (`image-size` e `postcss`) em dependências transitivas da
cadeia Expo/Metro. A atualização automática compatível não resolveu o relatório
e alterou a resolução de módulos; o lockfile previamente validado foi restaurado.
Não foi executado `npm audit fix --force`, pois propunha migrar para Expo SDK 58,
fora da base escolhida dos exemplos. Reavaliar dependências antes de distribuir
publicamente; não considerar este projeto um produto auditado para produção.

## Demonstração em aproximadamente cinco minutos

1. Explicar a proposta: registro consciente e foco voluntário.
2. Mostrar `docs/ESCOPO.md` e a direção das dependências.
3. Definir uma meta de 45 min e registrar 20 min em uma rede.
4. Conferir o total no início e o gráfico em Progresso.
5. Iniciar foco de 1 minuto, sair e reabrir; mostrar conclusão no histórico.
6. Apresentar limitações e privacidade em Ajustes.
7. Executar `npm test` e mostrar os commits por etapa.
