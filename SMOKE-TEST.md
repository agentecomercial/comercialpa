# 🧪 Smoke Test — Checklist anti-regressão

Roteiro de testes manuais a executar **antes de subir qualquer mudança**.
Cada nível pega progressivamente mais bugs. Use o **Quick** sempre; use o
**Completo** quando mexer em cálculos ou UI compartilhada; use **Por área**
quando mexer numa parte específica.

> **Antes de tudo:** rode `bump.cmd` (ou clica 2× nele) e Ctrl+Shift+R no
> navegador para garantir cache limpo.

---

## ⚡ Quick (2 minutos) — para QUALQUER mudança

- [ ] **1.** Login funciona (não trava em loading infinito).
- [ ] **2.** Tela "Turmas" carrega → algum card mostra "Faturado: R$ X" não-zero.
- [ ] **3.** Entra numa turma → aba **Geral** carrega sem erro vermelho no console (F12).
- [ ] **4.** Os 5 KPIs (Potencial / Em aberto / Faturado / Entradas / Faltam) mostram valores plausíveis.
- [ ] **5.** Volta pra tela Turmas (← Turmas) → consegue voltar sem erro.
- [ ] **6.** Logout funciona.

---

## ✅ Completo (5–10 minutos) — para mudanças em cálculos / regras de negócio

Inclui tudo do Quick mais:

### Cálculos coerentes entre lugares

- [ ] **7.** `Faturado` do KPI = `Faturado` do card da turma (tela Turmas) = `Faturamento Total` no Mapeamento filtrado por essa turma. **Os 3 batem.**
- [ ] **8.** Filtra `PAGO` no card Clientes → o "Total" embaixo da tabela bate com o KPI **Faturado** superior.
- [ ] **9.** Filtra `NEGOCIAÇÃO` → bate com **Potencial total**.
- [ ] **10.** Filtra `ABERTO` → bate com **Em aberto**.

### Caso ROBSON (cliente com mix de pago + negociação)

> ROBSON tem 2 subs: IF pago R$ 1.850 + MENT.IA negociação R$ 8.997 + entrada R$ 2.000 gravada no IF.

- [ ] **11.** Aparece em **Faturado** com R$ 1.850 (sub IF pago).
- [ ] **12.** Aparece em **Potencial total** com R$ 8.997 (sub MENT.IA).
- [ ] **13.** Aparece em **Total entradas** com R$ 2.000 (reatribuído do IF para MENT.IA).
- [ ] **14.** No card "Consultor × Produto — Clientes Entrada", aparece em **MENT. IA PARA NEGOCIOS** (não em IF).
- [ ] **15.** Modal de Informações do cliente: entrada aparece atrelada ao MENT.IA, não ao IF.
- [ ] **16.** Clicando na célula `DANIEL × MENT.IA` do card Entrada, o modal lista **2 clientes** (JODSON + ROBSON).

### Modais clicando em KPI

- [ ] **17.** Clica no KPI **Faturado** → modal abre, subtítulo bate com o valor do KPI, soma das linhas do modal = subtítulo.
- [ ] **18.** Idem para **Em aberto**, **Potencial total**, **Total entradas**.
- [ ] **19.** Cliente com mix (ROBSON) aparece em mais de um modal — em cada um, mostra **só o sub do status do modal**, não o valor total do cliente.

---

## 🎯 Por área (quando mexer em algo específico)

### Mexeu em `_achatarItens` ou helpers de cálculo (02-main.js)
- [ ] Rodar **Completo** inteiro.
- [ ] No console: `_faturadoDoCliente(data[0])` e `_entradaParaSub(data[0], 0)` retornam números coerentes.

### Mexeu em CSS / layout
- [ ] Visualiza em 3 viewports via `tabs-preview.html`: 1920, 1440, 768.
- [ ] Modal "🎛 COLUNAS" abre centralizado, fecha clicando fora.
- [ ] Topbar não quebra: META, "N online", "Online", ⋯, 🔔, Sair — todos visíveis na linha.

