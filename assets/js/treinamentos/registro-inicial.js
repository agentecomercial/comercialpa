/* ═══════════════════════════════════════════════════════════════════
   REGISTRO INICIAL · Treinamentos / Apresentações
   ───────────────────────────────────────────────────────────────────
   Estado inicial respeitado: só os conteúdos que VOCÊ adicionar
   explicitamente. Nenhum seed automático além do que está aqui.

   Atualmente: 1 entrada (Treinamento Método CIS), importada do
   diretório treinamento-cis/ via Caminho B (importar HTML existente).

   COMO ADICIONAR MAIS CONTEÚDOS:
   - Pela UI (recomendado): "+ Adicionar conteúdo" → Caminho A (Claude)
     ou Caminho B (importar pasta/arquivo HTML).
   - Manualmente: acrescente um objeto no array TRAP_REGISTRO abaixo.

   FORMATO DO OBJETO:
     id          : slug único e imutável
     titulo      : nome exibido no card
     descricao   : 1-2 frases pra listagem
     produto     : agrupador (filtro)
     tipo        : 'treinamento' | 'apresentacao'
     status      : 'publicado' | 'oculto'
     novo        : true | false (badge "✨ Novo")
     ordem       : número menor aparece primeiro
     url         : caminho do HTML standalone (capa/entry point)
     icone       : emoji do card
     origem      : 'claude' | 'html-existente'  (procedência)
     estrutura   : (opcional) sub-itens — útil pra treinamentos
                   multi-arquivo. Cada item: {titulo, url, tipo}.

   PERSISTÊNCIA:
   - Edições via UI (publicar/ocultar/marcar novo/reordenar) são
     gravadas em Firebase em treinamentos/overrides/{id} e
     sobrescrevem os defaults daqui na renderização.
   - Adições novas via "+ Adicionar conteúdo" são gravadas em
     Firebase em treinamentos/adicionados/{id}.
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  window.TRAP_REGISTRO = [
    {
      id: 'treinamento-cis',
      titulo: 'Treinamento Método CIS',
      descricao: 'Treinamento completo do Método CIS para consultores e equipe interna. 7 HTMLs standalone importados de treinamento-cis/.',
      produto: 'CIS',
      tipo: 'treinamento',
      status: 'publicado',
      novo: true,
      ordem: 10,
      url: 'treinamento-cis/index.html',
      icone: '🎓',
      origem: 'html-existente',
      estrutura: [
        { titulo: 'Capa / Índice',                       url: 'treinamento-cis/index.html',       tipo: 'index'  },
        { titulo: 'Módulo 1 — Produto (Método CIS)',     url: 'treinamento-cis/modulo-1.html',    tipo: 'modulo' },
        { titulo: 'Módulo 2 — Prospecção e Qualificação', url: 'treinamento-cis/modulo-2.html',    tipo: 'modulo' },
        { titulo: 'Módulo 3 — Apresentação e Proposta',  url: 'treinamento-cis/modulo-3.html',    tipo: 'modulo' },
        { titulo: 'Módulo 4 — Negociação e Objeções',    url: 'treinamento-cis/modulo-4.html',    tipo: 'modulo' },
        { titulo: 'SPIN Selling para Closer',            url: 'treinamento-cis/spin-closer.html', tipo: 'extra'  },
        { titulo: 'Fechamento · Scripts, Narrativas e Roteiros', url: 'treinamento-cis/fechamento.html', tipo: 'final' }
      ]
    }
  ];
})();
