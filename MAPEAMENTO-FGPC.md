# Mapeamento — Treinamento Comercial FGPC + Integração

> Documento de registro de tudo que foi realizado nesta entrega.
> Serve como blueprint para reproduzir o processo em qualquer novo produto.

---

## 1. Objetivo

Criar um **treinamento comercial completo** para o produto **FGPC** (Formação em Gestão de Pessoas com Perfil Comportamental), clonando a estrutura/funcionalidades do treinamento existente `treinamento-cis/`, com:
- Identidade visual própria (extraída do PDF do FGPC).
- Conteúdo 100% adaptado ao FGPC (~115 slides).
- Um módulo **SPIN Selling** adaptado ao produto (regra: todo treinamento terá esse módulo).
- Integração no sistema (`dashboard.html` → card *Treinamentos / Apresentações*).
- Um **Caminho C** na aba *+ Adicionar* (biblioteca de treinamentos prontos).

---

## 2. Como o "treinamento" funciona (arquitetura do molde)

O molde é o `treinamento-cis/`. Cada treinamento é um **app multi-arquivo** que roda via `file://`:

- **`index.html`** = *shell* (casca). Contém:
  - Sidebar de navegação + menu (hero, cards de módulo) + *player* com `<iframe>`.
  - CSS embutido no `<style>` + `assets/<produto>.css`.
  - JS embutido: objeto `ROUTES` (rota → arquivo), `NESTED_PARENT`, e `SLIDE_TITLES` (lista **estática** de subtópicos por deck — necessária porque `file://` bloqueia ler outros arquivos).
- **Decks** (`modulo-1..4.html`, `spin-selling.html`, `fechamento.html`) = cada um é um conjunto de slides `<section class="slide">` dentro de `.stage > .deck`, abertos no iframe do shell.
- **`assets/<produto>.css` + `<produto>.js`** = estilo dos slides + motor (auto-escala 16:9, navegação por teclado/touch, revelação item-a-item, modo edição inline, tela cheia, sincronização com a sidebar via `postMessage`).

Mecânica preservada do CIS (não reescrita): classes internas `--cis-*`, `.cis-step`, `.cis-table` foram mantidas (invisíveis ao usuário) — só os **valores de cor** mudaram.

---

## 3. Identidade visual (FGPC)

Extraída do PDF `FGPC – Formação em Gestão de Pessoas com Perfil Comportamental` via **Poppler** (`pdftoppm` → PNG → leitura).

| Token | Valor | Uso |
|-------|-------|-----|
| Fundo base | `#0a0b12` → `#243156` (rampa) | preto-grafite → navy |
| Gradiente do slide | `#0c1124 → #0a0d17 → #07090f` | fundo dos decks |
| Accent (dourado) | `#f5b81d` | títulos, destaques, "raio" Febracis |
| Texto / muted | `#f4f6fb` / `#aab3c6` | corpo |

Decisão: **preto-grafite + dourado** (aprovado), diferenciando do CIS (azul-marinho). Uma variante navy foi prototipada e descartada.

---

## 4. Arquivos criados

```
treinamento-fgpc/
├── index.html              (shell — sidebar, cards, ROUTES, SLIDE_TITLES, branding FGPC)
├── modulo-1.html           (20 slides — Produto)
├── modulo-2.html           (20 slides — Prospecção e Qualificação)
├── modulo-3.html           (20 slides — Apresentação e Proposta)
├── modulo-4.html           (20 slides — Negociação e Objeções)
├── spin-selling.html       (20 slides — SPIN Selling adaptado ao FGPC)
├── fechamento.html         (15 slides — Fechamento)
└── assets/
    ├── fgpc.css            (cópia do cis.css; paleta trocada)
    └── fgpc.js             (cópia do cis.js; mecânica idêntica)
```
**Total: 115 slides.** Fluxo encadeado: Produto → Prospecção → Apresentação → Negociação → SPIN → Fechamento → Menu.

---

