/* ════════════════════════════════════════════════════════════════
   IMPORTAÇÃO TCE — redireciona para o modal padrão de importação
   O processamento TCE (normalização de promoção) é feito em
   05-importacao.js via flag window._turmaAtiva.codigo === 'TCE-BEL'
════════════════════════════════════════════════════════════════ */

function tceAbrirImportacao(turmaId) {
  /* Simplesmente abre o modal padrão — o processamento TCE ocorre
     automaticamente em impProcessarAOA quando _turmaAtiva é TCE-BEL */
  if (typeof openImportModal === 'function') openImportModal();
}

function tceFecharImportacao() {
  if (typeof closeImportModal === 'function') closeImportModal();
}