### Mexeu em filtros do card Clientes
- [ ] Filtra por **Treinamento** específico → linhas reduzem corretamente.
- [ ] Combina filtro status + treinamento → bate com expectativa.
- [ ] Limpar filtros restaura tudo.

### Mexeu no Mapeamento (Inteligência Comercial)
- [ ] Clica em "Atualizar dados" → seleção de ano/mês **preserva** (não reseta).
- [ ] Filtro de meses funciona individual e combinado.
- [ ] Tabela "Consultor × Treinamento" ordena ao clicar nos cabeçalhos.

### Mexeu em modais
- [ ] Modal abre.
- [ ] Esc fecha.
- [ ] Clicar no backdrop/fora fecha.
- [ ] Conteúdo bate com o que disparou o modal.

### Mexeu em propostas (aba Produto)
- [ ] Card de produto na aba Produto abre o modal de proposta.
- [ ] Gera PDF (produtos legados) OU abre HTML standalone (produto IF).
- [ ] PDF/HTML tem os dados corretos do cliente.

### Mexeu em sincronização Firebase
- [ ] Cria/edita cliente → recarrega página → mudança persistiu.
- [ ] Badge "Online" no topbar fica verde (não amarelo "N PEND.").
- [ ] Abre o app em duas abas → mudança numa propaga pra outra.

---

## 🛡️ Auto-verificação no console — `_diag`

Carregue uma turma e abra DevTools (F12 → Console). Digite:

```
_diag.ajuda()
```

Funções disponíveis:

| Comando | O que faz |
|---|---|
| `_diag.helpers()` | Verifica que todos os helpers canônicos (`_faturadoDoCliente`, `_entradaParaSub`, etc.) estão carregados. Se algum faltar → bug de cache ou ordem de scripts. |
| `_diag.totais()` | Imprime os 4 totais granulares (Faturado / Em aberto / Potencial total / Total entradas). Compare visualmente com os KPIs do topo da tela. |
| `_diag.divergencias()` | **Auto-check**: lê os KPIs do DOM e compara com os cálculos. Se algum não bate, lista a diferença. Verde = OK em tudo. |
| `_diag.cliente("ROBSON")` | Inspeção completa de 1 cliente (busca parcial por nome): scalar, status efetivo, valores granulares e tabela dos subs com entrada bruta vs entrada visível. |
| `_diag.snapshot.baixar()` | Baixa um **baseline JSON** com totais granulares de TODAS as turmas (faturado/aberto/negociação/entrada por turma). Use antes de uma mudança grande. |
| `_diag.snapshot.comparar(json)` | Após a mudança, cole o JSON baixado e veja **se algum total mudou sem motivo** (regressão silenciosa). Verde = nenhuma mudança; tabela = onde divergiu. |

**Use `_diag.divergencias()` após qualquer mudança em cálculos.** Se aparece tudo verde, está coerente.

### Fluxo recomendado quando mexer em cálculos de larga escala

1. `_diag.snapshot.baixar()` → salva `snapshot-YYYY-MM-DD.json` no disco.
2. Faz a mudança no código → `bump.cmd` → Ctrl+Shift+R.
3. No console, cola o conteúdo do JSON salvo dentro de `_diag.snapshot.comparar(...)`.
4. Se aparecer **"NENHUMA MUDANÇA"** → ok subir. Se listar divergências → investigar antes de comitar.

---

## 📋 Quando reportar bug ao Claude

Inclua sempre:

1. **Turma** que você estava (nome ou código).
2. **Cliente específico** que apresentou o problema (se aplicável).
3. **Esperado vs. observado** (valor X aparece, mas devia aparecer Y).
4. **Print** do card/modal/tela.
5. **Output do console** (rola até o erro vermelho, copia o texto).
6. Se mexeu no código recentemente: o que mudou.

---

## 📁 Histórico

O checklist antigo (era de modularização, fases 0→N) está em
[`docs/smoke-test-modularizacao.md`](docs/smoke-test-modularizacao.md)
para referência histórica.
