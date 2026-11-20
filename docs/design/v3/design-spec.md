# Valan — Especificação de design para implementação (v2, logo da onda em ziguezague)

Este ficheiro é a fonte de verdade da interface. O canvas https://claude.ai/artifact/GVJqTHVHNeajzLFHBfArNs mostra o resultado esperado de cada ecrã; os fluxos estão em `FLUXOS.md`. Quando o canvas e este texto discordarem, vale este texto.

Atualizado a 20/11/2026: logótipo e paleta adaptados à onda em ziguezague sobre laranja, e o mesmo logótipo em todos os ecrãs onde aparece. O `theme.ts` e o `WaveMark` do pacote de handoff anterior estão desatualizados; os valores certos são os da §2 e da §3.

Stack: Expo (SDK atual) + Expo Router + TypeScript estrito, só iOS na v1.0. Estilos com `StyleSheet` e `theme.ts` (sem bibliotecas de UI). Ícones: `lucide-react-native` (nomes na tabela de cada ecrã). SVG: `react-native-svg`. Fontes: `@expo-google-fonts/inter` e `@expo-google-fonts/space-grotesk`.

## 1. Princípios

1. Uma ação principal por ecrã, sempre em baixo, ao alcance do polegar (botão primário de 52 pt, largura total, margem lateral 20).
2. O estado de cada anúncio em cada plataforma está sempre visível através do `PlatformChip`. É o elemento de marca da app.
3. Erros dizem a plataforma, o motivo e a ação seguinte. Nunca "Ocorreu um erro".
4. Nada é específico de discos fora do passo "Estado" e da pesquisa no catálogo. Novas categorias acrescentam-se em `categorias.ts` (ver §6), não em ecrãs novos.
5. Padrões nativos de iOS: separadores em baixo, título grande, navegação em pilha com gesto de voltar, folhas modais para a subscrição.
6. Não mostrar plataformas "em breve" (risco de rejeição pela Apple).
7. Todos os ecrãs com dados têm os estados: a carregar, vazio, erro, sem rede (§5).
8. O logótipo só tem uma forma: o componente `Logo`, sempre com o mesmo tamanho. Não há variantes com outro nome de produto ("Pro") nem o ícone sozinho dentro da app.

## 2. Tokens

| Token | Valor | Uso |
|---|---|---|
| `bg` | #F6F4F1 | Fundo dos ecrãs |
| `surface` | #FFFFFF | Cartões, listas, campos |
| `fill` | #EDE9E3 | Botão secundário, controlo segmentado |
| `line` | #E3DED6 | Contorno de cartões (1 pt), divisórias |
| `ink` | #1E1A17 | Texto principal |
| `muted` | #6B6259 | Texto secundário |
| `primary` | #B4460F | Logótipo, botão principal, links, selo "publicado" |
| `primaryPressed` | #8F370B | Estado premido do principal; texto e ícones sobre `primaryTint` |
| `primaryTint` | #F8E8DC | Fundo da onda nos estados vazio e a publicar; vistos dos benefícios |
| `cream` | #F5EFE6 | Só a onda dentro do ícone |
| `badge` | #E07A2E | Contador do separador Propostas (texto `ink`) |
| `chart3` | #E3A47A | Terceira série em gráficos; nunca texto |
| `danger` / `dangerTint` | #B3261E / #FCE9E7 | Erros, remover, eliminar conta |

Tipografia: Space Grotesk 600 para títulos e números grandes (preço, total, valor de proposta); Inter para o resto e para o logótipo. Preços com `fontVariant: ['tabular-nums']`. Escala em `type` no `theme.ts`.

Raios: selo 8, controlos 10, campos e botões 14, cartões 16. Espaçamento em múltiplos de 2 (`space`). Alvos de toque nunca abaixo de 44 pt.

Todos os pares de texto e fundo usados passam 4,5:1. Os mais apertados: `muted` sobre `fill` 4,9:1, `primary` sobre `bg` 5,0:1, branco sobre `primary` 5,5:1.

