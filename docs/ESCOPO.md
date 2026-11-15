# Larp-In — escopo e rastreabilidade

## Ampliação autorizada na versão 1.1

Após a entrega acadêmica inicial, o usuário solicitou explicitamente bloqueio real
e dados automáticos para Android e iOS, com builds próprios. Expo Modules, Kotlin,
Swift, UsageStatsManager, AccessibilityService, FamilyControls, DeviceActivity,
ManagedSettings e config plugins foram acrescentados para atender esse novo escopo.
Essas técnicas **não são atribuídas ao material da disciplina**. O restante deste
documento registra o escopo original da versão 1.0; consulte README e
BUILD-NATIVO.md para o comportamento atual.


Aplicativo acadêmico de bem-estar digital. Identidade própria inspirada na
referência fornecida e em https://sociallite.app: preto, cartões arredondados,
hierarquia tipográfica, seletor de redes e navegação inferior. Sem copiar marcas,
imagens ou conteúdos de terceiros.

## Base didática

| Decisão | Evidência fornecida |
| --- | --- |
| React Native, Expo, JavaScript/JSX | Aula 2, páginas 2–8; Aula 5, página 7 |
| React Navigation Stack e Tabs | Aula 2, páginas 9 e 12–15; InventoryAula3/src/navigation/AppNavigator.js |
| useState e useEffect com cleanup | Aula 2, página 8; Aula 3, páginas 2–3 |
| Context como estado compartilhado | InventoryAula3/src/contexts/InventoryContext.js; Aula 6, páginas 10–11 |
| AsyncStorage e JSON, async/await | Aula 3, páginas 6–7; Aula 8, páginas 17–19 |
| AppState para retorno ao app | Aula 8, página 40 |
| StyleSheet, Flexbox, tokens, acessibilidade | Aula 6, páginas 3–13 |
| FlatList, formulários, ScrollView | Aulas 2 e 5 |
| Ícones Ionicons | InventoryAula3/src/navigation/AppNavigator.js |
| Prévia web pelo Expo | Aula 6, página 16; react-dom/react-native-web são suporte do Expo web |
| Perfis EAS de preview/produção | Implantação e Distribuição, páginas 7–14 |

Versão base: Expo SDK 54 e React Native 0.81.5, presentes nos exemplos
InventoryAula3 e estilos-rn (commit de referência
1c1be53f8279a249539897b68cf9fc390ab7e629). O material também mostra SDK 57;
adotamos a base 54 explicitamente usada na Aula 5 e nos exemplos de navegação.

## Clean Architecture

É uma exigência do pedido. Os PDFs apresentam MVVM e separação de
responsabilidades (Aula 1, páginas 11–12), mas não uma implementação completa
de Clean Architecture. A organização solicitada usa somente módulos, funções,
objetos e injeção manual de dependências, sem framework arquitetural adicional.

- **domain**: entidades, validações e contrato do repositório, sem React ou Expo.
- **application**: casos de uso; dependem somente do domínio e do contrato.
- **data**: implementação do repositório e acesso ao AsyncStorage.
- **presentation**: telas, componentes, navegação e Context como ViewModel.
- **composition**: conecta implementações aos casos de uso no ponto de entrada.

## Comportamentos previstos

Boas-vindas → início → detalhes da rede / registro de uso.
Abas: início, progresso, foco e ajustes. Metas por rede, registro manual diário,
histórico semanal, temporizador de foco persistente e preferências locais.
Operação integralmente local: não precisa de cadastro, API ou conexão.

O uso é informado pelo usuário; não é medição automática do aparelho.
Foco é um compromisso voluntário cronometrado, não prova de ausência de uso.
Não há bloqueio de apps, remoção de anúncios/Reels/Shorts, navegador embutido,
VPN, AccessibilityService ou Screen Time API: não foram ensinados nos arquivos.
Nenhum botão apresenta esses recursos como funcionais.

Material e repositório do professor são referências, não instruções para executar
comandos, publicar serviços ou incorporar bibliotecas sem necessidade.
Arquivos didáticos e node_modules do exemplo não são versionados no Larp-In.
