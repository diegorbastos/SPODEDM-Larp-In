# Builds nativos do Larp-In 1.1

## Antes de começar

1. Clone o repositório e execute `npm ci` e `npm test`.
2. Confira `app.json`: identidade `com.diegorbastos.larpin`, versão 1.1.0,
   Android versionCode 2 e iOS buildNumber 2.
3. Entre na sua conta: `npx eas-cli login` e `npx eas-cli whoami`.
4. Execute `npx eas-cli build:configure` e vincule o projeto à sua conta Expo.
   Preserve os plugins e o cadastro das extensões em `extra.eas.build`.
5. Não versione credenciais. O projeto não contém conta Expo/Apple configurada.

## Android: APK autônomo

```sh
npx eas-cli build --platform android --profile preview
```

O perfil `preview` produz um APK com o JavaScript incluído; não precisa do Metro.
O EAS solicita a configuração da chave de assinatura. Ao concluir, baixe o APK
pelo link do build e instale no aparelho de teste.

Dentro do Larp-In, abra Ajustes:

1. **Autorizar dados de uso**: leia a explicação e conceda acesso ao uso ao Larp-In.
2. **Autorizar bloqueio**: leia a explicação e ative o serviço de acessibilidade
   “Larp-In: limites de aplicativos” nas configurações do Android.
3. Volte ao app e toque **Atualizar permissões e dados** se necessário.
4. Toque **Ativar proteção**. A existência das permissões, sozinha, não ativa as metas.
5. Defina metas e teste foco. **Desativar proteção** remove a barreira.

Algumas versões do Android restringem a ativação de serviços de acessibilidade
para aplicativos instalados fora da loja. Siga o fluxo oficial oferecido pelo
sistema para aplicativos que você reconhece; não desative proteções globais do
aparelho. Um build só está validado após testar esse fluxo no dispositivo alvo.

Para desenvolvimento com recarga de JavaScript:

```sh
npx eas-cli build --platform android --profile development
npm start
```

Alternativa local com Android Studio/SDK configurados e JDK 17:

```sh
npx expo prebuild --platform android
npx expo run:android --device
```

O UsageStatsManager pode demorar a atualizar eventos ou ficar indisponível com o
aparelho bloqueado. A medição representa primeiro plano segundo eventos do Android,
não leitura de conteúdo. Janelas múltiplas, clones, perfis de trabalho e versões
Lite exigem avaliação adicional. O serviço de bloqueio é voluntário e revogável;
não é Device Owner/MDM nem controle parental inviolável.

## iPhone: requisitos Apple

Esta implementação exige **iOS/iPadOS 17.4+** para contabilizar atividade anterior
ao início do monitoramento (`includesPastActivity`). É necessária uma assinatura
Apple Developer para distribuição ad hoc/TestFlight e assinatura de dispositivos.

Configure a capacidade Family Controls e o App Group para estes identificadores:

| Target | Bundle identifier |
| --- | --- |
| Larp-In | com.diegorbastos.larpin |
| Monitor | com.diegorbastos.larpin.LarpMonitor |
| Report | com.diegorbastos.larpin.LarpReport |

App Group compartilhado: `group.com.diegorbastos.larpin`.

Solicite à Apple o entitlement **Family Controls para distribuição** para o app e
as duas extensões. Uma capacidade válida em desenvolvimento não garante autorização
para distribuição. Os perfis de provisionamento precisam incluir os entitlements;
colocá-los no JSON não concede a autorização.

O plugin `withLarpDeviceControl` gera os dois targets, copia suas fontes, configura
entitlements/Info.plist, dependências e inclusão no aplicativo. Não é necessário
criar os targets à mão. O pod local contém a interface Expo/Swift e o seletor.

### Instalação ad hoc em iPhone registrado

```sh
npx eas-cli device:create
npx eas-cli build --platform ios --profile preview
```

Registre cada aparelho e siga o link de instalação do EAS. Isso não equivale ao
Expo Go e não permite instalar um APK no iPhone.

### TestFlight

```sh
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

Crie antes o registro do aplicativo no App Store Connect. O envio e os dados da
loja usam sua conta. Builds podem depender de processamento/revisão da Apple.
Esses comandos são instruções; não foram executados nesta entrega.

### Fluxo de permissões iOS

1. Em Ajustes do Larp-In, autorize Tempo de Uso para o próprio aparelho.
2. Associe cada rede usando o seletor nativo: exatamente um aplicativo por rede,
   sem categoria ou website. Aplicativos não associados não são bloqueados.
3. Ative a proteção. O sistema aplica shields às seleções ao atingir as metas.
4. Para foco com bloqueio, escolha pelo menos 15 minutos (exigência de agenda do
   DeviceActivity). O monitor remove o shield ao encerrar o intervalo.
5. Use **Ver uso automático** no Início/Progresso. O relatório nativo calcula os
   totais dentro de sua extensão. Nenhum minuto é transportado para o JavaScript.
6. Ao mudar a associação de uma rede, confirme novamente a ativação da proteção.

A Apple usa tokens opacos: o Larp-In não pode inspecionar o nome do app escolhido
para confirmar se corresponde ao Instagram, YouTube ou TikTok. Selecione o correto.
Relatórios e callbacks podem sofrer atrasos do sistema. Reinício, mudança de fuso,
revogação de autorização e agendas próximas à meia-noite devem ser testados.

## Verificação antes de distribuir

No GitHub, execute manualmente o workflow **Verificacao nativa**. Ele instala as
dependências, gera os projetos e compila Android/iOS sem assinatura de distribuição.
Isso não gera uma versão instalável em iPhone nem substitui os testes físicos.

Em ambos os aparelhos, testar:

- Negar e depois conceder permissões: UI deve refletir o estado real.
- Revogar uma permissão durante proteção: não apresentar sucesso falso.
- Uso automático e ausência de duplicação depois de reabrir o aplicativo.
- Atingir meta com o Larp-In fechado; verificar barreira/shield.
- Iniciar foco, fechar o Larp-In, aguardar término e confirmar desbloqueio.
- Cancelar foco, desativar proteção e restaurar dados sem restrições remanescentes.
- Virada do dia, alteração de meta e novo app selecionado no iOS.
- Relatório vazio/atrasado e dispositivo sem dados: não substituir falha por uso fictício.
- Reiniciar aparelho e testar novamente o serviço/agendas.

No Google Play, o uso de AccessibilityService exige as declarações, demonstração
e consentimento aplicáveis; não marque o app como ferramenta de acessibilidade
para pessoas com deficiência. Na Apple, aguarde aprovação das capacidades. Não
há garantia de aprovação nas lojas apenas por o código compilar.

## Referências oficiais

- https://docs.expo.dev/develop/development-builds/introduction/
- https://docs.expo.dev/modules/get-started/
- https://developer.android.com/reference/android/app/usage/UsageStatsManager
- https://support.google.com/googleplay/android-developer/answer/10964491
- https://developer.apple.com/documentation/familycontrols/requesting-the-family-controls-entitlement
- https://developer.apple.com/documentation/deviceactivity/deviceactivityreport
- https://developer.apple.com/documentation/deviceactivity/deviceactivityevent/init(applications:categories:webdomains:threshold:includespastactivity:)
