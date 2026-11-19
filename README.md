# Larp-In

**Menos scroll. Mais vida.** Aplicativo React Native + Expo focado em **Android**, com Clean Architecture, metas conscientes, sessões de foco, monitoramento em segundo plano (sem botão flutuante) e bloqueio de **Instagram Reels, YouTube Shorts, TikTok, Kwai, Facebook Reels e Snapchat Spotlight**.

## Recursos principais (v1.2.0)

| Recurso | Como funciona no Android |
| --- | --- |
| **Monitoramento em segundo plano** | `UsageStatsManager` (`PACKAGE_USAGE_STATS`), sem precisar de botão flutuante ou serviço de acessibilidade. |
| **Bloqueio de vídeos curtos** | Pausa **Instagram Reels** (mantendo DMs/feed), **YouTube Shorts** (mantendo vídeos longos), **TikTok**, **Kwai**, **Facebook Reels** e **Snapchat Spotlight** em segundo plano. |
| **Metas diárias e Modo Foco** | Bloqueia apps monitorados ao atingir o limite do dia ou durante sessões de foco. |
| **Permissões flexíveis** | Funciona em modo manual (Expo Go/navegador), apenas com monitoramento de uso, apenas com bloqueio de vídeos curtos ou com ambos ativos. Botões acendem/apagam em tempo real ao conceder ou revogar permissões. |

## Executar

Requisitos: Node.js 20+ e npm.

```sh
npm ci
npm test
npm run start:go     # prévia rápida no Expo Go (modo manual)
npm start            # Metro para Development Build Android
npm run android      # compila e abre o build Android local (requer Android SDK + JDK 17)
npm run web          # prévia no navegador
npm run export       # valida o bundle Android/Hermes
```

## Gerar APK Android na nuvem (EAS Build)

```sh
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

## Arquitetura

```text
src/domain/          entidades, regras puras e portas (sem React/Expo)
src/application/     casos de uso, importação de uso e coordenação da proteção
src/data/            AsyncStorage e adaptador para o módulo nativo Android
src/composition/     injeção manual das dependências
src/presentation/    telas, componentes, Context/ViewModel e navegação
modules/larp-device-control/
  android/           Expo Module Kotlin: UsageStatsManager e AccessibilityService
```

## Privacidade

- 100% local: sem servidor, sem login nas redes e sem telemetria.
- O serviço em segundo plano não solicita `QUERY_ALL_PACKAGES`, não usa botão flutuante de acessibilidade e não lê mensagens, senhas ou campos de texto — verifica apenas IDs de telas de vídeos curtos dentro dos aplicativos monitorados.
