# Larp-In

**Menos scroll. Mais vida.** Aplicativo React Native + Expo com Clean Architecture,
metas, foco e integração nativa de bem-estar digital para Android e iOS.

## Estado desta entrega

A versão 1.1 adiciona o código nativo de uso automático e bloqueio. Os testes
JavaScript, autolinking e configuração das extensões são verificáveis localmente.
**O comportamento de bloqueio ainda exige validação em aparelhos reais.** Não foi
gerado APK/IPA assinado nesta etapa, conforme solicitado pelo responsável.

| Ambiente | Dados de uso | Bloqueio |
| --- | --- | --- |
| Android, build próprio | Eventos do UsageStatsManager, após autorização | Tela de acessibilidade sobre os três apps suportados |
| iPhone/iPad, iOS 17.4+ | Relatório nativo DeviceActivity, após autorização | ManagedSettings, para os apps associados pelo usuário |
| Expo Go / navegador | Registros manuais | Indisponível, explicitamente sinalizado |

No Android, Instagram, YouTube e TikTok são identificados pelos pacotes nativos
listados no módulo. Versões Lite, clones, perfis de trabalho, sites no navegador
e outros apps não estão cobertos. O painel importa os totais de hoje ao abrir,
voltar ao primeiro plano e a cada 30 segundos com o Larp-In ativo; dias anteriores
são os snapshots já salvos, não um backfill do histórico inteiro do sistema.
O serviço verifica a meta aproximadamente a cada 2 segundos enquanto um app
suportado está aberto, mesmo sem a tela React Native ativa.

No iOS, a Apple mantém os dados de atividade dentro da extensão de relatório.
O Larp-In exibe esse relatório diretamente, sem exportar minutos para JavaScript,
AsyncStorage ou servidores. O usuário associa cada rede a um aplicativo no seletor
do sistema. A identidade dos tokens é opaca: o app não consegue verificar se a
seleção realmente corresponde ao nome da rede. Os limites são aplicados à seleção.

O bloqueio cobre o **aplicativo inteiro**, durante foco ou após a meta diária.
Não remove Reels, Shorts ou anúncios. É um controle voluntário e revogável, não
um bloqueio inviolável. No iOS, foco com bloqueio exige pelo menos 15 minutos.

## Executar

Requisitos: Node.js 20.19+ e npm. Para compilar localmente: Android Studio/SDK e
JDK 17; iOS exige macOS com Xcode e CocoaPods. O EAS permite compilar na nuvem.

```sh
npm ci
npm test
npm run check
npm run web          # prévia manual no navegador
npm run start:go     # Expo Go compatível com SDK 54, modo manual
npm start            # Metro para o Development Build instalado
npm run android      # gera/compila/abre o build Android local
npm run ios          # gera/compila/abre o build iOS em macOS
npm run export       # apenas bundles JavaScript/Hermes, não um APK ou IPA
```

O Expo Go não recebe módulos nativos personalizados. Para recursos reais, instale
um build próprio. Alterações em Kotlin, Swift, plugins ou permissões exigem nova
compilação; mudanças somente em JS podem ser carregadas pelo Metro no dev client.

## Gerar builds

O guia [BUILD-NATIVO.md](docs/BUILD-NATIVO.md) cobre APK, Development Build,
TestFlight, capacidades Apple, permissões Android e roteiro de testes.

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

O perfil Android `preview` gera APK autônomo. Para iPhone, `preview` usa instalação
ad hoc em aparelhos registrados; `production` produz build para App Store Connect /
TestFlight. TestFlight exige envio separado e aprovação das capacidades Apple.
Não há credenciais, tokens ou um ID Expo fictício no repositório.

## Arquitetura

```text
src/domain/          entidades e portas, sem React/Expo
src/application/     regras, importação de uso e coordenação da proteção
src/data/            AsyncStorage e adaptador para o módulo nativo
src/composition/     injeção manual das implementações
src/presentation/    telas, componentes, Context/ViewModel e navegação
modules/larp-device-control/
  android/           Kotlin, eventos de uso e serviço de acessibilidade
  ios/               Swift, autorização, seleção, agendas e relatório nativo
native/ios/          fontes das extensões Monitor e Report
plugins/             geração de targets, entitlements e App Groups
```

Os casos de uso não conhecem as APIs Android/iOS. O adaptador informa capacidades
reais; não há dados simulados apresentados como uso automático. A fila serial evita
reconfigurações concorrentes. Falhas de leitura preservam registros e não impedem
cancelar foco ou remover restrições. As permissões são verificadas novamente ao
retornar ao app. O relatório iOS não tenta contornar a sandbox da Apple.

As pastas nativas geradas na raiz (`android/`, `ios/`) são ignoradas pelo Git;
as fontes de `modules/` e `native/` são versionadas e recompostas pelo prebuild.
Não edite arquivos gerados: altere o módulo ou o plugin.

## Privacidade e limitações

- Não há servidor, login nas redes ou envio de telemetria.
- Android: eventos são processados localmente; só os totais das redes suportadas
  são persistidos. O serviço não solicita conteúdo das janelas, captura de tela
  nem a permissão QUERY_ALL_PACKAGES.
- iOS: apenas preferências e tokens opacos ficam no App Group. Os números do
  relatório permanecem na extensão protegida.
- Permissões e proteção podem ser desativadas pelo usuário. Restrições de bateria,
  encerramento forçado e comportamento do fabricante podem afetar o serviço.
- Desativar a proteção remove as restrições, mas mantém a autorização de leitura
  do sistema. Para parar a coleta, revogue também o acesso ao uso/Tempo de Uso.
- Restaurar os dados locais não apaga o histórico do sistema operacional; se o
  acesso ao uso permanecer autorizado, os dados de hoje serão importados novamente.
- O SDK 54 possui avisos de auditoria herdados. Não tratar esta entrega acadêmica
  como produto auditado e aprovado para distribuição pública.

## Referências e validação

- [Escopo e relação com as aulas](docs/ESCOPO.md). Os módulos nativos são uma
  ampliação explicitamente solicitada depois da versão acadêmica inicial.
- [Relatório de validação](docs/VALIDACAO.md).
- [Exemplos do professor](https://github.com/joaotemochko/SPODEDM).
- Referência visual fornecida e [SocialLite](https://sociallite.app); identidade
  independente, sem vínculo com o produto ou as redes representadas.
- Workflow manual **Verificacao nativa**, em Actions, para compilar Android e iOS
  sem assinatura de distribuição. A presença do workflow não significa que passou.