## 3. Componentes

Implementar primeiro estes componentes em `components/`, e só depois os ecrãs.

O desenho da onda é sempre o mesmo caminho, numa caixa de 120: `M12 60 24 46 38 80 54 26 66 94 82 40 96 74 108 60`, com pontas e junções redondas.

| Componente | Props | Notas |
|---|---|---|
| `AppIcon` | `size` | Quadrado `primary` com raio 27/120 do lado e a onda em `cream`, traço 9,5/120. É o ícone da app e a parte gráfica do `Logo`; dentro da app não aparece sozinho. |
| `WaveLine` | `width`, `color = primary`, `animated?` | Só a onda, traço 7/120. `animated`: a linha desenha-se da esquerda para a direita (1,8 s em ciclo); parada com Reduzir movimento. |
| `Logo` | — | `AppIcon` 40 + "VALAN" em Inter 700 de 18 pt, espaçamento entre letras 32 %, cor `ink`, 12 pt entre os dois. Sem props de tamanho: é igual em todos os ecrãs. |
| `PlatformChip` | `platform`, `state: 'live' \| 'paused' \| 'error' \| 'sold' \| 'off'` | Inclui o mapeamento a partir de `listings.estado`. |
| `ChipRow` | `items: {platform, state}[]` | Linha com `gap` 6 e quebra de linha. |
| `Button` | `variant: 'primary' \| 'secondary' \| 'dark' \| 'link' \| 'danger-link'`, `size: 'default' \| 'compact'`, `icon?`, `loading?`, `disabled?` | 52 / 48 pt. `dark` = "Continuar com a Apple" (usar `AppleAuthenticationButton` nativo se a Apple exigir). `loading` mostra indicador e bloqueia toque duplo. |
| `Card` | `children`, `padding?` | `surface`, contorno `line`, raio 16. As linhas internas separam-se com divisória de 1 pt. |
| `ScreenTitle` | `title`, `subtitle?` | Título grande 32 pt; só nos 4 separadores e em "Ligar plataformas". |
| `SectionLabel` | `children` | 13 pt, 600, `muted`. |
| `Segmented` | `options`, `value`, `onChange` | Fundo `fill`, opção ativa `surface` com sombra leve. Altura 44. |
| `FilterPills` | `options: {label, count?, tone?}[]` | Altura 44, raio 22. Ativo: fundo `ink`, texto branco. |
| `Thumb` | `uri?`, `size` | Foto do artigo; sem foto: ícone `Image` em `fill`. |
| `ListingRow` | `listing` | Thumb 52, título (1 linha, reticências), preço, meta, `ChipRow`, e linha de erro em `danger` se houver. Toque abre o detalhe. |
| `StepHeader` | `step: 1..4`, `label`, `onBack`, `onCancel` | Voltar (44×44) à esquerda, "Cancelar" à direita, 4 segmentos de progresso, "Passo N de 4 · Nome". |
| `GradeSelector` | `value`, `onChange`, `grades` | Grelha de 6 colunas, altura 44. Selecionado: fundo `ink`. Por baixo, a descrição do grau escolhido. |
| `PhotoGrid` | `photos`, `max = 8`, `onAdd`, `onReorder` | 4 colunas, quadrados, a primeira leva a etiqueta "Capa". |
| `PriceInput` | `value`, `currency` | Campo de 76 pt, número em `bigNumber`, teclado `decimal-pad`, vírgula decimal (pt-PT). |
| `PlatformCheckRow` | `platform`, `checked`, `status` | Linha de 60 pt com caixa de seleção. Só plataformas compatíveis e ligadas. |
| `PublishRow` | `platform`, `state: 'sending' \| 'done' \| 'error'` | Usada em "A publicar". |
| `OfferCard` | `offer`, `canRespondInApp` | Valor em `offerNumber`, "pedes X · menos Y", expiração, ações. |
| `SaleRow` | `sale` | Nome, data · plataforma, preço e comissão (− X €). |
| `SettingsRow` | `label`, `value?`, `tone?: 'danger'`, `onPress` | 50 pt com chevron. |
| `EmptyState` | `title`, `body`, `action` | `WaveLine` 60 sobre quadrado `primaryTint` 96×96 com raio 28. |
| `ErrorState` | `title`, `body`, `onRetry` | Mesmo layout que o vazio, com botão "Tentar de novo". |
| `TabBar` | — | 4 separadores (§4). Ativo: `ink` e 700; inativo: `muted`. Contador `badge` em Propostas. |

