# SMOKE-TEST — dashboard.html

Lista de verificação manual a ser executada **após cada fase** de modularização, antes de commitar e seguir para a próxima fase.

> Como rodar: abrir `dashboard.html` via Live Server (clique direito no VS Code → "Open with Live Server"). Manter DevTools aberto durante o teste — qualquer linha vermelha no Console é bloqueador.

---

## 1. Login e sessão

- [ ] Login com usuário/senha válido entra no sistema.
- [ ] Login com senha incorreta mostra mensagem de erro.
- [ ] Logout limpa a sessão (F5 após logout volta para tela de login).
- [ ] Primeiro acesso: modal de troca de senha aparece quando aplicável.

## 2. Home (3 cards)

- [ ] Card **Turmas** abre tela de turmas.
- [ ] Card **Mapeamento** abre dashboard de mapeamento.
- [ ] Card **Pipeline** navega corretamente.

## 3. Tela de Turmas

- [ ] Lista de turmas carrega do Firebase.
- [ ] Filtro por ano funciona (botões de ano filtram corretamente).
- [ ] Clicar em uma turma abre o dashboard daquela turma.
- [ ] **Alternar entre os 7 layouts (A, B, C, D, E, F, G)** — todos renderizam sem quebra visual.
- [ ] Layout swimlane mostra timeline corretamente.
- [ ] Layout cards mostra cards corretamente.
- [ ] Criar nova turma persiste no Firebase (verificar que aparece após F5).
- [ ] Excluir turma remove do Firebase.
- [ ] Tela "turma inativa" aparece quando não há turma ativa global.

## 4. Dashboard — 5 abas

Para cada aba, verificar que renderiza sem erro de console **e** que os dados batem com o estado anterior (comparar com baseline):

- [ ] Aba **Geral** — KPIs, gráficos, info turma.
- [ ] Aba **Consultor** — cards de consultores + ranking.
- [ ] Aba **Treinador** — gráfico de barras por treinador.
- [ ] Aba **Produto** — análise por treinamento.
- [ ] Aba **Mapeamento** — KPIs e ranking dentro do dashboard.

## 5. Clientes (lista editável)

- [ ] Adicionar novo cliente inline funciona.
- [ ] Editar campo (status, valor, treinamento) salva corretamente.
- [ ] Excluir cliente remove da lista e persiste.
- [ ] **Máscara de moeda em tempo real** ao digitar valor (R$ 1.000,00).
- [ ] Buscar/filtrar clientes funciona.
- [ ] Selecionar múltiplos + excluir em batch.
- [ ] Detalhe do cliente abre em modal (leitura).

## 6. Modais (15+)

Abrir e fechar cada um, verificando que ESC fecha e clique fora fecha (se for o comportamento atual):

- [ ] `salvarComoOverlay`
- [ ] `salvarTreinamentosOverlay`
- [ ] `gerenciarTurmasOverlay` (ADM)
- [ ] `clienteDetalheOverlay`
- [ ] `editarConsultoresOverlay` (ADM)
- [ ] `editarTreinadoresOverlay` (ADM)
- [ ] `novaTurmaOverlay` (ADM)
- [ ] `permsModalOverlay` (ADM)
- [ ] `pendLogOverlay` (ADM)
- [ ] `pdfClientesOverlay`
- [ ] `propostaOverlay`
- [ ] `propProdOverlay`
- [ ] `listaClientesOverlay`
- [ ] `importModalOverlay`
- [ ] `gerenciarTreinamentosOverlay` (ADM)

## 7. Importação de dados

- [ ] Upload de arquivo Excel/CSV processa e mostra preview.
- [ ] Importar do Google Sheets funciona com URL pública.
- [ ] Confirmar importação grava clientes no Firebase.

## 8. Mapeamento

- [ ] Tela de mapeamento carrega dados do Firebase.
- [ ] KPIs renderizam (faturamento, meta, atingimento).
- [ ] Ranking de consultores renderiza ordenado.
- [ ] Ranking de treinamentos renderiza ordenado.
- [ ] Filtro de ano funciona.
- [ ] Filtro de meses (toggle individual e "todos") funciona.

## 9. PDFs

- [ ] Gerar **proposta comercial PDF** (com cliente + treinamentos selecionados) — download correto.
- [ ] Gerar **proposta de produto PDF** (versão simplificada) — download correto.
- [ ] Gerar **relatório PDF de clientes** (com filtros de seções e consultores) — download correto.
- [ ] Conteúdo dos PDFs está visualmente correto (cabeçalho, tabelas, valores).

## 10. Permissões

- [ ] Usuário **ADM** vê opções de gerenciar turmas, treinamentos, permissões, log de pendências.
- [ ] Usuário **Consultor** NÃO vê opções de ADM.
- [ ] Usuário **Treinador/Ministrante** vê apenas o que deve ver.
- [ ] Tentativa de ação sem permissão é bloqueada (não silenciosa).

## 11. Sincronização entre abas

- [ ] Abrir o app em duas abas do mesmo navegador.
- [ ] Criar/editar dado em uma aba — segunda aba reflete a mudança via BroadcastChannel.
- [ ] Logout em uma aba propaga para a outra.

## 12. Persistência

- [ ] F5 mantém estado (turma ativa, aba selecionada).
- [ ] Logout + login mantém os dados (não há perda).
- [ ] Modo offline (desligar Wi-Fi/desabilitar rede): app continua funcional via localStorage; reconecta sincroniza.
- [ ] Audit log registra mudanças (verificar `audit_log/` no Firebase Console se aplicável).

## 13. Console limpo

- [ ] **0 erros vermelhos** no DevTools Console durante todo o fluxo de teste.
- [ ] Warnings amarelos podem ser tolerados se já estavam no baseline.

---

## Após confirmar todos os itens

1. Adicionar arquivos modificados: `git add <arquivos>`
2. Commitar com mensagem descritiva: `git commit -m "phase X.Y description"`
3. Fazer push para `origin`: `git push`
4. Salvar cópia funcional em `_backups/dashboard-vN-fase.html`.
5. Avisar para seguir para a próxima fase.

## Se algo quebrar

- **Reverter última fase**: `git revert HEAD` (cria commit de reversão).
- **Voltar ao baseline**: copiar `_backups/vf-v0-baseline.html` por cima de `dashboard.html` e remover `assets/`.
- **Reverter um commit específico**: `git revert <hash-curto>` (achar com `git log --oneline`).

## Histórico de testes

Anotar aqui após cada fase:

| Data | Fase | Quem testou | Status | Observações |
|---|---|---|---|---|
| | Fase 0 — baseline rename | | | |
