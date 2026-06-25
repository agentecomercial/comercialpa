# 🗂️ Comandos do Projeto — Vitória (Sales Cube / MCP)

Todos os scripts `.ps1` ficam na raiz do projeto e rodam contra o **MCP Sales Cube**.
Sintaxe dos parâmetros: `[mês]` = nome ("junho") ou `-Periodo AAAA-MM`; `<nome>` = parte do nome do consultor.

---

## 📊 1. Faturamento / Vendas
**Script:** `Faturamento-Vitoria.ps1`

| Comando | O que faz |
|---|---|
| `Faturamento Vitória [mês]` | Relatório completo da unidade (todos os consultores). Ex.: "junho" → `-Periodo 2026-06` |
| `Vendas Vitória [mês]` | Idem (sinônimo). Por padrão mostra só o **Resumo por consultor** (ranking) |
| `Vendas Vitória [mês] Detalhe` | Mostra a **tabela detalhada** de cada venda (Data \| Cliente \| Financeiro \| Valor) |
| `Vendas Vitória <consultor> [mês]` | Filtra um consultor (ex.: "Gabriela") |

**Modificadores:** `por fechamento` (padrão) / `por faturamento` · exporta → `-Csv -Abrir`.
Saída sempre ordenada por **faturamento decrescente**.

---

## 🎯 2. Metas
**Script:** `Meta-Vitoria.ps1` + cadastro em `metas-vitoria.json`

| Comando | O que faz |
|---|---|
| `Meta Vitória Unidade [mês]` | Realizado da unidade × meta (3 níveis: mín/básica/master) × % × falta × projeção |
| `Meta Vitória Consultores [mês]` | Por consultor: Realizado \| Projeção \| %+Falta dos 3 níveis (+ linha TOTAL) |
| `Meta Vitória Consultor <nome>` | Filtra um consultor (ex.: "Gabriela") |
| `Meta Geral` | Consultores + Unidade + bloco "quanto falta para a unidade bater a meta" (R$ por nível + R$/dia) |
| `Cadastro/edição de metas` | Fluxo guiado (sem script) — grava no `metas-vitoria.json` |

---

## 🎯 3. Leads — Relatórios
**Scripts:** `Leads-Vitoria.ps1`, `Leads-Vitoria-Campanha.ps1`, `Movimentacao-Leads.ps1`

| Comando | O que faz |
|---|---|
| `Leads Vitória [mês] [etapa]` | Resumo por consultor numa etapa. Sem mês = mês vigente; sem etapa = matriz completa. **Etapas:** 1 Novo Lead · 2 Farmer · 3 Conversa Ativa · 4 Negociação · 5 Venda Feita · 6 Nutrição |
| `Leads Vitória campanha [mês]` | 2 tabelas: consultor × etapas 1–6 (+ Total) × campanhas (MCIS / TCE / Outros); e campanha × etapa |
| `Movimentação de Leads [período]` | Leads criados no período × etapa atual → "recebeu vs movimentou" + % conversão + alerta de leads parados. Fluxo guiado (mês vigente / mês específico / intervalo de datas) |

---

## 🔁 4. Leads — Ações (fluxos guiados, sem script)

| Comando | O que faz |
|---|---|
| `Transferência de Leads` | Reatribui leads de um consultor para outro(s). 4 perguntas (mês → origem/destino → etapa→etapa → quantos+ordem) → prévia → aplica após aceite |
| `Equilíbrio de Leads` | Redistribui leads **igualmente** entre consultores escolhidos (base: Ativos 1–4 ou etapa específica) → prévia antes/depois → aplica após aceite |
| `Equilíbrio de Leads campanha [mês]` | Igual ao Equilíbrio, mas só dos leads de **uma campanha** (MCIS / TCE / Outros) |

---

## 🚀 5. Deploy / Publicação

| Comando | O que faz |
|---|---|
| `Deploy` | Sobe e atualiza o `dashboard.html` no GitHub Pages: **1)** `scripts/bump-cache.ps1` (renova os `?v=`) → **2)** `git add -A` + `git commit` → **3)** `git push origin main` (só o remote **origin** / dashboardcomercialpa) |

**Destinos de visualização do dashboard** (mesmo arquivo): **Local** `http://127.0.0.1:5500` (via `serve-agenda.ps1`) · **Servidor Desktop** `file:///.../dashboard.html` · **GitHub** (Pages, atualizado pelo `Deploy`).

---

## 🔧 Utilitários (não-Vitória, execução direta, sem gatilho de chat)

| Script | O que faz |
|---|---|
| `serve-agenda.ps1` | Servidor HTTP local em `http://127.0.0.1:5500` para servir o HTML |
| `scripts/bump-cache.ps1` | Bump de cache (renova `?v=` no dashboard.html) — usado pelo `Deploy` |
| `scripts/check-js-syntax.ps1` | Checagem de sintaxe JS |