## 4. Navegação (Expo Router)

```
app/
  _layout.tsx                 Stack raiz; redireciona para (auth) se não houver sessão
  (auth)/entrada.tsx
  (auth)/ligar.tsx            também aberto a partir de Conta
  (tabs)/_layout.tsx          Tabs: anuncios, propostas, vendas, conta
  (tabs)/anuncios/index.tsx
  (tabs)/propostas.tsx
  (tabs)/vendas.tsx
  (tabs)/conta.tsx
  anuncio/[id].tsx            detalhe (push)
  novo/_layout.tsx            Stack em modal de ecrã inteiro; guarda o rascunho
  novo/artigo.tsx
  novo/estado.tsx
  novo/preco.tsx
  novo/publicar.tsx           sem gesto de voltar
  novo/resultado.tsx          sem gesto de voltar
  subscricao.tsx              presentation: 'modal'
```

Separadores: Anúncios (`Tag`), Propostas (`MessageSquare`, com contador de propostas pendentes), Vendas (`BarChart3`), Conta (`User`).

## 5. Estados comuns

| Estado | Como se mostra |
|---|---|
| A carregar (lista) | 3 linhas-esqueleto com a forma de `ListingRow`, sem texto. Nunca um ecrã branco. |
| A carregar (ação) | O botão fica em `loading`; o resto do ecrã continua visível. |
| Vazio | `EmptyState` com uma ação (ver ecrãs). |
| Erro ao carregar | `ErrorState`: "Não foi possível carregar os anúncios." + "Tentar de novo". |
| Sem rede | Faixa no topo, `fill`: "Sem ligação. Mostramos os últimos dados guardados." |
| Plataforma desligada ou com token expirado | Selo `error` com o motivo "Volta a ligar a conta" e ação "Ligar" para `(auth)/ligar`. |

## 6. Categorias (para ser genérico)

```ts
// categorias.ts
type Category = {
  id: 'disco' | 'aparelho';            // novas categorias entram aqui
  label: string;                       // "Disco"
  catalog?: 'discogs';                 // pesquisa por catálogo (opcional)
  grades: { code: string; label: string; help: string }[];
  gradedParts: string[];               // disco: ["Estado do disco", "Estado da capa"]; aparelho: ["Estado"]
  platforms: PlatformId[];             // disco: ['discogs','ebay']; aparelho: ['ebay']
};
```

A categoria não se escolhe no início: um artigo ligado a uma edição do catálogo é um disco; sem edição, o vendedor diz se é "Disco, CD ou cassete" ou "Outro artigo" (§7.4). Disco usa a escala Goldmine (M, NM, VG+, VG, G+, G). Outro artigo usa a escala de estado já definida no CLAUDE.md. O passo "Estado" desenha-se a partir desta definição.

## 7. Ecrãs

Para cada ecrã: rota, artboard do canvas, objetivo, conteúdo de cima para baixo, ação principal, dados e estados. Os textos entre aspas são os textos finais em pt-PT.

### 7.1 Entrada — `(auth)/entrada` · artboard "1 · Entrada"