## 5. Inventário de conteúdo (títulos dos slides)

### Módulo 1 — Produto (FGPC)
Capa · O que é o FGPC · A Dor que o FGPC Resolve · Por que o FGPC Existe (turnover) · Transformação vs. Produto · Os 5 Eixos · Teoria DISC (4 perfis) · Estilos de Liderança · Tipos Psicológicos e Valores · Inteligência Comportamental · DNA Organizacional · O que o Cliente Compra · Para Quem é (ICP) · Overview (3 dias/+30h) · O que o Gestor Faz com o que Aprende · FGPC em Números · Estrutura do Pitch · Erros Comuns · Caso de Sucesso · Checklist + Próximos Passos

### Módulo 2 — Prospecção e Qualificação
Capa · Prospecção Estratégica · Funil Inteligente · ICP · Onde Encontrar Gestores · Tipos de Lead · Sinais de Dor de Gestão · SPIN na Qualificação · Diagnóstico: Turnover e Custos · Escuta Ativa · Roteiro de Qualificação · Matriz de Priorização · Gatilhos de Abordagem · Mensagens de Prospecção · Qualificando o Decisor · Preparação para a Reunião · Exemplo · Exercício · Erros Fatais · Checklist

### Módulo 3 — Apresentação e Proposta
Capa · Vender Valor, Não Carga Horária · Estrutura de Apresentação · Conectar Dor→Solução · Demonstração da Plataforma DISC · 5 Eixos como Benefício · Storytelling Organizacional · Gatilhos Mentais · Construção de Autoridade · Proposta Irresistível · Ancoragem de Preço · Prova Social e Cases · ROI da Gestão Comportamental · Comunicação Não-Verbal · Conduzindo a Reunião · Framework de Conversão · Exemplo · Exercício · Erros · Checklist

### Módulo 4 — Negociação e Objeções
Capa · Psicologia da Objeção · Tipos de Objeções · "Está caro" · Contorno de Preço · "Preciso pensar" · "Já tenho RH/consultoria" · "Não tenho tempo" · "Não é o momento" · Urgência Ética · Custo da Inação · Negociação Avançada · Scripts Prontos · Método Benjamin Franklin · Técnica do Silêncio · Reframing · Fechando a Negociação · Exercício · Erros Fatais · Matriz de Objeções

### SPIN Selling (aplicado ao FGPC)
Capa · O que é SPIN · Por que o Closer Usa · Regra de Ouro · SPIN no Fluxo da Venda · Perguntas de SITUAÇÃO · de PROBLEMA · de IMPLICAÇÃO · de NECESSIDADE · Frases-Ponte · Narrativa 1 (time desengajado) · Narrativa 2 (turnover alto) · Narrativa 3 (RH sem ferramenta) · Narrativa 4 (líder técnico) · Combos SPIN+Fechamento · Frases que Matam a Venda · Erros Fatais · Mapa de Diagnóstico por DISC · Roleplay · Checklist + Mantra

### Fechamento (FGPC)
Capa · Regra de Ouro · 4 Pilares · Sinais de Compra · Sequência Clássica · Frases Prontas · Choice Close · Yes Ladder · Custo da Inação · Empathy Close + Prova Social · O Silêncio · Garantia (inversão de risco) · Contornos ("caro/pensar/já tenho RH") · Roteiro da Abertura ao Contrato · Checklist Final + Mantra

---

## 6. Integração no sistema

### 6.1 Registro no Painel
Arquivo: `assets/js/treinamentos/registro-inicial.js`
- Adicionado objeto ao array `window.TRAP_REGISTRO` com `id: 'treinamento-fgpc'`, metadados e `estrutura[]` listando os 7 HTMLs (índice + 4 módulos + SPIN + Fechamento).
- Resultado: o card **Treinamentos Comercial FGPC** aparece no Painel com navegação lateral entre as 7 partes (igual ao CIS).

