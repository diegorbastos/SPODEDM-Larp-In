# Larp-In

**Menos scroll. Mais vida.** Aplicativo mobile de bem-estar digital com React
Native e Expo, construído a partir do material da disciplina SPODEDM.

Interface escura inspirada na referência fornecida e no
[SocialLite](https://sociallite.app), com identidade independente. O app permite
definir metas por rede, informar o uso diário e reservar períodos de foco.

## Executar

Requisitos: Node.js 20.19+ (validado com 24), npm e Expo Go compatível com SDK 54,
ou um build próprio. No terminal, dentro deste repositório:

```sh
npm ci
npm start
```

Escaneie o QR Code com um dispositivo na mesma rede. Para Android, use o Expo Go
compatível disponibilizado em [expo.dev/go](https://expo.dev/go?sdkVersion=54&platform=android&device=true).
No iPhone, se o Expo Go instalado não aceitar SDK 54, use um build próprio
compatível; o projeto não foi migrado para um SDK fora da base escolhida da aula.

```sh
npm run web       # prévia no navegador
npm run android   # abre em dispositivo/emulador Android configurado
npm run ios       # simulador iOS, requer macOS
npm test          # testes das regras de negócio, sem bibliotecas adicionais
npm run check     # compatibilidade das dependências com o SDK
npm run export    # bundles Android, iOS e web; não gera APK/IPA
```

## Fluxo

1. Boas-vindas explicam a proposta e o armazenamento local.
2. **Início:** resumo do dia e seleção de Instagram, YouTube ou TikTok.
3. **Detalhes da rede:** meta diária, intenção e registro manual do total usado.
4. **Progresso:** sete dias de registros e histórico de sessões.
5. **Foco:** duração de 1 a 120 minutos, conclusão por horário e cancelamento.
6. **Ajustes:** privacidade, explicação dos recursos e restauração com confirmação.

O primeiro uso começa vazio. “Sem registro” não significa zero uso. Uma entrada
substitui o total daquela rede no dia; não soma uma segunda vez. Cada rede aceita
de 0 a 1.440 minutos de uso e a soma diária não ultrapassa 24 horas.

**Limite funcional:** não mede uso automaticamente, não bloqueia outros apps,
não remove Reels/Shorts/anúncios e não integra contas de redes sociais. As APIs
necessárias para esses recursos não constam nas aulas fornecidas. O temporizador
é voluntário, persiste o horário de término e não envia notificação ou alarme.

## Arquitetura

```text
App.js                       ponto de entrada e composição da árvore
src/
  domain/                    entidades, regras puras, contrato do repositório
  application/               casos de uso com dependências injetadas
  data/                      repositório local, serialização e armazenamento
  composition/               ligação do AsyncStorage aos casos de uso
  presentation/
    state/                   Context/ViewModel: loading, erro, estado, ações
    navigation/              Stack e abas do React Navigation
    screens/                 telas sem importação do armazenamento
    components/              componentes visuais acessíveis e reutilizáveis
    theme/                   tokens de identidade visual
tests/                       testes executáveis com Node.js
```

As dependências apontam para dentro: a apresentação recebe os casos de uso pelo
Context; a aplicação conhece somente o domínio e a porta do repositório. O
adaptador de dados implementa essa porta. Somente a composição importa
AsyncStorage. Não há Redux, Zustand, React Query, UI kit ou contêiner de DI.

Leituras e gravações são assíncronas. Os casos de uso serializam operações para
evitar perda de atualizações concorrentes. A interface confirma sucesso apenas
depois da persistência. Dados corrompidos não são sobrescritos automaticamente.
O foco é reconciliado ao carregar, voltar ao primeiro plano ou chegar ao término;
intervalos e listeners possuem cleanup. Retenção: 90 dias e até 200 sessões.

Consulte [o mapeamento das aulas](docs/ESCOPO.md) para a justificativa de cada
ferramenta e [o roteiro de testes](docs/VALIDACAO.md) para a apresentação.

## Build Android de teste

Os perfis EAS seguem a aula de Implantação e Distribuição:

```sh
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

Essas etapas exigem sua conta Expo e geram um APK na nuvem. O projeto não contém
credenciais ou IDs fictícios. Nenhum build foi enviado às lojas. O identificador
configurado é `com.diegorbastos.larpin`; confirme a identidade antes de publicar.

## Referências e limites de validação

- Material didático entregue pelo usuário: Aulas 1, 2, 3, 5, 6, 7, 8, Projeto e
  Implantação/Distribuição. Não redistribuído neste repositório.
- [Exemplos do professor](https://github.com/joaotemochko/SPODEDM), commit
  `1c1be53f8279a249539897b68cf9fc390ab7e629`.
- Foto fornecida pelo usuário e [site SocialLite](https://sociallite.app).
- [React Navigation](https://reactnavigation.org/docs/getting-started/) para
  confirmar a integração, mantendo as técnicas dos exemplos.

Os testes automatizados e a exportação de bundles não equivalem a testes nativos
em aparelho. O relatório de validação registra o que foi executado e o que ainda
precisa ser verificado. Dependências do SDK 54 possuem avisos de auditoria
herdados; uma migração de SDK deve ser avaliada antes de distribuição pública.