Objetivo: dizer o que a app faz numa frase e entrar.
Conteúdo: `Logo` no topo → a onda a toda a largura do ecrã, linha `primary` de 3 pt, no espaço livre por baixo do logótipo → título em duas linhas "Publica uma vez." / "Vende em várias plataformas."
Ações: "Continuar com a Apple" (`dark`), "Continuar com email" (`secondary`); por baixo, 12 pt: "Ao continuar aceitas os Termos e a Política de Privacidade." (links).
Depois de entrar: sem contas ligadas → `ligar`; com contas → `(tabs)/anuncios`.

### 7.2 Ligar plataformas — `(auth)/ligar` · artboard "2 · Ligar plataformas"

Conteúdo: `Logo` → título "Liga as contas onde vendes" → "Entras em cada plataforma com a tua conta. A Valan nunca vê a tua palavra-passe." → cartão com uma linha por plataforma (quadrado escuro com sigla, nome, o que vende, e à direita "Ligar" (botão compacto) ou "✓ Ligada").
Nota: "Precisas de pelo menos uma conta ligada para publicar. Podes mudar isto mais tarde em Conta."
Ação principal: "Continuar" (desativado até haver uma conta ligada); link "Fazer isto mais tarde".
"Ligar" abre o OAuth da plataforma com `expo-web-browser` (`openAuthSessionAsync`); o código é trocado por tokens numa Edge Function. Enquanto espera: o botão fica em `loading`. Erro: texto em `danger` por baixo da linha, "Não foi possível ligar ao eBay. Tenta de novo."

### 7.3 Anúncios — `(tabs)/anuncios` · artboards "3 · Anúncios" e "3a · Anúncios (vazio)"

Conteúdo: título "Anúncios" → `FilterPills`: "Todos", "A resolver" (contador em `danger`, só aparece se > 0), "Vendidos" → cartão com `ListingRow`s.
Ordem: primeiro os que têm erro, depois por data de alteração.
Linha com erro: mostra por baixo dos selos "eBay: falta uma política de envio. Toca para resolver." em `danger`.
Linha vendida: título em `muted`, meta "Vendido no Discogs", selos `sold` + `off`.
Ação principal: "+ Novo anúncio" fixo acima dos separadores.
Vazio: `EmptyState` "Ainda não tens anúncios" / "Escolhe o artigo, define o estado e o preço, e publica nas tuas plataformas de uma só vez." / "+ Criar o primeiro anúncio".
Dados: `items` + `listings` + `item_photos[0]`. Puxar para atualizar.

### 7.4 Novo · Artigo — `novo/artigo` · artboards "4a · Novo: artigo" e "4a2 · Novo: artigo sem catálogo"

Objetivo: dizer o que se vende, para qualquer produto. Não há escolha de categoria no início.
`StepHeader` 1 "Artigo" → título "O que vais vender?" → campo "Nome do artigo" com ícone de pesquisa e a ajuda "Artista e título, ou marca e modelo, como o comprador o procuraria." → "Sugestões do catálogo Discogs", com a nota "Se for um disco, escolhe a tua edição para o publicar também no Discogs.", e um cartão com as edições encontradas (thumb 48, título, "Formato · Edição · Editora · Ano", chevron). As sugestões aparecem enquanto se escreve, com uma pequena espera entre teclas.
Tocar numa edição avança: o artigo fica ligado a essa edição e pode ir para o Discogs e para o eBay. Por baixo, "Publica em: Discogs e eBay, ao escolher uma edição" e o link "Não é nenhuma destas. Continuar sem catálogo".
Sem catálogo (sem edição escolhida, sem resultados ou com o catálogo indisponível): o campo mantém o nome escrito, a secção diz "Nenhuma edição encontrada com este nome.", e aparece o aviso "Este anúncio não vai para o Discogs" / "O Discogs só aceita discos que existem no seu catálogo. Publicamos nas outras plataformas com o nome que escreveste." Depois, "Que tipo de artigo é?" com `Segmented` "Disco, CD ou cassete" / "Outro artigo" e a ajuda "Decide a escala de estado do passo seguinte." Rodapé: "Publica em: eBay" e o botão "Continuar".
Regras: o catálogo nunca bloqueia; uma falha ou falta de rede na pesquisa deixa sempre continuar sem catálogo. Os nomes das plataformas no aviso e em "Publica em" vêm das capacidades dos conectores, nunca escritos à mão.
Estados: a pesquisar (esqueleto de 3 linhas por baixo do campo); sem resultados (o estado sem catálogo); erro ou sem rede ("Não foi possível pesquisar o catálogo. Podes continuar sem ele.").