### 6.2 Caminho C (aba + Adicionar)
Arquivo: `assets/js/52-treinamentos-apresentacoes.js`
- CSS: `.trap-add-grid` → grid responsivo `auto-fit`; novas variantes `.trap-caminho-tag.c` / `.trap-caminho-ic.c` e estilos `.trap-cat-*`.
- Texto da aba: **"2 caminhos" → "3 caminhos"**.
- Nova função `_caminhoCHtml()`: lista os treinamentos `origem:'html-existente'` (FGPC, CIS) com botões **Abrir** / **↗ nova aba**, reusando `window._trapAbrirAqui` e `_trapAbrirNovaAba`.

### 6.3 Infra (ferramentas)
- **Poppler** instalado via `winget install oschwartz10612.Poppler` para renderizar PDFs (`pdftoppm`).

---

## 7. Pipeline de produção (blueprint replicável para um novo produto)

1. **Identidade + conteúdo**: `pdftoppm` no PDF → ler PNGs (cores/logo) + `pdftotext -layout` (texto base).
2. **Scaffold**: `mkdir treinamento-<produto>/assets`; copiar `cis.css`/`cis.js` → `<produto>.css`/`.js`; trocar valores de cor no `:root` + gradientes.
3. **Shell**: copiar `index.html` do molde; substituir assets, rotas, branding, hero/cards e o bloco `SLIDE_TITLES`.
4. **Decks**: para cada um dos 6 decks, replicar o molde `modulo-1.html` (mesmas classes) com conteúdo do produto; títulos casando com `SLIDE_TITLES`; `end-cta` encadeando.
5. **Registro**: acrescentar objeto em `TRAP_REGISTRO` com `estrutura[]`.
6. **Validar**: contagem de slides, assets, links de avanço, ausência de resíduos do molde anterior.

> Detalhes do padrão também estão na memória do projeto (`project_treinamentos_por_produto`).

---

## 8. Restrição técnica do "Caminho C gerador automático"

A visão de **"jogar um PDF no Caminho C e sair o treinamento pronto"** esbarra na arquitetura atual:
- O app roda em `file://`, **sem back-end**.
- O navegador, sozinho, **não escreve** uma pasta com 8 arquivos no disco e **não chama a IA** (precisa de chave/servidor).
- Quem produziu tudo de fato foi o **Claude Code** (acesso ao disco + geração de conteúdo). O *Caminho A* atual contorna isso via copia-e-cola, salvando **1 HTML inline** (não uma pasta).

**Opções avaliadas:**
1. *Caminho C prepara + Claude gera* — app extrai o PDF e monta um prompt-mestre; o Claude Code gera os arquivos. (sem back-end)
2. ✅ **ESCOLHIDA — Geração via Claude Code sob demanda** — você envia o PDF, o Claude Code devolve o treinamento. (zero infra; foi o processo desta entrega)
3. *Automação real* — script Node + API Anthropic + escrita em disco (1 clique, mas exige Node, chave e sair do `file://`).

### Como gerar o próximo treinamento (direção 2)
Basta acionar o Claude Code com:
> "Cria o treinamento comercial do produto **&lt;nome&gt;** a partir do PDF `&lt;caminho do PDF&gt;`, seguindo o padrão do FGPC."

O Claude Code então: lê o PDF (Poppler) → extrai cores/conteúdo → executa o pipeline da seção 7 → cria a pasta `treinamento-&lt;produto&gt;/` + registra em `TRAP_REGISTRO` → o novo treinamento passa a aparecer no Painel e na biblioteca do Caminho C.

---

## 9. Status

| Item | Status |
|------|--------|
| treinamento-fgpc/ (6 decks, 115 slides) | ✅ Concluído |
| Paleta grafite + dourado | ✅ Aprovado |
| Registro em TRAP_REGISTRO | ✅ Concluído |
| Caminho C (biblioteca de prontos) | ✅ Implementado (validar no dashboard) |
| Estratégia de geração de novos | ✅ Direção 2 — via Claude Code sob demanda (seção 8) |