### 7.5 Novo · Estado e fotos — `novo/estado` · artboard "4b · Novo: estado e fotos"

`StepHeader` 2 → cartão do artigo escolhido com "Alterar" → `PhotoGrid` com o rótulo "Fotos · N de 8" (a primeira é a capa; tocar em + abre a folha "Tirar foto / Escolher da galeria") → um `GradeSelector` por parte avaliada ("Estado do disco", "Estado da capa"), com a descrição do grau por baixo.
Ação: "Continuar" (precisa de ≥ 1 foto e de todos os estados). Por baixo, 12 pt: "Rascunho guardado" (guardar localmente a cada alteração).

### 7.6 Novo · Preço e plataformas — `novo/preco` · artboard "4c · Novo: preço e plataformas"

`StepHeader` 3 → `PriceInput` com o rótulo "Preço" → cartão "Aceitar propostas" + "Os compradores podem sugerir outro preço." com `Switch` → "Onde publicar": `PlatformCheckRow` por plataforma compatível e ligada → nota "Só aparecem as plataformas que aceitam este tipo de artigo."
Plataforma compatível mas não ligada: linha sem caixa, com "Ligar" (abre o OAuth e volta).
Ação: "Publicar em N plataformas" (N = selecionadas; desativado com 0 ou preço vazio). Sem subscrição ativa e acima do limite gratuito: abre `subscricao`.

### 7.7 Novo · A publicar — `novo/publicar` · artboard "4d · Novo: a publicar"

Progresso com 3 segmentos preenchidos → `WaveLine` 84 `animated` sobre quadrado `primaryTint` 132×132 com raio 40 → título "A publicar em N plataformas" → "Demora poucos segundos. Podes sair deste ecrã: avisamos-te quando terminar." → cartão com `PublishRow` por plataforma ("A enviar…" com indicador / "✓ Publicado" / "Não publicado").
Avança sozinho para `resultado` quando todas terminarem. Ação secundária: "Continuar em segundo plano" → `(tabs)/anuncios`.
Implementação: uma chamada à Edge Function `publish` por plataforma, em paralelo; o estado de cada uma vem da tabela `listings` (Realtime ou nova consulta a cada 2 s).

### 7.8 Novo · Resultado — `novo/resultado` · artboard "4e · Novo: resultado"

Progresso completo, "Passo 4 de 4 · Resultado" → título "Publicado em X de N plataformas" (ou "Publicado em todas as plataformas") → cartão do artigo → cartão com uma linha por plataforma:
- sucesso: selo `live`, "Publicado", link "Abrir ↗" (URL do anúncio);
- erro: selo `error`, "Não publicado" em `danger`, o motivo em linguagem simples, botões "Resolver no eBay ↗" (primário compacto, abre a página de definições certa) e "Tentar de novo" (secundário compacto).
Ações: "Ver anúncio" (secundário) e link "Criar outro anúncio".
Mensagens de erro: mapear códigos da API para textos humanos em `errors.ts` (ex.: falta política de envio / de pagamento / de devolução; falta localização; release não encontrado no Discogs; token expirado).

### 7.9 Detalhe do anúncio — `anuncio/[id]` · artboard "5 · Detalhe do anúncio"

Voltar "‹ Anúncios" e a data à direita → galeria (176 pt de altura, contador "1/N") → título 22 pt + preço (Space Grotesk 24) → meta "LP · Disco VG+ · Capa NM · Aceita propostas" → "Plataformas": linha por plataforma com selo, estado e ação ("Abrir", "Resolver", "Retomar") → cartão "N proposta(s) à espera" com o valor mais alto → Propostas.
Ações: "Editar" (primário) e "Pausar" / "Retomar" (secundário), lado a lado; por baixo: "O que mudares aqui muda em todas as plataformas."; link `danger` "Remover anúncio" (folha de confirmação: "Remover de todas as plataformas? Esta ação não se pode desfazer.").

### 7.10 Propostas — `(tabs)/propostas` · artboard "6 · Propostas"

Título "Propostas" + "N à espera de resposta" → `OfferCard` por proposta pendente (mais recente primeiro): artigo, "comprador · no eBay", valor, "pedes 38 € · menos 6 €", "Expira em 21 horas".
Ações: se a plataforma permite responder pela API, "Aceitar" (primário compacto) e "Rejeitar" (secundário compacto), com confirmação para "Aceitar"; senão "Responder no Discogs ↗".
Secção "Respondidas" com as últimas 20.
Vazio: "Sem propostas" / "Quando alguém fizer uma proposta, aparece aqui e recebes uma notificação."

### 7.11 Vendas — `(tabs)/vendas` · artboard "7 · Vendas"

Título "Vendas" → `Segmented` "Este mês / 3 meses / Este ano" → cartão de total: "Recebes em novembro", total líquido (`bigNumber`), "4 vendas · 487,00 € menos 74,60 € de comissões", barra repartida por plataforma (cores `ink`, `primary`, `chart3`) com legenda → "Vendas de novembro": `SaleRow`s.
Vazio: "Ainda sem vendas neste período."

### 7.12 Conta — `(tabs)/conta` · artboard "8 · Conta"

Título "Conta" + email → "Plataformas ligadas" (nome, "Ligada como …", "Desligar" com confirmação) e "Ligar outra plataforma" quando houver → "Subscrição": o plano ativo ("Plano anual" ou "Plano mensal") + "Renova a [data]" → `subscricao`; "Restaurar compras" → "Ajuda": "Suporte", "Termos e privacidade" → "Terminar sessão" → "Eliminar conta" em `danger` (confirmação em 2 passos; exigido pela Apple).

### 7.13 Subscrição — `subscricao` (modal) · artboard "9 · Subscrição"

Fechar (X, 44×44) → `Logo` → título "Vende em várias plataformas sem trabalho a dobrar" → 3 benefícios com visto `primaryPressed` sobre `primaryTint` → planos (rádio): Anual e Mensal, com preço do RevenueCat → "Subscrever" → "Cancelas quando quiseres nas definições da Apple." + "Restaurar compras · Termos · Privacidade".
Preços e período de teste por definir: nunca escrever preços no código, ler sempre do RevenueCat.

## 8. Notificações push

| Evento | Título | Corpo | Abre |
|---|---|---|---|
| Nova proposta | "Nova proposta: 32 €" | "Kind of Blue no eBay · pedes 38 €" | Propostas |
| Nova venda | "Vendeste Kind of Blue" | "38 € no eBay. Retirámos o anúncio do Discogs." | Detalhe |
| Falha ao retirar | "Retira Kind of Blue do Discogs" | "Vendeu no eBay, mas não conseguimos retirar do Discogs." | Detalhe |
| Publicação terminada (em segundo plano) | "Publicado em 1 de 2 plataformas" | "O eBay precisa de uma política de envio." | Resultado |

## 9. Critérios de aceitação por ecrã

Um ecrã só está pronto quando:
1. corresponde ao artboard do canvas (mesma ordem, hierarquia e textos);
2. usa só valores de `theme.ts`;
3. tem os estados a carregar, vazio e erro (§5);
4. todos os alvos de toque têm pelo menos 44 pt e os elementos interativos têm `accessibilityRole` e `accessibilityLabel`;
5. funciona com texto grande (Dynamic Type até XL) sem cortar o botão principal;
6. foi visto no simulador e comparado com o artboard.
