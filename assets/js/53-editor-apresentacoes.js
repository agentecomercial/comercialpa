/* ═══════════════════════════════════════════════════════════════════
   EDITOR DE APRESENTAÇÕES · Fase 1 · Fundação
   ───────────────────────────────────────────────────────────────────
   Módulo isolado em IIFE. Não toca em nenhuma funcionalidade
   existente do dashboard. Roda via file:// (sem fetch externo).

   API PÚBLICA (window):
     abrirEditorApresentacao(opts)    ← entrada principal
       opts = { id?: 'apr_xxx', novo?: true, titulo?, produto? }
     voltarEditorApresentacao()       ← botão voltar interno

   DEPENDÊNCIAS já presentes no dashboard:
     window._fbGet / _fbSet / _fbChange   (stubs Firebase)
     window._mostrarTela                  (navegação centralizada)
     window._showToast                    (notificações)
     window._TELAS                        (registra trapScreen pattern)

   STORAGE FIREBASE:
     treinamentos/apresentacoes/{id} = {
       id, titulo, produto, tema, criadoEm, atualizadoEm,
       cards: [
         { id, blocos: [
           { tipo:'heading', texto, nivel },
           { tipo:'texto', texto },
           { tipo:'imagem', url, alt },
           { tipo:'video', url },        // YouTube/Vimeo embed
           { tipo:'cta', texto, href }
         ]}
       ]
     }
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Estado ─────────────────────────────────────────────────────── */
  var _apr = null;             /* dados da apresentação ativa */
  var _cardIdx = 0;             /* qual card está sendo editado */
  var _saveTimer = null;        /* debounce do auto-save */
  var _modoApresentar = false;
  var _slideIdx = 0;
  var _montado = false;

  /* ── Estado Fase 4 · Ferramentas Apresentar ────────────────────── */
  var _destaqueOn = false;      /* revelação progressiva ativa */
  var _destaqueItems = [];      /* nós DOM revelados no slide atual */
  var _destaqueIdx = 0;         /* até onde já foi revelado */
  var _canetaOn = false;        /* canvas drawing ativo */
  var _drawCtx = null;          /* context2d do canvas */
  var _drawMode = 'pen';        /* pen | highlight | erase */
  var _drawColor = '#c8f05a';
  var _drawThick = 4;
  var _drawing = false;
  var _drawPath = null;         /* trajeto sendo desenhado agora */
  var _drawHistory = [];        /* pilha de trajetos pra undo (por slide) */
  var _blackOn = false;
  var _whiteOn = false;
  var _overviewOn = false;
  var _notesOn = false;
  var _autoOn = false;
  var _autoTimer = null;
  var _autoSeg = 0;
  var _autoStart = 0;           /* timestamp do segmento atual */
  var _autoRAF = null;          /* requestAnimationFrame da barra de progresso */
  var _timerInterval = null;
  var _showStartTime = 0;

  /* Seletores DOM revelados pelo Destaque (granularidade item-a-item) */
  var _DEST_SELECTORS = [
    '.eap-blk-callout',
    '.eap-blk-pillar',
    '.eap-blk-chev-lbl',
    '.eap-blk-htime-node',
    '.eap-blk-curved-node',
    '.eap-blk-pcol',
    '.eap-blk-tags .tag',
    '.eap-blk-bigstat',
    '.eap-blk-herobg',
    '.eap-blk-half',
    '.eap-cta-wrap',
    '.eap-img-wrap',
    '.eap-video-wrap'
  ];

  /* ── Helpers ────────────────────────────────────────────────────── */
  function _esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _slug(s){
    return String(s||'').toLowerCase()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)
      || ('apr-' + Date.now().toString(36).slice(-5));
  }
  function _toast(msg, cor){
    if(typeof window._showToast === 'function') window._showToast(msg, cor || 'var(--accent)');
  }
  function _uid(prefix){
    return (prefix || 'x_') + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  }

  /* ═══════════════════════════════════════════════════════════════
     FASE 5a · GALERIA DE TEMPLATES (40 layouts pré-prontos)
     ═══════════════════════════════════════════════════════════════ */
  var _CATEGORIAS = [
    { id: 'todos',     nome: 'Todos',         emoji: '✨' },
    { id: 'abertura',  nome: 'Abertura',      emoji: '🎬' },
    { id: 'sobre',     nome: 'Apresentação',  emoji: '👤' },
    { id: 'conteudo',  nome: 'Conteúdo',      emoji: '📋' },
    { id: 'dados',     nome: 'Dados',         emoji: '📊' },
    { id: 'processo',  nome: 'Processo',      emoji: '⚙' },
    { id: 'midia',     nome: 'Mídia',         emoji: '🎥' },
    { id: 'fechamento',nome: 'Fechamento',    emoji: '🏁' },
    { id: 'especiais', nome: 'Especiais',     emoji: '⭐' }
  ];

  /* Cada template tem id, nome, categoria, emoji e função fab() que retorna blocos */
  var _TEMPLATES = [
    /* ───── ABERTURA (5) ───── */
    { id:'cap-hero',  nome:'Capa Hero', categoria:'abertura', emoji:'🎬', blocos:[
      { tipo:'hero-photo', titulo:'Título principal', subtitulo:'Subtítulo evocativo', badge:'APRESENTAÇÃO', imagem:'' }
    ]},
    { id:'cap-tag',   nome:'Capa com Tag', categoria:'abertura', emoji:'🏷', blocos:[
      { tipo:'tag', tags:['EQUIPE','CATEGORIA'] },
      { tipo:'heading', texto:'Título marcante', nivel:1 },
      { tipo:'texto', texto:'Texto introdutório curto sobre o tema desta apresentação.' }
    ]},
    { id:'cap-min',   nome:'Capa Minimal', categoria:'abertura', emoji:'⚪', blocos:[
      { tipo:'heading', texto:'Uma ideia\npoderosa', nivel:1 },
      { tipo:'mega-cta', texto:'em três atos' }
    ]},
    { id:'cap-half',  nome:'Capa Half-Photo', categoria:'abertura', emoji:'🖼', blocos:[
      { tipo:'half-photo', lado:'right', titulo:'Bem-vindo', texto:'Uma jornada sobre transformação, propósito e resultados que mudam o jogo.', imagem:'' }
    ]},
    { id:'cap-inst',  nome:'Capa Institucional', categoria:'abertura', emoji:'🏛', blocos:[
      { tipo:'tag', tags:['INSTITUCIONAL'] },
      { tipo:'hero-photo', titulo:'Nossa empresa', subtitulo:'O que fazemos. Por que importa.', badge:'2026', imagem:'' }
    ]},

    /* ───── APRESENTAÇÃO / SOBRE (5) ───── */
    { id:'sob-pesso', nome:'Sobre · Texto + Foto', categoria:'sobre', emoji:'👤', blocos:[
      { tipo:'heading', texto:'Sobre nós', nivel:1 },
      { tipo:'half-photo', lado:'left', titulo:'Nossa essência', texto:'Somos um time movido por propósito, dedicado a entregar excelência em cada detalhe.', imagem:'' }
    ]},
    { id:'sob-pilar', nome:'Quem somos · 3 Pilares', categoria:'sobre', emoji:'🏛', blocos:[
      { tipo:'heading', texto:'Quem somos', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'Propósito', descricao:'Movidos pela transformação.' },
        { titulo:'Excelência', descricao:'Padrão alto em tudo.' },
        { titulo:'Resultado', descricao:'Foco no que entrega.' }
      ]}
    ]},
    { id:'sob-miss',  nome:'Missão · Callout', categoria:'sobre', emoji:'🎯', blocos:[
      { tipo:'heading', texto:'Nossa missão', nivel:2 },
      { tipo:'callout', titulo:'Transformar realidades através de conhecimento aplicado', descricao:'É essa convicção que move tudo o que fazemos — do primeiro contato à entrega final.' }
    ]},
    { id:'sob-time',  nome:'Linha do Tempo', categoria:'sobre', emoji:'⏳', blocos:[
      { tipo:'heading', texto:'Nossa trajetória', nivel:1 },
      { tipo:'timeline-h', items:[
        { titulo:'2018', descricao:'Fundação' },
        { titulo:'2020', descricao:'Primeiros 1.000 clientes' },
        { titulo:'2023', descricao:'Expansão nacional' },
        { titulo:'2026', descricao:'Reinvenção' }
      ]}
    ]},
    { id:'sob-team',  nome:'Time · 3 Fotos', categoria:'sobre', emoji:'👥', blocos:[
      { tipo:'heading', texto:'Nosso time', nivel:1 },
      { tipo:'photo-grid', items:[
        { titulo:'Nome do líder', descricao:'CEO & Fundador', imagem:'' },
        { titulo:'Nome do líder', descricao:'COO', imagem:'' },
        { titulo:'Nome do líder', descricao:'Head Comercial', imagem:'' }
      ]}
    ]},

    /* ───── CONTEÚDO (5) ───── */
    { id:'con-pil3',  nome:'3 Pilares', categoria:'conteudo', emoji:'📋', blocos:[
      { tipo:'heading', texto:'Os três pilares', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'Primeiro pilar', descricao:'Explicação do pilar.' },
        { titulo:'Segundo pilar', descricao:'Explicação do pilar.' },
        { titulo:'Terceiro pilar', descricao:'Explicação do pilar.' }
      ]}
    ]},
    { id:'con-pil4',  nome:'4 Pilares', categoria:'conteudo', emoji:'📊', blocos:[
      { tipo:'heading', texto:'Os quatro fundamentos', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'Fundamento 1', descricao:'Descrição.' },
        { titulo:'Fundamento 2', descricao:'Descrição.' },
        { titulo:'Fundamento 3', descricao:'Descrição.' },
        { titulo:'Fundamento 4', descricao:'Descrição.' }
      ]}
    ]},
    { id:'con-chev3', nome:'Chevron 3 etapas', categoria:'conteudo', emoji:'▶', blocos:[
      { tipo:'heading', texto:'Como funciona', nivel:2 },
      { tipo:'chevron', items:[
        { titulo:'Etapa 1', descricao:'Descrição' },
        { titulo:'Etapa 2', descricao:'Descrição' },
        { titulo:'Etapa 3', descricao:'Descrição' }
      ]}
    ]},
    { id:'con-chev4', nome:'Chevron 4 etapas', categoria:'conteudo', emoji:'▶', blocos:[
      { tipo:'heading', texto:'Quatro passos', nivel:2 },
      { tipo:'chevron', items:[
        { titulo:'Passo 1', descricao:'Descrição' },
        { titulo:'Passo 2', descricao:'Descrição' },
        { titulo:'Passo 3', descricao:'Descrição' },
        { titulo:'Passo 4', descricao:'Descrição' }
      ]}
    ]},
    { id:'con-bnf',   nome:'Lista de Benefícios', categoria:'conteudo', emoji:'✅', blocos:[
      { tipo:'heading', texto:'O que você ganha', nivel:1 },
      { tipo:'callout', titulo:'Benefício 1', descricao:'Descrição do benefício e por que importa.' },
      { tipo:'callout', titulo:'Benefício 2', descricao:'Descrição do benefício e por que importa.' },
      { tipo:'callout', titulo:'Benefício 3', descricao:'Descrição do benefício e por que importa.' }
    ]},

    /* ───── DADOS / NÚMEROS (5) ───── */
    { id:'dad-big',   nome:'Big Number', categoria:'dados', emoji:'💯', blocos:[
      { tipo:'big-stat', valor:'87%', label:'das pessoas concordam', descricao:'Base: 1.234 entrevistados em pesquisa Q1/2026.' }
    ]},
    { id:'dad-trio',  nome:'Trio de Stats', categoria:'dados', emoji:'📊', blocos:[
      { tipo:'heading', texto:'Em números', nivel:2 },
      { tipo:'big-stat', valor:'500+', label:'clientes atendidos' },
      { tipo:'big-stat', valor:'97%', label:'taxa de satisfação' },
      { tipo:'big-stat', valor:'10x', label:'retorno médio' }
    ]},
    { id:'dad-stat',  nome:'Stat + Descrição', categoria:'dados', emoji:'📈', blocos:[
      { tipo:'big-stat', valor:'10x', label:'crescimento', descricao:'Em apenas 18 meses.' },
      { tipo:'texto', texto:'A combinação de método e disciplina permitiu acelerar resultados sem comprometer qualidade.' }
    ]},
    { id:'dad-quote', nome:'Quote de Impacto', categoria:'dados', emoji:'💬', blocos:[
      { tipo:'mega-cta', texto:'"Uma frase que fica."' },
      { tipo:'texto', texto:'— Autor da frase' }
    ]},
    { id:'dad-comp',  nome:'Antes vs Depois', categoria:'dados', emoji:'⚖', blocos:[
      { tipo:'heading', texto:'Antes & Depois', nivel:2 },
      { tipo:'pillars', items:[
        { titulo:'ANTES', descricao:'Estado inicial · problemas que existiam.' },
        { titulo:'DEPOIS', descricao:'Novo estado · transformação alcançada.' }
      ]}
    ]},

    /* ───── PROCESSO (5) ───── */
    { id:'prc-time',  nome:'Timeline Horizontal', categoria:'processo', emoji:'━', blocos:[
      { tipo:'heading', texto:'Cronograma', nivel:2 },
      { tipo:'timeline-h', items:[
        { titulo:'Fase 1', descricao:'Diagnóstico' },
        { titulo:'Fase 2', descricao:'Implementação' },
        { titulo:'Fase 3', descricao:'Validação' },
        { titulo:'Fase 4', descricao:'Escala' }
      ]}
    ]},
    { id:'prc-curv',  nome:'Processo Curvo', categoria:'processo', emoji:'↣', blocos:[
      { tipo:'heading', texto:'A jornada', nivel:2 },
      { tipo:'process-curved', items:[
        { titulo:'Início', descricao:'Onde começamos.' },
        { titulo:'Imersão', descricao:'O ponto de virada.' },
        { titulo:'Aplicação', descricao:'Pondo em prática.' },
        { titulo:'Resultado', descricao:'O destino.' }
      ]}
    ]},
    { id:'prc-pass',  nome:'Passo a Passo', categoria:'processo', emoji:'📝', blocos:[
      { tipo:'heading', texto:'Como aplicar', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'Passo 1', descricao:'O que fazer primeiro.' },
        { titulo:'Passo 2', descricao:'O que fazer em seguida.' },
        { titulo:'Passo 3', descricao:'O que fazer no final.' }
      ]}
    ]},
    { id:'prc-rot',   nome:'Roteiro de Aula', categoria:'processo', emoji:'🎓', blocos:[
      { tipo:'tag', tags:['MÓDULO 1','60 MIN'] },
      { tipo:'heading', texto:'Roteiro da sessão', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'1. Abertura', descricao:'Quebra-gelo e contexto · 10 min.' },
        { titulo:'2. Desenvolvimento', descricao:'Núcleo do conteúdo · 35 min.' },
        { titulo:'3. Encerramento', descricao:'Síntese e próximos passos · 15 min.' }
      ]}
    ]},
    { id:'prc-met',   nome:'Metodologia', categoria:'processo', emoji:'⚙', blocos:[
      { tipo:'heading', texto:'Nossa metodologia', nivel:1 },
      { tipo:'process-curved', items:[
        { titulo:'Diagnóstico', descricao:'Onde você está.' },
        { titulo:'Planejamento', descricao:'Onde quer chegar.' },
        { titulo:'Execução', descricao:'Como vai chegar.' },
        { titulo:'Acompanhamento', descricao:'Garantindo o resultado.' }
      ]},
      { tipo:'callout', titulo:'É sistêmico, não fragmentado', descricao:'Cada fase prepara a próxima — nada é solto.' }
    ]},

    /* ───── MÍDIA (5) ───── */
    { id:'mid-img',   nome:'Imagem Destaque', categoria:'midia', emoji:'🖼', blocos:[
      { tipo:'heading', texto:'Título da seção', nivel:2 },
      { tipo:'imagem', url:'', alt:'Imagem ilustrativa' },
      { tipo:'texto', texto:'Texto descritivo abaixo da imagem para dar contexto.' }
    ]},
    { id:'mid-vid',   nome:'Vídeo', categoria:'midia', emoji:'▶', blocos:[
      { tipo:'heading', texto:'Assista', nivel:2 },
      { tipo:'video', url:'' },
      { tipo:'texto', texto:'Comentário sobre o vídeo ou contexto adicional.' }
    ]},
    { id:'mid-gal',   nome:'Galeria 3 Fotos', categoria:'midia', emoji:'⫼', blocos:[
      { tipo:'heading', texto:'Galeria', nivel:2 },
      { tipo:'photo-grid', items:[
        { titulo:'Foto 1', descricao:'Legenda da foto.', imagem:'' },
        { titulo:'Foto 2', descricao:'Legenda da foto.', imagem:'' },
        { titulo:'Foto 3', descricao:'Legenda da foto.', imagem:'' }
      ]}
    ]},
    { id:'mid-hl',    nome:'Foto Esquerda + Texto', categoria:'midia', emoji:'◧', blocos:[
      { tipo:'half-photo', lado:'left', titulo:'Título do bloco', texto:'Parágrafo explicativo posicionado à direita da imagem. Ideal pra dar contexto visual sem encher o slide.', imagem:'' }
    ]},
    { id:'mid-hr',    nome:'Foto Direita + Texto', categoria:'midia', emoji:'◨', blocos:[
      { tipo:'half-photo', lado:'right', titulo:'Título do bloco', texto:'Parágrafo explicativo posicionado à esquerda da imagem. Boa variante visual.', imagem:'' }
    ]},

    /* ───── FECHAMENTO (5) ───── */
    { id:'fim-con',   nome:'Conclusão', categoria:'fechamento', emoji:'🏁', blocos:[
      { tipo:'heading', texto:'Em resumo', nivel:1 },
      { tipo:'texto', texto:'Três ideias para levar com você desta apresentação:' },
      { tipo:'callout', titulo:'Insight final', descricao:'A frase que sintetiza tudo.' },
      { tipo:'cta', texto:'Saiba mais', href:'#' }
    ]},
    { id:'fim-prox',  nome:'Próximos Passos', categoria:'fechamento', emoji:'➡', blocos:[
      { tipo:'heading', texto:'Próximos passos', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'Agora', descricao:'O que fazer hoje.' },
        { titulo:'Esta semana', descricao:'O que organizar.' },
        { titulo:'Este mês', descricao:'O que decidir.' }
      ]},
      { tipo:'cta', texto:'Marcar próxima reunião', href:'#' }
    ]},
    { id:'fim-ctt',   nome:'Contato', categoria:'fechamento', emoji:'📞', blocos:[
      { tipo:'heading', texto:'Fale comigo', nivel:1 },
      { tipo:'texto', texto:'pablocorreia@febracis.com.br\n+55 91 99339-6040' },
      { tipo:'cta', texto:'Chamar no WhatsApp', href:'https://wa.me/5591933696040' }
    ]},
    { id:'fim-obg',   nome:'Obrigado', categoria:'fechamento', emoji:'🙏', blocos:[
      { tipo:'mega-cta', texto:'Obrigado' },
      { tipo:'texto', texto:'até a próxima.' }
    ]},
    { id:'fim-cta',   nome:'CTA Premium', categoria:'fechamento', emoji:'⭐', blocos:[
      { tipo:'hero-photo', titulo:'Vamos juntos?', subtitulo:'Próximo passo é o seu', badge:'COMEÇAR AGORA', imagem:'' },
      { tipo:'cta', texto:'Quero saber mais', href:'#' }
    ]},

    /* ───── ESPECIAIS (5) ───── */
    { id:'esp-faq',   nome:'FAQ · Perguntas', categoria:'especiais', emoji:'❓', blocos:[
      { tipo:'heading', texto:'Perguntas frequentes', nivel:1 },
      { tipo:'callout', titulo:'Pergunta 1', descricao:'Resposta detalhada à primeira dúvida comum.' },
      { tipo:'callout', titulo:'Pergunta 2', descricao:'Resposta detalhada à segunda dúvida comum.' },
      { tipo:'callout', titulo:'Pergunta 3', descricao:'Resposta detalhada à terceira dúvida comum.' }
    ]},
    { id:'esp-andp',  nome:'Antes / Depois', categoria:'especiais', emoji:'🔄', blocos:[
      { tipo:'heading', texto:'Antes & Depois', nivel:1 },
      { tipo:'chevron', items:[
        { titulo:'ANTES', descricao:'O cenário inicial.' },
        { titulo:'PROCESSO', descricao:'A transformação aplicada.' },
        { titulo:'DEPOIS', descricao:'O novo cenário.' }
      ]}
    ]},
    { id:'esp-dep',   nome:'Depoimento', categoria:'especiais', emoji:'💬', blocos:[
      { tipo:'tag', tags:['DEPOIMENTO'] },
      { tipo:'callout', titulo:'"Frase impactante do cliente sobre a transformação."', descricao:'Nome do cliente · Cargo · Empresa' },
      { tipo:'half-photo', lado:'left', titulo:'Resultado entregue', texto:'Detalhes do case e métricas alcançadas.', imagem:'' }
    ]},
    { id:'esp-pac',   nome:'3 Pacotes / Planos', categoria:'especiais', emoji:'📦', blocos:[
      { tipo:'heading', texto:'Escolha seu plano', nivel:1 },
      { tipo:'pillars', items:[
        { titulo:'BÁSICO', descricao:'R$ X · descrição do plano.' },
        { titulo:'PROFISSIONAL', descricao:'R$ Y · descrição do plano.' },
        { titulo:'PREMIUM', descricao:'R$ Z · descrição do plano.' }
      ]},
      { tipo:'cta', texto:'Quero saber mais', href:'#' }
    ]},
    { id:'esp-gar',   nome:'Garantia', categoria:'especiais', emoji:'🛡', blocos:[
      { tipo:'hero-photo', titulo:'Garantia incondicional', subtitulo:'30 dias para testar sem risco', badge:'GARANTIA', imagem:'' },
      { tipo:'callout', titulo:'Como funciona', descricao:'Se em até 30 dias você sentir que não é pra você, devolvemos 100% do investimento — sem perguntas.' }
    ]}
  ];

  /* Filtros do modal */
  var _galCatAtual = 'todos';
  var _galBusca = '';

  /* ── Embed YouTube/Vimeo ────────────────────────────────────────── */
  function _embedUrl(url){
    if(!url) return '';
    /* YouTube */
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if(ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1];
    /* Vimeo */
    var vmMatch = url.match(/vimeo\.com\/(\d+)/);
    if(vmMatch) return 'https://player.vimeo.com/video/' + vmMatch[1];
    return url;
  }

  /* ── CSS injetado uma vez ───────────────────────────────────────── */
  function _injectCss(){
    if(document.getElementById('eapCss')) return;
    var css = ''
      /* Tela host segue padrão das outras (#loginScreen etc) */
      + '#editorApresentacaoScreen{position:fixed;top:0;left:0;width:100%;height:100%;overflow:hidden;z-index:1;background:#0a0e1a;}'
      /* App layout */
      + '.eap-app{display:flex;flex-direction:column;height:100vh;font-family:"DM Sans","Inter",sans-serif;color:var(--text,#e6edf3);}'
      /* Toolbar superior */
      + '.eap-tbar{background:var(--bg-2,#0d1117);border-bottom:1px solid var(--border,rgba(255,255,255,.08));padding:10px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;}'
      + '.eap-back{background:transparent;border:1px solid var(--border,rgba(255,255,255,.08));color:var(--muted,#9aa5b1);font-size:12px;font-weight:600;padding:7px 12px;border-radius:7px;cursor:pointer;font-family:inherit;}'
      + '.eap-back:hover{color:var(--text,#e6edf3);border-color:var(--border2,rgba(255,255,255,.14));}'
      + '.eap-tit{background:transparent;border:none;color:var(--text,#e6edf3);font-size:14px;font-weight:700;font-family:inherit;padding:4px 8px;border-radius:5px;flex:0 1 320px;}'
      + '.eap-tit:hover,.eap-tit:focus{background:var(--bg-3,#1c2128);outline:none;}'
      + '.eap-sav{font-size:10px;color:var(--green,#34d399);font-weight:600;padding:4px 10px;background:rgba(52,211,153,.08);border-radius:100px;border:1px solid rgba(52,211,153,.2);}'
      + '.eap-sav.salvando{color:var(--amber,#fbbf24);background:rgba(245,158,11,.08);border-color:rgba(245,158,11,.2);}'
      + '.eap-spacer{flex:1;}'
      + '.eap-btn{background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));color:var(--text,#e6edf3);padding:7px 14px;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;}'
      + '.eap-btn:hover{border-color:var(--border2,rgba(255,255,255,.14));}'
      + '.eap-btn-pri{background:var(--accent,#c8f05a);border:none;color:var(--bg,#0a0e1a);padding:8px 16px;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;}'
      + '.eap-btn-pri:hover{box-shadow:0 4px 14px rgba(200,240,90,.3);transform:translateY(-1px);}'
      /* Body 3 colunas */
      + '.eap-body{flex:1;display:grid;grid-template-columns:200px 1fr 240px;overflow:hidden;min-height:0;}'
      /* Sidebar esquerda · thumbnails dos cards */
      + '.eap-side{background:var(--bg-2,#0d1117);border-right:1px solid var(--border,rgba(255,255,255,.08));padding:14px 10px;overflow-y:auto;}'
      + '.eap-side h4{font-size:10px;font-weight:800;color:var(--muted,#9aa5b1);text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;display:flex;justify-content:space-between;align-items:center;padding:0 4px;}'
      + '.eap-side h4 .n{background:var(--accent,#c8f05a);color:var(--bg,#0a0e1a);padding:1px 7px;border-radius:4px;font-size:10px;}'
      + '.eap-thumb{background:var(--bg-3,#1c2128);border:2px solid transparent;border-radius:8px;padding:8px;margin-bottom:8px;cursor:pointer;transition:all .15s;position:relative;}'
      + '.eap-thumb:hover{background:#22272e;}'
      + '.eap-thumb.curr{border-color:var(--accent,#c8f05a);}'
      + '.eap-thumb-n{font-size:9px;color:var(--muted,#9aa5b1);font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;}'
      + '.eap-thumb-n .del{color:var(--muted,#9aa5b1);cursor:pointer;}'
      + '.eap-thumb-n .del:hover{color:var(--red,#ef4444);}'
      + '.eap-thumb-mini{aspect-ratio:16/9;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:4px;padding:6px;color:#fff;font-size:8px;display:flex;flex-direction:column;gap:2px;overflow:hidden;}'
      + '.eap-thumb-mini-t{font-weight:700;font-size:9px;line-height:1.2;color:var(--accent,#c8f05a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '.eap-add-card{width:100%;padding:14px;background:transparent;border:1.5px dashed var(--border2,rgba(255,255,255,.14));border-radius:8px;color:var(--muted,#9aa5b1);font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:8px;transition:all .15s;}'
      + '.eap-add-card:hover{color:var(--accent,#c8f05a);border-color:var(--accent,#c8f05a);}'
      + '.eap-add-card.eap-add-template{background:linear-gradient(135deg,rgba(212,175,55,.08),rgba(200,240,90,.08));border-color:rgba(212,175,55,.4);color:#d4af37;}'
      + '.eap-add-card.eap-add-template:hover{background:linear-gradient(135deg,rgba(212,175,55,.18),rgba(200,240,90,.18));border-color:#d4af37;color:#f0c896;}'
      /* Galeria de templates · modal full-screen */
      + '.eap-galeria{position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(14px);z-index:9999;display:none;flex-direction:column;}'
      + '.eap-galeria.show{display:flex;}'
      + '.eap-gal-top{display:flex;align-items:center;gap:14px;padding:18px 24px;border-bottom:1px solid rgba(255,255,255,.08);}'
      + '.eap-gal-top h3{margin:0;font-family:"Playfair Display",serif;font-size:22px;color:#d4af37;flex:1;}'
      + '.eap-gal-top input{flex:0 0 280px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;outline:none;font-family:inherit;}'
      + '.eap-gal-top input:focus{border-color:#d4af37;}'
      + '.eap-gal-top button{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;}'
      + '.eap-gal-top button:hover{background:rgba(255,255,255,.1);}'
      + '.eap-gal-tabs{display:flex;gap:6px;padding:14px 24px 0;border-bottom:1px solid rgba(255,255,255,.06);overflow-x:auto;}'
      + '.eap-gal-tab{padding:8px 16px;background:transparent;border:none;color:rgba(255,255,255,.6);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;white-space:nowrap;text-transform:uppercase;letter-spacing:.06em;transition:all .15s;}'
      + '.eap-gal-tab:hover{color:rgba(255,255,255,.9);}'
      + '.eap-gal-tab.on{color:#d4af37;border-bottom-color:#d4af37;}'
      + '.eap-gal-grid{flex:1;padding:24px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;align-content:start;}'
      + '.eap-tpl-card{background:linear-gradient(180deg,#1a1a2e,#16213e);border:1px solid rgba(255,255,255,.08);border-radius:10px;overflow:hidden;cursor:pointer;transition:all .18s;display:flex;flex-direction:column;}'
      + '.eap-tpl-card:hover{transform:translateY(-3px);border-color:#d4af37;box-shadow:0 10px 30px rgba(212,175,55,.25);}'
      + '.eap-tpl-thumb{aspect-ratio:16/9;padding:10px;font-size:8px;color:#fff;display:flex;flex-direction:column;gap:3px;background:#0a0e1a;border-bottom:1px solid rgba(255,255,255,.06);overflow:hidden;line-height:1.2;}'
      + '.eap-tpl-thumb .tt{font-family:"Playfair Display",serif;font-size:11px;color:#d4af37;font-weight:700;}'
      + '.eap-tpl-thumb .tx{font-size:7px;color:rgba(255,255,255,.7);}'
      + '.eap-tpl-thumb .tg{font-size:6px;color:#d4af37;background:rgba(212,175,55,.18);padding:1px 6px;border-radius:3px;display:inline-block;width:fit-content;letter-spacing:.1em;}'
      + '.eap-tpl-thumb .ic{font-size:18px;text-align:center;color:rgba(212,175,55,.5);}'
      + '.eap-tpl-meta{padding:10px 12px;}'
      + '.eap-tpl-meta .nm{font-size:12px;font-weight:700;color:#e6edf3;margin-bottom:2px;display:flex;align-items:center;gap:6px;}'
      + '.eap-tpl-meta .cat{font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;}'
      + '.eap-gal-empty{grid-column:1/-1;text-align:center;padding:60px 20px;color:rgba(255,255,255,.4);font-size:13px;}'
      /* Modal de export · Fase 5/Opção A */
      + '.eap-export{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(10px);z-index:9998;display:none;align-items:center;justify-content:center;padding:20px;}'
      + '.eap-export.show{display:flex;}'
      + '.eap-export-box{background:#0d1117;border:1px solid rgba(255,255,255,.12);border-radius:14px;width:100%;max-width:520px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;}'
      + '.eap-export-h{display:flex;align-items:center;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.08);}'
      + '.eap-export-h h3{margin:0;font-family:"Playfair Display",serif;font-size:18px;color:#d4af37;flex:1;}'
      + '.eap-export-x{background:transparent;border:none;color:rgba(255,255,255,.5);font-size:18px;cursor:pointer;padding:4px 10px;border-radius:6px;}'
      + '.eap-export-x:hover{background:rgba(255,255,255,.06);color:#fff;}'
      + '.eap-export-b{padding:22px;display:flex;flex-direction:column;gap:16px;}'
      + '.eap-export-b .eap-fld label{display:block;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}'
      + '.eap-export-b .eap-fld input,.eap-export-b .eap-fld select{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);color:#fff;padding:10px 12px;border-radius:8px;font-size:13px;outline:none;font-family:inherit;}'
      + '.eap-export-b .eap-fld input:focus,.eap-export-b .eap-fld select:focus{border-color:#d4af37;}'
      + '.eap-export-f{display:flex;gap:10px;justify-content:flex-end;padding:18px 22px;border-top:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.3);}'
      /* Canvas central */
      + '.eap-canvas{background:#0a0e1a;padding:30px;overflow-y:auto;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.04) 1px,transparent 0);background-size:24px 24px;}'
      + '.eap-card{max-width:880px;margin:0 auto;background:linear-gradient(180deg,#1a1a2e,#16213e);border-radius:14px;padding:50px 60px;box-shadow:0 18px 60px rgba(0,0,0,.4);color:#fff;min-height:500px;position:relative;}'
      + '.eap-card.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:rgba(255,255,255,.5);}'
      + '.eap-card.empty .ic{font-size:48px;opacity:.4;margin-bottom:14px;}'
      /* Blocos */
      + '.eap-blk{position:relative;padding:12px;border-radius:8px;border:1.5px solid transparent;transition:all .15s;margin-bottom:14px;}'
      + '.eap-blk:hover{border-color:rgba(200,240,90,.3);}'
      + '.eap-blk.sel{border-color:var(--accent,#c8f05a);background:rgba(200,240,90,.04);}'
      + '.eap-blk-ctrl{position:absolute;top:-12px;right:8px;display:none;gap:2px;background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:6px;padding:2px;box-shadow:0 4px 12px rgba(0,0,0,.4);z-index:2;}'
      + '.eap-blk:hover .eap-blk-ctrl,.eap-blk.sel .eap-blk-ctrl{display:flex;}'
      + '.eap-blk-ctrl button{background:none;border:none;color:var(--muted,#9aa5b1);width:24px;height:24px;cursor:pointer;border-radius:4px;font-size:11px;font-family:inherit;padding:0;display:flex;align-items:center;justify-content:center;}'
      + '.eap-blk-ctrl button:hover{background:var(--bg-2,#0d1117);color:#fff;}'
      + '.eap-blk-ctrl button.del:hover{color:var(--red,#ef4444);}'
      /* Tipos de blocos · estilos no canvas */
      + '.eap-blk-input{background:transparent;border:none;color:#fff;width:100%;font-family:inherit;padding:0;outline:none;resize:none;}'
      + '.eap-blk-input::placeholder{color:rgba(255,255,255,.3);}'
      + '.eap-h1-input{font-family:"Playfair Display",serif;font-size:48px;font-weight:700;line-height:1.05;color:var(--accent,#c8f05a);}'
      + '.eap-h2-input{font-family:"Playfair Display",serif;font-size:28px;font-weight:400;color:#f0c896;line-height:1.2;}'
      + '.eap-p-input{font-size:16px;line-height:1.7;color:rgba(255,255,255,.85);}'
      + '.eap-video-wrap{aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;position:relative;}'
      + '.eap-video-wrap iframe{width:100%;height:100%;border:0;display:block;}'
      + '.eap-video-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,.4);gap:8px;}'
      + '.eap-img-wrap{border-radius:8px;overflow:hidden;background:#000;}'
      + '.eap-img-wrap img{width:100%;display:block;}'
      + '.eap-img-empty{aspect-ratio:16/9;display:flex;flex-direction:column;align-items:center;justify-content:center;color:rgba(255,255,255,.4);gap:8px;border:1.5px dashed rgba(255,255,255,.15);border-radius:8px;}'
      + '.eap-cta-wrap{text-align:center;padding:16px 0;}'
      + '.eap-cta-btn{background:linear-gradient(135deg,var(--accent,#c8f05a),#f0c896);color:var(--bg,#0a0e1a);border:none;padding:14px 30px;border-radius:10px;font-size:14px;font-weight:800;font-family:inherit;cursor:pointer;}'
      /* Adicionar bloco */
      + '.eap-add-blk{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;padding:18px;border:1.5px dashed rgba(255,255,255,.12);border-radius:10px;margin-top:8px;}'
      + '.eap-add-blk button{background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));color:var(--text,#e6edf3);padding:8px 14px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;}'
      + '.eap-add-blk button:hover{color:var(--accent,#c8f05a);border-color:var(--accent,#c8f05a);}'
      /* Painel direito · propriedades */
      + '.eap-right{background:var(--bg-2,#0d1117);border-left:1px solid var(--border,rgba(255,255,255,.08));padding:16px;overflow-y:auto;}'
      + '.eap-right h4{font-size:10px;font-weight:800;color:var(--muted,#9aa5b1);text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;padding-bottom:8px;border-bottom:1px dashed var(--border,rgba(255,255,255,.08));}'
      + '.eap-fld{margin-bottom:12px;}'
      + '.eap-fld label{display:block;font-size:10px;font-weight:700;color:var(--muted,#9aa5b1);margin-bottom:5px;}'
      + '.eap-fld input,.eap-fld select,.eap-fld textarea{width:100%;background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));color:var(--text,#e6edf3);padding:7px 9px;border-radius:6px;font-size:11px;font-family:inherit;}'
      + '.eap-fld textarea{resize:vertical;min-height:60px;}'
      + '.eap-right-empty{color:var(--muted,#9aa5b1);font-size:12px;text-align:center;padding:30px 12px;line-height:1.6;}'
      + '.eap-right-empty .ic{font-size:32px;opacity:.4;margin-bottom:10px;}'

      /* ═══════════════════════════════════════════════════════════════
         MODO APRESENTAR · overlay fullscreen
         ═══════════════════════════════════════════════════════════════ */
      + '.eap-show{position:fixed;inset:0;z-index:300;background:radial-gradient(ellipse 80% 60% at 50% 50%,rgba(40,30,60,.4) 0%,transparent 70%),radial-gradient(ellipse at top,#0f0f1a 0%,#000 60%);display:none;flex-direction:column;}'
      + '.eap-show.active{display:flex;}'
      + '.eap-show-stage{flex:1;position:relative;display:flex;align-items:center;justify-content:center;padding:60px 80px 100px;perspective:1800px;}'
      + '.eap-show-slide{position:absolute;width:min(1100px,92vw);max-height:calc(100vh - 200px);overflow:hidden;opacity:0;transform:scale(.92) translateX(40px);transition:opacity .45s cubic-bezier(.16,1,.3,1),transform .45s cubic-bezier(.16,1,.3,1),filter .45s cubic-bezier(.16,1,.3,1);pointer-events:none;filter:blur(10px) brightness(.6);}'
      + '.eap-show-slide.curr{opacity:1;transform:scale(1) translateX(0);pointer-events:auto;filter:none;}'
      + '.eap-show-slide.prev-exit{transform:scale(.92) translateX(-40px);}'
      + '.eap-show-slide .eap-card{box-shadow:0 50px 100px rgba(0,0,0,.8),0 0 80px rgba(200,240,90,.08),0 0 0 1px rgba(255,255,255,.06) inset;}'
      + '.eap-show-slide .eap-blk-ctrl,.eap-show-slide .eap-add-blk{display:none !important;}'
      + '.eap-show-slide .eap-blk{padding:0;border:none;background:transparent;}'
      /* Barra superior */
      + '.eap-show-top{position:absolute;top:0;left:0;right:0;padding:14px 22px;display:flex;align-items:center;gap:12px;background:linear-gradient(180deg,rgba(0,0,0,.7),transparent);z-index:5;opacity:.3;transition:opacity .25s;}'
      + '.eap-show:hover .eap-show-top{opacity:1;}'
      + '.eap-show-t{flex:1;font-size:12px;color:rgba(255,255,255,.7);}'
      + '.eap-show-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;padding:7px 12px;border-radius:7px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600;}'
      + '.eap-show-btn:hover{background:rgba(255,255,255,.16);}'
      /* Setas laterais */
      + '.eap-show-arrow{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#fff;font-size:18px;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s,background .15s;z-index:4;}'
      + '.eap-show:hover .eap-show-arrow{opacity:.6;}'
      + '.eap-show-arrow:hover{opacity:1 !important;background:rgba(255,255,255,.15);}'
      + '.eap-show-arrow.left{left:24px;}'
      + '.eap-show-arrow.right{right:24px;}'
      + '.eap-show-arrow:disabled{opacity:.15 !important;cursor:not-allowed;}'
      /* Barra inferior */
      + '.eap-show-nav{position:absolute;bottom:0;left:0;right:0;padding:16px 22px;display:flex;align-items:center;gap:14px;background:linear-gradient(0deg,rgba(0,0,0,.6),transparent);z-index:5;opacity:.3;transition:opacity .25s;}'
      + '.eap-show:hover .eap-show-nav{opacity:1;}'
      + '.eap-show-dots{flex:1;display:flex;gap:6px;justify-content:center;}'
      + '.eap-show-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25);cursor:pointer;transition:all .15s;}'
      + '.eap-show-dot.curr{background:var(--accent,#c8f05a);width:24px;border-radius:4px;}'
      + '.eap-show-counter{font-family:"DM Mono",monospace;color:rgba(255,255,255,.7);font-size:12px;padding:5px 12px;background:rgba(255,255,255,.06);border-radius:100px;}'

      /* ═══════════════════════════════════════════════════════════════
         FASE 4 · Ferramentas Apresentar
         ═══════════════════════════════════════════════════════════════ */
      /* Timer */
      + '.eap-show-timer{background:rgba(0,0,0,.5);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);color:#fff;padding:6px 12px;border-radius:100px;font-family:"DM Mono",monospace;font-size:11px;display:flex;align-items:center;gap:6px;}'
      + '.eap-show-timer .dot{width:6px;height:6px;border-radius:50%;background:var(--green,#34d399);animation:eapPulse 2s ease-in-out infinite;}'
      + '@keyframes eapPulse{0%,100%{opacity:1;}50%{opacity:.4;}}'

      /* Destaque · revelação progressiva */
      + '.eap-show-slide.dest-active .dest-hidden{opacity:.18;filter:blur(1.5px) saturate(.3);transition:opacity .35s ease,filter .35s ease;}'
      + '.eap-show-slide.dest-active .dest-revealed{opacity:1;filter:none;transition:opacity .4s ease,filter .4s ease;}'
      + '.eap-dest-counter{position:absolute;bottom:80px;right:30px;background:rgba(0,0,0,.7);backdrop-filter:blur(8px);color:#fff;font-family:"DM Mono",monospace;font-size:12px;padding:7px 14px;border-radius:100px;border:1px solid rgba(200,240,90,.35);z-index:6;display:none;}'
      + '.eap-dest-counter.show{display:block;}'
      + '.eap-dest-counter b{color:var(--accent,#c8f05a);font-weight:800;}'
      + '.eap-dest-counter small{color:rgba(255,255,255,.5);margin-left:8px;}'

      /* Blackout / Whiteout */
      + '.eap-show-color-ov{position:absolute;inset:0;z-index:7;display:none;}'
      + '.eap-show-color-ov.black{background:#000;display:block;}'
      + '.eap-show-color-ov.white{background:#fff;display:block;}'

      /* Caneta · canvas + toolbar */
      + '.eap-show-draw{position:absolute;inset:0;z-index:8;pointer-events:none;cursor:crosshair;}'
      + '.eap-show-draw.active{pointer-events:auto;}'
      + '.eap-draw-tools{position:absolute;top:80px;left:50%;transform:translateX(-50%);display:none;background:rgba(0,0,0,.85);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:10px 12px;box-shadow:0 18px 50px rgba(0,0,0,.6);z-index:11;gap:8px;align-items:center;}'
      + '.eap-draw-tools.show{display:flex;}'
      + '.eap-draw-grp{display:flex;gap:3px;padding:2px;background:rgba(255,255,255,.05);border-radius:8px;}'
      + '.eap-draw-sep{width:1px;height:26px;background:rgba(255,255,255,.12);}'
      + '.eap-draw-btn{background:transparent;border:none;color:rgba(255,255,255,.7);width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;cursor:pointer;font-size:15px;font-family:inherit;}'
      + '.eap-draw-btn:hover{background:rgba(255,255,255,.08);color:#fff;}'
      + '.eap-draw-btn.on{background:rgba(200,240,90,.18);color:var(--accent,#c8f05a);}'
      + '.eap-draw-color{width:22px;height:22px;border-radius:50%;cursor:pointer;flex-shrink:0;border:2px solid transparent;transition:transform .12s,border-color .12s;box-shadow:0 0 0 1px rgba(255,255,255,.15);}'
      + '.eap-draw-color:hover{transform:scale(1.1);}'
      + '.eap-draw-color.on{border-color:#fff;transform:scale(1.15);}'
      + '.eap-draw-thick{width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:6px;}'
      + '.eap-draw-thick:hover{background:rgba(255,255,255,.08);}'
      + '.eap-draw-thick.on{background:rgba(200,240,90,.18);}'
      + '.eap-draw-thick-dot{background:var(--accent,#c8f05a);border-radius:50%;}'
      + '.eap-draw-thick.t1 .eap-draw-thick-dot{width:5px;height:5px;}'
      + '.eap-draw-thick.t2 .eap-draw-thick-dot{width:9px;height:9px;}'
      + '.eap-draw-thick.t3 .eap-draw-thick-dot{width:13px;height:13px;}'
      + '.eap-draw-thick.t4 .eap-draw-thick-dot{width:17px;height:17px;}'

      /* Overview · grade de slides */
      + '.eap-show-overview{position:absolute;inset:60px 40px 100px;overflow-y:auto;display:none;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;padding:10px;z-index:9;}'
      + '.eap-show-overview.show{display:grid;}'
      + '.eap-ov-thumb{aspect-ratio:16/9;border:2px solid transparent;border-radius:10px;cursor:pointer;overflow:hidden;background:#1a1a2e;position:relative;transition:all .15s;}'
      + '.eap-ov-thumb:hover{transform:scale(1.04);border-color:rgba(200,240,90,.4);}'
      + '.eap-ov-thumb.curr{border-color:var(--accent,#c8f05a);}'
      + '.eap-ov-thumb-n{position:absolute;top:8px;left:8px;font-size:10px;font-weight:700;color:rgba(255,255,255,.6);background:rgba(0,0,0,.5);padding:2px 8px;border-radius:100px;z-index:2;}'
      + '.eap-ov-thumb-c{position:absolute;inset:0;transform:scale(.28);transform-origin:top left;width:357%;height:357%;pointer-events:none;}'

      /* Speaker notes */
      + '.eap-show-notes{position:absolute;bottom:80px;right:24px;width:340px;max-height:240px;background:rgba(0,0,0,.85);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:14px;display:none;z-index:6;}'
      + '.eap-show-notes.show{display:block;}'
      + '.eap-notes-h{font-size:10px;color:var(--accent,#c8f05a);font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}'
      + '.eap-notes-h button{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:14px;padding:0;}'
      + '.eap-notes-b{font-size:13px;color:rgba(255,255,255,.85);line-height:1.6;overflow-y:auto;max-height:160px;white-space:pre-wrap;}'
      + '.eap-notes-empty{color:rgba(255,255,255,.4);font-style:italic;}'

      /* Auto-advance progress bar */
      + '.eap-show-progress{position:absolute;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.1);z-index:8;display:none;}'
      + '.eap-show-progress.show{display:block;}'
      + '.eap-show-progress-bar{height:100%;background:linear-gradient(90deg,var(--accent,#c8f05a),#f0c896);width:0%;}'

      /* Notas no painel direito do editor */
      + '.eap-card-notes{background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:8px;padding:14px;margin-top:8px;}'
      + '.eap-card-notes label{display:block;font-size:10px;font-weight:700;color:var(--muted,#9aa5b1);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;}'
      + '.eap-card-notes textarea{width:100%;background:var(--bg-2,#0d1117);border:1px solid var(--border,rgba(255,255,255,.08));color:var(--text,#e6edf3);padding:8px 10px;border-radius:6px;font-size:11px;font-family:inherit;resize:vertical;min-height:80px;}'

      /* ═══════════════════════════════════════════════════════════════
         FASE 2 · BLOCOS PREMIUM (estilo Black & Gold)
         ═══════════════════════════════════════════════════════════════ */
      /* Tema Black & Gold (alternativo ao Black Tie) */
      + '.eap-card[data-tema="black-gold"]{background:#0a0a0a;color:#fff;}'
      + '.eap-card[data-tema="black-gold"] .eap-h1-input{color:#d4af37;}'
      + '.eap-card[data-tema="black-gold"] .eap-h2-input{color:#d4af37;font-style:italic;}'
      + '.eap-show-slide .eap-card[data-tema="black-gold"]{background:#0a0a0a;}'

      /* Tag pill (1) */
      + '.eap-blk-tags{display:flex;gap:6px;flex-wrap:wrap;padding:6px 0;}'
      + '.eap-blk-tags .tag{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:4px 12px;border-radius:4px;background:rgba(212,175,55,.18);color:#d4af37;border:1px solid rgba(212,175,55,.4);}'

      /* Callout gold (2) */
      + '.eap-blk-callout{background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.06);border-left:4px solid #d4af37;border-radius:4px;padding:16px 20px;}'
      + '.eap-blk-callout .ct{font-family:"Playfair Display",serif;font-size:18px;font-style:italic;color:#d4af37;background:transparent;border:none;width:100%;outline:none;font-family:"Playfair Display",serif;margin-bottom:6px;padding:0;}'
      + '.eap-blk-callout .cd{font-size:14px;color:rgba(255,255,255,.85);background:transparent;border:none;width:100%;outline:none;font-family:inherit;resize:none;}'

      /* Pillars list (3) */
      + '.eap-blk-pillars{display:flex;flex-direction:column;}'
      + '.eap-blk-pillar{padding:12px 0 14px;}'
      + '.eap-blk-pillar .pn{font-family:"Playfair Display",serif;font-size:14px;color:rgba(255,255,255,.6);margin-bottom:4px;}'
      + '.eap-blk-pillar .pl{height:1px;background:linear-gradient(90deg,#d4af37,transparent);margin-bottom:8px;}'
      + '.eap-blk-pillar .pt{font-family:"Playfair Display",serif;font-size:20px;color:#d4af37;background:transparent;border:none;width:100%;outline:none;font-family:"Playfair Display",serif;}'
      + '.eap-blk-pillar .pd{font-size:13px;color:rgba(255,255,255,.7);background:transparent;border:none;width:100%;outline:none;font-family:inherit;resize:none;margin-top:2px;}'

      /* Chevron (4) */
      + '.eap-blk-chevs{display:flex;gap:4px;margin:14px 0 10px;}'
      + '.eap-blk-chev{flex:1;padding:18px 30px;background:#d4af37;color:#0a0e1a;text-align:center;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 50%,calc(100% - 18px) 100%,0 100%,18px 50%);}'
      + '.eap-blk-chev:first-child{clip-path:polygon(0 0,calc(100% - 18px) 0,100% 50%,calc(100% - 18px) 100%,0 100%);padding-left:24px;}'
      + '.eap-blk-chev.silver{background:#b9b9b9;}'
      + '.eap-blk-chev.dark{background:#1c1c1c;color:#d4af37;}'
      + '.eap-blk-chev-n{font-family:"Playfair Display",serif;font-size:24px;font-weight:700;}'
      + '.eap-blk-chev-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}'
      + '.eap-blk-chev-lbl{text-align:center;padding:0 8px;}'
      + '.eap-blk-chev-lbl .clt{font-family:"Playfair Display",serif;font-size:16px;color:#d4af37;background:transparent;border:none;width:100%;text-align:center;outline:none;}'
      + '.eap-blk-chev-lbl .cld{font-size:11px;color:rgba(255,255,255,.75);background:transparent;border:none;width:100%;text-align:center;outline:none;font-family:inherit;resize:none;margin-top:2px;}'

      /* Timeline horizontal (5) */
      + '.eap-blk-htime{position:relative;padding:20px 10px;}'
      + '.eap-blk-htime-line{position:absolute;top:50%;left:8%;right:8%;height:1px;background:rgba(255,255,255,.25);}'
      + '.eap-blk-htime-nodes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;position:relative;}'
      + '.eap-blk-htime-node{text-align:center;}'
      + '.eap-blk-htime-num{width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.7);border:1px solid rgba(212,175,55,.5);color:#d4af37;font-family:"Playfair Display",serif;font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:10px auto;}'
      + '.eap-blk-htime-tt{font-family:"Playfair Display",serif;font-size:16px;color:#d4af37;background:transparent;border:none;width:100%;text-align:center;outline:none;}'
      + '.eap-blk-htime-dd{font-size:10px;color:rgba(255,255,255,.7);background:transparent;border:none;width:100%;text-align:center;outline:none;font-family:inherit;resize:none;}'
      + '.eap-blk-htime-above{margin-bottom:30px;}'
      + '.eap-blk-htime-below{margin-top:30px;}'

      /* Process curvo (6) — usa SVG */
      + '.eap-blk-curved{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:30px 10px 50px;}'
      + '.eap-blk-curved-node{text-align:center;position:relative;z-index:2;}'
      + '.eap-blk-curved-tt{font-family:"Playfair Display",serif;font-size:18px;color:#d4af37;background:transparent;border:none;width:100%;text-align:center;outline:none;margin-bottom:4px;}'
      + '.eap-blk-curved-dd{font-size:11px;color:rgba(255,255,255,.75);background:transparent;border:none;width:100%;text-align:center;outline:none;font-family:inherit;resize:none;}'
      + '.eap-blk-curved-svg{position:absolute;top:0;left:0;right:0;height:50px;pointer-events:none;}'

      /* Photo grid 3-col (7) */
      + '.eap-blk-pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:8px 0;}'
      + '.eap-blk-pcol{display:flex;gap:12px;align-items:flex-start;}'
      + '.eap-blk-pthumb{width:70px;height:70px;border-radius:6px;flex-shrink:0;background:linear-gradient(135deg,#532b6c,#a865d8);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:24px;color:rgba(255,255,255,.6);}'
      + '.eap-blk-pthumb img{width:100%;height:100%;object-fit:cover;}'
      + '.eap-blk-pcol-c{flex:1;min-width:0;}'
      + '.eap-blk-pcol-t{font-family:"Playfair Display",serif;font-size:16px;color:#d4af37;background:transparent;border:none;width:100%;outline:none;margin-bottom:3px;}'
      + '.eap-blk-pcol-d{font-size:12px;color:rgba(255,255,255,.7);background:transparent;border:none;width:100%;outline:none;font-family:inherit;resize:none;}'

      /* Big stat (8) */
      + '.eap-blk-bigstat{text-align:center;padding:20px 0;}'
      + '.eap-blk-bigstat-v{font-family:"Playfair Display",serif;font-size:80px;color:rgba(255,255,255,.85);line-height:1;background:transparent;border:none;width:100%;text-align:center;outline:none;}'
      + '.eap-blk-bigstat-l{font-family:"Playfair Display",serif;font-size:18px;color:#d4af37;font-style:italic;background:transparent;border:none;width:100%;text-align:center;outline:none;margin:4px 0;}'
      + '.eap-blk-bigstat-d{font-size:12px;color:rgba(255,255,255,.6);background:transparent;border:none;width:100%;text-align:center;outline:none;font-family:inherit;}'

      /* Mega-CTA (9) */
      + '.eap-blk-mega{font-family:"Playfair Display",serif;font-size:64px;font-style:italic;color:#d4af37;line-height:1.05;background:transparent;border:none;width:100%;outline:none;text-align:center;padding:30px 0;resize:none;}'

      /* Hero foto-bg (10) */
      + '.eap-blk-herobg{position:relative;border-radius:10px;overflow:hidden;min-height:280px;background:linear-gradient(135deg,#2a1a3a 0%,#532b6c 50%,#1a1a2e 100%);padding:50px 40px;display:flex;flex-direction:column;justify-content:center;}'
      + '.eap-blk-herobg::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,14,26,.4),rgba(10,14,26,.85));pointer-events:none;}'
      + '.eap-blk-herobg > *{position:relative;z-index:1;}'
      + '.eap-blk-herobg-badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.2em;color:#d4af37;margin-bottom:14px;background:transparent;border:none;outline:none;width:auto;}'
      + '.eap-blk-herobg-t{font-family:"Playfair Display",serif;font-size:40px;font-weight:700;color:#d4af37;background:transparent;border:none;width:100%;outline:none;margin:0 0 8px;line-height:1.05;}'
      + '.eap-blk-herobg-s{font-family:"Playfair Display",serif;font-size:20px;font-style:italic;color:rgba(255,255,255,.8);background:transparent;border:none;width:100%;outline:none;margin:0;}'

      /* Half-photo bleed (11) */
      + '.eap-blk-half{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:-12px;border-radius:10px;overflow:hidden;min-height:300px;}'
      + '.eap-blk-half-photo{background:linear-gradient(135deg,#2a1a3a,#532b6c,#1a1a2e);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;}'
      + '.eap-blk-half-photo::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 50%,rgba(168,101,216,.3),transparent 60%);}'
      + '.eap-blk-half-photo img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0;}'
      + '.eap-blk-half-content{padding:30px 24px;display:flex;flex-direction:column;justify-content:center;background:rgba(0,0,0,.4);}'
      + '.eap-blk-half-tt{font-family:"Playfair Display",serif;font-size:28px;color:#d4af37;background:transparent;border:none;width:100%;outline:none;margin:0 0 8px;}'
      + '.eap-blk-half-dd{font-size:14px;color:rgba(255,255,255,.85);background:transparent;border:none;width:100%;outline:none;font-family:inherit;resize:none;line-height:1.6;}'

      /* Popup menu pra adicionar bloco */
      + '.eap-blk-popup{position:fixed;z-index:50;background:var(--bg-2,#0d1117);border:1px solid var(--border2,rgba(255,255,255,.14));border-radius:12px;padding:8px;box-shadow:0 18px 60px rgba(0,0,0,.6);min-width:320px;max-height:80vh;overflow-y:auto;display:none;}'
      + '.eap-blk-popup.show{display:block;}'
      + '.eap-blk-popup-search{background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));color:var(--text,#e6edf3);font-size:11px;padding:7px 11px;border-radius:6px;width:100%;font-family:inherit;margin-bottom:6px;}'
      + '.eap-blk-popup-cat{font-size:9px;font-weight:800;color:var(--muted,#9aa5b1);text-transform:uppercase;letter-spacing:.06em;padding:8px 8px 4px;}'
      + '.eap-blk-popup-item{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:6px;cursor:pointer;font-size:12px;}'
      + '.eap-blk-popup-item:hover{background:rgba(200,240,90,.10);}'
      + '.eap-blk-popup-item-i{width:28px;height:28px;border-radius:6px;background:var(--bg-3,#1c2128);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}'
      + '.eap-blk-popup-item-i.gold{background:rgba(212,175,55,.15);color:#d4af37;}'
      + '.eap-blk-popup-item-n{font-weight:700;font-size:12px;}'
      + '.eap-blk-popup-item-s{font-size:10px;color:var(--muted,#9aa5b1);}'

      /* Tema selector na toolbar */
      + '.eap-tema-sel{background:var(--bg-3,#1c2128);border:1px solid var(--border,rgba(255,255,255,.08));color:var(--text,#e6edf3);padding:6px 10px;border-radius:6px;font-size:11px;font-family:inherit;cursor:pointer;}'

      /* ═══════════════════════════════════════════════════════════════
         FASE 3 · UX do Editor (slash command, drag-drop, thumbnails)
         ═══════════════════════════════════════════════════════════════ */
      /* Drag handle no canto esquerdo do bloco */
      + '.eap-blk{position:relative;}'
      + '.eap-blk-drag{position:absolute;left:-22px;top:14px;width:18px;height:24px;display:none;align-items:center;justify-content:center;color:var(--muted,#9aa5b1);cursor:grab;font-size:14px;border-radius:3px;}'
      + '.eap-blk:hover .eap-blk-drag,.eap-blk.sel .eap-blk-drag{display:flex;}'
      + '.eap-blk-drag:hover{color:var(--accent,#c8f05a);background:rgba(200,240,90,.06);}'
      + '.eap-blk-drag:active{cursor:grabbing;}'

      /* Bloco em drag */
      + '.eap-blk.dragging{opacity:.4;}'

      /* Linha indicadora de drop */
      + '.eap-drop-line{height:0;border-top:2px solid var(--accent,#c8f05a);margin:0 0 -2px;display:none;box-shadow:0 0 8px rgba(200,240,90,.5);}'
      + '.eap-drop-line.active{display:block;}'

      /* Card thumbnail também draggable */
      + '.eap-thumb{cursor:grab;}'
      + '.eap-thumb:active{cursor:grabbing;}'
      + '.eap-thumb.dragging{opacity:.4;}'
      + '.eap-thumb-drop-line{height:0;border-top:2px solid var(--accent,#c8f05a);margin:-2px 0;display:none;}'
      + '.eap-thumb-drop-line.active{display:block;}'

      /* Slash command popup posicionado próximo ao cursor */
      + '.eap-slash{position:fixed;z-index:60;background:var(--bg-2,#0d1117);border:1px solid var(--border2,rgba(255,255,255,.14));border-radius:10px;padding:6px;box-shadow:0 18px 60px rgba(0,0,0,.6);min-width:280px;max-height:280px;overflow-y:auto;display:none;}'
      + '.eap-slash.show{display:block;}'
      + '.eap-slash-item{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:6px;cursor:pointer;font-size:12px;}'
      + '.eap-slash-item.curr{background:rgba(200,240,90,.12);}'
      + '.eap-slash-item:hover{background:rgba(200,240,90,.08);}'
      + '.eap-slash-item-i{width:24px;height:24px;border-radius:5px;background:var(--bg-3,#1c2128);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}'
      + '.eap-slash-item-i.gold{background:rgba(212,175,55,.15);color:#d4af37;}'
      + '.eap-slash-item-n{font-weight:700;font-size:12px;}'
      + '.eap-slash-item-s{font-size:10px;color:var(--muted,#9aa5b1);}'

      /* Thumbnail melhor com mini-render */
      + '.eap-thumb-mini-blk{font-size:6px;color:rgba(255,255,255,.7);margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}'
      + '.eap-thumb-mini-blk.heading{color:#c8f05a;font-family:"Playfair Display",serif;font-weight:700;font-size:7.5px;}'
      + '.eap-thumb-mini-blk.heading-h2{color:#f0c896;font-style:italic;font-size:6.5px;}'
      + '.eap-thumb-mini-blk.img,.eap-thumb-mini-blk.video{background:rgba(255,255,255,.08);height:14px;margin:2px 0;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:8px;}'
      + '.eap-thumb-mini-blk.cta{background:#c8f05a;color:#0a0e1a;display:inline-block;padding:0 4px;border-radius:2px;font-weight:700;}'
      + '.eap-thumb-mini-blk.callout{border-left:1px solid #d4af37;padding-left:3px;color:#d4af37;font-style:italic;}'
      + '.eap-thumb-mini-blk.tag{display:inline-block;background:rgba(212,175,55,.18);color:#d4af37;padding:0 3px;border-radius:1px;font-size:5px;font-weight:700;margin-right:2px;}'

      + '@media(max-width:900px){.eap-body{grid-template-columns:1fr;}.eap-side,.eap-right{display:none;}}';

    var st = document.createElement('style');
    st.id = 'eapCss';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── Build shell ───────────────────────────────────────────────── */
  function _buildShell(){
    var host = document.getElementById('editorApresentacaoScreen');
    if(!host) return;
    host.innerHTML = ''
      + '<div class="eap-app">'
      +   '<div class="eap-tbar">'
      +     '<button class="eap-back" onclick="window.voltarEditorApresentacao()">‹ Voltar</button>'
      +     '<input class="eap-tit" id="eapTit" placeholder="Título da apresentação..." oninput="window._eapTitulo(this.value)">'
      +     '<span class="eap-sav" id="eapSav">💾 Salvo</span>'
      +     '<div class="eap-spacer"></div>'
      +     '<select class="eap-tema-sel" id="eapTemaSel" onchange="window._eapTrocarTema(this.value)" title="Tema visual">'
      +       '<option value="black-tie">⚫ Black Tie</option>'
      +       '<option value="black-gold">⭐ Black & Gold</option>'
      +     '</select>'
      +     '<button class="eap-btn" onclick="window._eapSalvar()">💾 Salvar</button>'
      +     '<button class="eap-btn" onclick="window._eapAbrirExport()">📥 Exportar</button>'
      +     '<button class="eap-btn-pri" onclick="window._eapApresentar()">▶ Apresentar</button>'
      +   '</div>'
      +   '<div class="eap-body">'
      +     '<aside class="eap-side" id="eapSide"></aside>'
      +     '<main class="eap-canvas" id="eapCanvas"></main>'
      +     '<aside class="eap-right" id="eapRight"></aside>'
      +   '</div>'
      + '</div>'
      + '<div class="eap-show" id="eapShow"></div>'
      /* Modal de export HTML standalone · Fase 5/Opção A */
      + '<div class="eap-export" id="eapExport">'
      +   '<div class="eap-export-box">'
      +     '<div class="eap-export-h">'
      +       '<h3>📥 Exportar apresentação</h3>'
      +       '<button class="eap-export-x" onclick="window._eapFecharExport()">✕</button>'
      +     '</div>'
      +     '<div class="eap-export-b">'
      +       '<div class="eap-fld"><label>Nome do arquivo</label>'
      +         '<input type="text" id="eapExpNome" placeholder="apresentacao.html">'
      +       '</div>'
      +       '<div class="eap-fld"><label>Modo</label>'
      +         '<select id="eapExpModo">'
      +           '<option value="completo">Completo (com timer, fullscreen, atalhos)</option>'
      +           '<option value="view">View-only (somente slides, sem ferramentas)</option>'
      +         '</select>'
      +       '</div>'
      +       '<div style="background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.2);padding:12px 14px;border-radius:8px;font-size:12px;color:rgba(255,255,255,.75);line-height:1.5;">'
      +         '<b style="color:#d4af37;">ℹ Como funciona</b><br>'
      +         'Gera um único arquivo HTML que abre no navegador (offline, sem dashboard). Pode ser enviado por WhatsApp, e-mail ou hospedado em qualquer site estático.'
      +       '</div>'
      +     '</div>'
      +     '<div class="eap-export-f">'
      +       '<button class="eap-btn" onclick="window._eapFecharExport()">Cancelar</button>'
      +       '<button class="eap-btn-pri" onclick="window._eapBaixarExport()">📥 Baixar HTML</button>'
      +     '</div>'
      +   '</div>'
      + '</div>'
      /* Galeria de templates · Fase 5a */
      + '<div class="eap-galeria" id="eapGaleria">'
      +   '<div class="eap-gal-top">'
      +     '<h3>✨ Galeria de templates</h3>'
      +     '<input type="text" id="eapGalBusca" placeholder="🔍 Buscar template..." oninput="window._eapGalFiltrar(this.value)">'
      +     '<button onclick="window._eapFecharGaleria()">✕ Fechar</button>'
      +   '</div>'
      +   '<div class="eap-gal-tabs" id="eapGalTabs"></div>'
      +   '<div class="eap-gal-grid" id="eapGalGrid"></div>'
      + '</div>';

    /* Atalhos do editor */
    document.addEventListener('keydown', _onKey);
  }

  function _onKey(e){
    /* Galeria de templates · ESC fecha mesmo fora do modo apresentação */
    var gal = document.getElementById('eapGaleria');
    if(gal && gal.classList.contains('show')){
      if(e.key === 'Escape'){ e.preventDefault(); window._eapFecharGaleria(); }
      return;
    }
    /* Modal de export · ESC fecha */
    var exp = document.getElementById('eapExport');
    if(exp && exp.classList.contains('show')){
      if(e.key === 'Escape'){ e.preventDefault(); window._eapFecharExport(); }
      return;
    }
    if(_modoApresentar){
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      var k = e.key;
      var kl = (k || '').toLowerCase();
      /* Undo da caneta */
      if(_canetaOn && (e.ctrlKey || e.metaKey) && kl === 'z'){
        e.preventDefault(); window._eapDrawUndo(); return;
      }
      if(k === 'Escape'){
        e.preventDefault();
        /* ESC fecha primeiro a ferramenta ativa, depois a apresentação */
        if(_overviewOn){ window._eapToggleOverview(); return; }
        if(_canetaOn){ window._eapToggleDraw(); return; }
        if(_destaqueOn){ window._eapToggleDest(); return; }
        if(_blackOn || _whiteOn){ _blackOn = false; _whiteOn = false; _aplicarColorOv(); return; }
        window._eapFecharApresentacao();
      }
      else if(k === 'ArrowRight' || k === ' ' || k === 'PageDown'){ e.preventDefault(); _navSlide(1); }
      else if(k === 'ArrowLeft' || k === 'PageUp'){ e.preventDefault(); _navSlide(-1); }
      else if(k === 'Home'){ e.preventDefault(); _irSlide(0); }
      else if(k === 'End'){ e.preventDefault(); _irSlide(_apr.cards.length - 1); }
      else if(kl === 's'){ e.preventDefault(); window._eapToggleDest(); }
      else if(kl === 'l'){ e.preventDefault(); window._eapToggleDraw(); }
      else if(kl === 'b' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); window._eapToggleBlack(); }
      else if(kl === 'w' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); window._eapToggleWhite(); }
      else if(kl === 'o'){ e.preventDefault(); window._eapToggleOverview(); }
      else if(kl === 'n'){ e.preventDefault(); window._eapToggleNotes(); }
      else if(kl === 'f'){ e.preventDefault(); window._eapToggleFs(); }
      else if(kl === 'c' && _canetaOn){ e.preventDefault(); window._eapDrawClear(); }
    }
  }

  /* ── Render principal ──────────────────────────────────────────── */
  function _render(){
    if(!_apr) return;
    var tit = document.getElementById('eapTit');
    if(tit && document.activeElement !== tit) tit.value = _apr.titulo || '';
    /* Sincroniza o tema selector */
    var temaSel = document.getElementById('eapTemaSel');
    if(temaSel) temaSel.value = _apr.tema || 'black-tie';
    _renderSidebar();
    _renderCanvas();
    _renderRight();
  }

  function _renderSidebar(){
    var side = document.getElementById('eapSide');
    if(!side) return;
    var html = '<h4>Cards <span class="n">' + _apr.cards.length + '</span></h4>';
    _apr.cards.forEach(function(card, i){
      /* Mini-render dos blocos no thumbnail */
      var miniHtml = '';
      var blocos = (card.blocos || []).slice(0, 6); /* limita pra não estourar o thumbnail */
      blocos.forEach(function(b){
        if(b.tipo === 'heading'){
          var clsH = b.nivel === 2 ? 'heading heading-h2' : 'heading';
          miniHtml += '<div class="eap-thumb-mini-blk ' + clsH + '">' + _esc((b.texto || '...').slice(0, 32)) + '</div>';
        } else if(b.tipo === 'texto'){
          miniHtml += '<div class="eap-thumb-mini-blk">' + _esc((b.texto || '...').slice(0, 36)) + '</div>';
        } else if(b.tipo === 'imagem'){
          miniHtml += '<div class="eap-thumb-mini-blk img">🖼</div>';
        } else if(b.tipo === 'video'){
          miniHtml += '<div class="eap-thumb-mini-blk video">▶</div>';
        } else if(b.tipo === 'cta'){
          miniHtml += '<div class="eap-thumb-mini-blk cta">' + _esc((b.texto || 'CTA').slice(0, 14)) + '</div>';
        } else if(b.tipo === 'callout'){
          miniHtml += '<div class="eap-thumb-mini-blk callout">' + _esc((b.titulo || '...').slice(0, 28)) + '</div>';
        } else if(b.tipo === 'tag'){
          miniHtml += '<div>' + (b.tags || []).slice(0, 2).map(function(t){ return '<span class="eap-thumb-mini-blk tag">' + _esc(t.slice(0, 8)) + '</span>'; }).join('') + '</div>';
        } else if(b.tipo === 'mega-cta'){
          miniHtml += '<div class="eap-thumb-mini-blk heading-h2" style="font-size:8px;">' + _esc((b.texto || '...').slice(0, 24)) + '</div>';
        } else if(b.tipo === 'big-stat'){
          miniHtml += '<div class="eap-thumb-mini-blk heading" style="font-size:11px;">' + _esc(b.valor || '50+') + '</div>';
        } else if(b.tipo === 'pillars' || b.tipo === 'chevron' || b.tipo === 'timeline-h' || b.tipo === 'process-curved' || b.tipo === 'photo-grid'){
          var icones = { pillars: '01', chevron: '▶▶', 'timeline-h': '○━○', 'process-curved': '↣', 'photo-grid': '⫼' };
          miniHtml += '<div class="eap-thumb-mini-blk" style="color:#d4af37;">' + icones[b.tipo] + ' ' + (b.items || []).length + ' itens</div>';
        } else if(b.tipo === 'hero-photo'){
          miniHtml += '<div class="eap-thumb-mini-blk heading">' + _esc((b.titulo || 'Hero').slice(0, 24)) + '</div>';
        } else if(b.tipo === 'half-photo'){
          miniHtml += '<div class="eap-thumb-mini-blk" style="color:#d4af37;">⇿ ' + _esc((b.titulo || '...').slice(0, 22)) + '</div>';
        }
      });
      if(!miniHtml) miniHtml = '<div class="eap-thumb-mini-blk" style="opacity:.4;">(card vazio)</div>';

      /* Aplica tema do card no thumbnail */
      var tema = _apr.tema || 'black-tie';
      var bg = (tema === 'black-gold') ? 'background:#0a0a0a;' : 'background:linear-gradient(135deg,#1a1a2e,#16213e);';

      html += '<div class="eap-thumb' + (i === _cardIdx ? ' curr' : '') + '" draggable="true" onclick="window._eapTrocarCard(' + i + ')">'
        +   '<div class="eap-thumb-n">'
        +     String(i + 1).padStart(2, '0')
        +     (_apr.cards.length > 1 ? '<span class="del" onclick="event.stopPropagation();window._eapRemoverCard(' + i + ')">✕</span>' : '')
        +   '</div>'
        +   '<div class="eap-thumb-mini" style="' + bg + '">' + miniHtml + '</div>'
        + '</div>';
    });
    html += '<button class="eap-add-card" onclick="window._eapAdicionarCard()">+ Adicionar card vazio</button>';
    html += '<button class="eap-add-card eap-add-template" onclick="window._eapAbrirGaleria()">✨ Inserir template</button>';
    side.innerHTML = html;
  }

  function _renderCanvas(){
    var canvas = document.getElementById('eapCanvas');
    if(!canvas) return;
    var card = _apr.cards[_cardIdx];
    if(!card){ canvas.innerHTML = '<div class="eap-card empty"><div class="ic">📭</div>Nenhum card</div>'; return; }

    var html = '<div class="eap-card">';
    if(!card.blocos || card.blocos.length === 0){
      html += '<div style="text-align:center;color:rgba(255,255,255,.4);padding:60px 20px;">'
        + '<div style="font-size:36px;opacity:.4;margin-bottom:10px;">📄</div>'
        + '<div style="font-size:13px;">Card vazio — adicione blocos abaixo</div>'
        + '</div>';
    } else {
      card.blocos.forEach(function(bloco, idx){
        html += _renderBloco(bloco, idx);
      });
    }
    /* Drop line ao final pra permitir soltar como último bloco */
    html += '<div class="eap-drop-line" data-drop-before="' + (card.blocos ? card.blocos.length : 0) + '"></div>';
    html += '<div class="eap-add-blk">'
      +   '<button id="eapBtnAddBlk" onclick="event.stopPropagation();window._eapAbrirPopupBlocos()" style="background:var(--accent,#c8f05a);color:var(--bg,#0a0e1a);border-color:var(--accent,#c8f05a);font-weight:700;">+ Adicionar bloco · 16 tipos</button>'
      + '</div>';
    html += '</div>';
    /* Adiciona data-tema no card pra estilo Black & Gold */
    var tema = _apr.tema || 'black-tie';
    canvas.innerHTML = html.replace('<div class="eap-card">', '<div class="eap-card" data-tema="' + tema + '">');
  }

  function _renderBloco(bloco, idx){
    var ctrl = ''
      + '<div class="eap-blk-ctrl">'
      +   '<button onclick="event.stopPropagation();window._eapMoverBloco(' + idx + ',-1)" title="Mover acima">↑</button>'
      +   '<button onclick="event.stopPropagation();window._eapMoverBloco(' + idx + ',1)" title="Mover abaixo">↓</button>'
      +   '<button onclick="event.stopPropagation();window._eapDuplicarBloco(' + idx + ')" title="Duplicar">⎘</button>'
      +   '<button class="del" onclick="event.stopPropagation();window._eapRemoverBloco(' + idx + ')" title="Excluir">🗑</button>'
      + '</div>';
    var conteudo = '';

    if(bloco.tipo === 'heading'){
      var cls = (bloco.nivel === 2) ? 'eap-h2-input' : 'eap-h1-input';
      conteudo = '<textarea class="eap-blk-input ' + cls + '" rows="1" placeholder="Título..."'
        + ' oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(bloco.texto || '') + '</textarea>';
    } else if(bloco.tipo === 'texto'){
      conteudo = '<textarea class="eap-blk-input eap-p-input" rows="3" placeholder="Texto do parágrafo..."'
        + ' oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(bloco.texto || '') + '</textarea>';
    } else if(bloco.tipo === 'imagem'){
      if(bloco.url){
        conteudo = '<div class="eap-img-wrap"><img src="' + _esc(bloco.url) + '" alt="' + _esc(bloco.alt || '') + '"></div>';
      } else {
        conteudo = '<div class="eap-img-empty"><span style="font-size:32px;">🖼</span><span style="font-size:11px;">Clique aqui e cole URL da imagem no painel ao lado →</span></div>';
      }
    } else if(bloco.tipo === 'video'){
      if(bloco.url){
        var emb = _embedUrl(bloco.url);
        conteudo = '<div class="eap-video-wrap"><iframe src="' + _esc(emb) + '" allowfullscreen></iframe></div>';
      } else {
        conteudo = '<div class="eap-img-empty"><span style="font-size:32px;">🎬</span><span style="font-size:11px;">Clique aqui e cole URL do YouTube/Vimeo no painel ao lado →</span></div>';
      }
    } else if(bloco.tipo === 'cta'){
      conteudo = '<div class="eap-cta-wrap"><button class="eap-cta-btn" onclick="event.preventDefault();">' + _esc(bloco.texto || 'Clique aqui') + '</button></div>';

    /* ───── FASE 2 · Blocos Premium ───── */
    } else if(bloco.tipo === 'tag'){
      var tags = bloco.tags || [];
      conteudo = '<div class="eap-blk-tags">'
        + tags.map(function(t){ return '<span class="tag">' + _esc(t) + '</span>'; }).join('')
        + (tags.length === 0 ? '<span class="tag" style="opacity:.5;">EDITE NO PAINEL →</span>' : '')
        + '</div>';
    } else if(bloco.tipo === 'callout'){
      conteudo = '<div class="eap-blk-callout">'
        + '<input class="ct" placeholder="Título do callout" value="' + _esc(bloco.titulo || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'titulo\',this.value)">'
        + '<textarea class="cd" rows="2" placeholder="Descrição do callout"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'descricao\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(bloco.descricao || '') + '</textarea>'
        + '</div>';
    } else if(bloco.tipo === 'pillars'){
      var items = bloco.items || [];
      conteudo = '<div class="eap-blk-pillars">'
        + items.map(function(it, i){
            return '<div class="eap-blk-pillar">'
              + '<div class="pn">' + String(i + 1).padStart(2, '0') + '</div>'
              + '<div class="pl"></div>'
              + '<input class="pt" placeholder="Título do item" value="' + _esc(it.titulo || '') + '"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'titulo\',this.value)">'
              + '<textarea class="pd" rows="1" placeholder="Descrição"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'descricao\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(it.descricao || '') + '</textarea>'
              + '</div>';
          }).join('')
        + '</div>';
    } else if(bloco.tipo === 'chevron'){
      var items = bloco.items || [];
      var cores = ['', 'silver', 'dark'];
      conteudo = '<div class="eap-blk-chevs">'
        + items.map(function(it, i){
            return '<div class="eap-blk-chev ' + (cores[i] || '') + '">'
              + '<div class="eap-blk-chev-n">' + (i + 1) + '</div>'
              + '</div>';
          }).join('')
        + '</div>'
        + '<div class="eap-blk-chev-row">'
        + items.map(function(it, i){
            return '<div class="eap-blk-chev-lbl">'
              + '<input class="clt" placeholder="Título" value="' + _esc(it.titulo || '') + '"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'titulo\',this.value)">'
              + '<textarea class="cld" rows="1" placeholder="Descrição"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'descricao\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(it.descricao || '') + '</textarea>'
              + '</div>';
          }).join('')
        + '</div>';
    } else if(bloco.tipo === 'timeline-h'){
      var items = bloco.items || [];
      conteudo = '<div class="eap-blk-htime">'
        + '<div class="eap-blk-htime-line"></div>'
        + '<div class="eap-blk-htime-nodes">'
        + items.map(function(it, i){
            var acima = (i % 2 === 0);
            var contentInput = ''
              + '<input class="eap-blk-htime-tt" placeholder="Título" value="' + _esc(it.titulo || '') + '"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'titulo\',this.value)">'
              + '<textarea class="eap-blk-htime-dd" rows="1" placeholder="Descrição"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'descricao\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(it.descricao || '') + '</textarea>';
            return '<div class="eap-blk-htime-node">'
              + (acima ? '<div class="eap-blk-htime-above">' + contentInput + '</div>' : '')
              + '<div class="eap-blk-htime-num">' + (i + 1) + '</div>'
              + (!acima ? '<div class="eap-blk-htime-below">' + contentInput + '</div>' : '')
              + '</div>';
          }).join('')
        + '</div></div>';
    } else if(bloco.tipo === 'process-curved'){
      var items = bloco.items || [];
      /* SVG conectando os 4 pontos com curvas */
      var svg = '<svg class="eap-blk-curved-svg" viewBox="0 0 400 50" preserveAspectRatio="none">'
        + '<path d="M 50 25 Q 100 -10 150 25 Q 200 60 250 25 Q 300 -10 350 25" fill="none" stroke="#d4af37" stroke-width="2" opacity=".7"/>'
        + '</svg>';
      conteudo = '<div class="eap-blk-curved">'
        + svg
        + items.map(function(it, i){
            return '<div class="eap-blk-curved-node">'
              + '<input class="eap-blk-curved-tt" placeholder="Etapa" value="' + _esc(it.titulo || '') + '"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'titulo\',this.value)">'
              + '<textarea class="eap-blk-curved-dd" rows="2" placeholder="Descrição"'
              +   ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'descricao\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(it.descricao || '') + '</textarea>'
              + '</div>';
          }).join('')
        + '</div>';
    } else if(bloco.tipo === 'photo-grid'){
      var items = bloco.items || [];
      conteudo = '<div class="eap-blk-pgrid">'
        + items.map(function(it, i){
            return '<div class="eap-blk-pcol">'
              + '<div class="eap-blk-pthumb">' + (it.imagem ? '<img src="' + _esc(it.imagem) + '">' : '🖼') + '</div>'
              + '<div class="eap-blk-pcol-c">'
              +   '<input class="eap-blk-pcol-t" placeholder="Título" value="' + _esc(it.titulo || '') + '"'
              +     ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'titulo\',this.value)">'
              +   '<textarea class="eap-blk-pcol-d" rows="2" placeholder="Descrição"'
              +     ' oninput="event.stopPropagation();window._eapEditarBlocoItem(' + idx + ',' + i + ',\'descricao\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(it.descricao || '') + '</textarea>'
              + '</div></div>';
          }).join('')
        + '</div>';
    } else if(bloco.tipo === 'big-stat'){
      conteudo = '<div class="eap-blk-bigstat">'
        + '<input class="eap-blk-bigstat-v" placeholder="50+" value="' + _esc(bloco.valor || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'valor\',this.value)">'
        + '<input class="eap-blk-bigstat-l" placeholder="Label" value="' + _esc(bloco.label || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'label\',this.value)">'
        + '<input class="eap-blk-bigstat-d" placeholder="Descrição opcional" value="' + _esc(bloco.descricao || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'descricao\',this.value)">'
        + '</div>';
    } else if(bloco.tipo === 'mega-cta'){
      conteudo = '<textarea class="eap-blk-mega" rows="2" placeholder="Frase impactante."'
        + ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'texto\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(bloco.texto || '') + '</textarea>';
    } else if(bloco.tipo === 'hero-photo'){
      var bgStyle = bloco.imagem ? 'background-image:linear-gradient(180deg,rgba(10,14,26,.4),rgba(10,14,26,.85)),url(' + _esc(bloco.imagem) + ');background-size:cover;background-position:center;' : '';
      conteudo = '<div class="eap-blk-herobg" style="' + bgStyle + '">'
        + '<input class="eap-blk-herobg-badge" placeholder="BADGE · CATEGORIA" value="' + _esc(bloco.badge || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'badge\',this.value)">'
        + '<input class="eap-blk-herobg-t" placeholder="Título grande" value="' + _esc(bloco.titulo || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'titulo\',this.value)">'
        + '<input class="eap-blk-herobg-s" placeholder="Subtítulo elegante" value="' + _esc(bloco.subtitulo || '') + '"'
        +   ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'subtitulo\',this.value)">'
        + '</div>';
    } else if(bloco.tipo === 'half-photo'){
      var imgInner = bloco.imagem ? '<img src="' + _esc(bloco.imagem) + '">' : '<span style="z-index:2;color:rgba(255,255,255,.4);font-size:32px;">🖼</span>';
      conteudo = '<div class="eap-blk-half">'
        + (bloco.lado === 'right'
            ? '<div class="eap-blk-half-content"><input class="eap-blk-half-tt" placeholder="Título" value="' + _esc(bloco.titulo || '') + '"'
              + ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'titulo\',this.value)">'
              + '<textarea class="eap-blk-half-dd" rows="3" placeholder="Texto do bloco"'
              + ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'texto\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(bloco.texto || '') + '</textarea></div>'
              + '<div class="eap-blk-half-photo">' + imgInner + '</div>'
            : '<div class="eap-blk-half-photo">' + imgInner + '</div>'
              + '<div class="eap-blk-half-content"><input class="eap-blk-half-tt" placeholder="Título" value="' + _esc(bloco.titulo || '') + '"'
              + ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'titulo\',this.value)">'
              + '<textarea class="eap-blk-half-dd" rows="3" placeholder="Texto do bloco"'
              + ' oninput="event.stopPropagation();window._eapEditarBloco(' + idx + ',\'texto\',this.value);this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';">' + _esc(bloco.texto || '') + '</textarea></div>')
        + '</div>';
    }

    var drag = '<div class="eap-blk-drag" draggable="true" data-drag-idx="' + idx + '" title="Arraste para reordenar">⋮⋮</div>';
    return '<div class="eap-drop-line" data-drop-before="' + idx + '"></div>'
      + '<div class="eap-blk" data-idx="' + idx + '" onclick="window._eapSelBloco(' + idx + ')">' + drag + ctrl + conteudo + '</div>';
  }

  /* Edita um item dentro de um bloco com array de items (pillars/chevron/timeline/etc) */
  window._eapEditarBlocoItem = function(blkIdx, itemIdx, campo, valor){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos[blkIdx]) return;
    var blk = card.blocos[blkIdx];
    if(!blk.items) blk.items = [];
    if(!blk.items[itemIdx]) blk.items[itemIdx] = {};
    blk.items[itemIdx][campo] = valor;
    _agendarSave();
    /* Não re-render canvas pra preservar foco no input */
    _renderSidebar();
  };

  function _renderRight(){
    var r = document.getElementById('eapRight');
    if(!r) return;
    var card = _apr.cards[_cardIdx];
    var idx = card && card._selBlk != null ? card._selBlk : -1;
    var bloco = (idx >= 0 && card.blocos[idx]) ? card.blocos[idx] : null;

    if(!bloco){
      var notasCard = (card && card.notas) || '';
      r.innerHTML = ''
        + '<h4>Card atual</h4>'
        + '<div class="eap-card-notes">'
        +   '<label>📝 Notas do palestrante</label>'
        +   '<textarea placeholder="Anotações privadas pra usar durante a apresentação (atalho N)…" oninput="window._eapEditarNotasCard(this.value)">' + _esc(notasCard) + '</textarea>'
        + '</div>'
        + '<div class="eap-right-empty" style="margin-top:18px;"><div class="ic">⚙</div>Selecione um bloco para editar suas propriedades</div>';
      return;
    }

    var html = '<h4>Bloco · ' + _esc(bloco.tipo) + '</h4>';

    if(bloco.tipo === 'heading'){
      html += '<div class="eap-fld"><label>Nível</label>'
        + '<select onchange="window._eapEditarBloco(' + idx + ',\'nivel\',+this.value)">'
        +   '<option value="1"' + (bloco.nivel !== 2 ? ' selected' : '') + '>H1 · grande</option>'
        +   '<option value="2"' + (bloco.nivel === 2 ? ' selected' : '') + '>H2 · médio</option>'
        + '</select></div>';
      html += '<div class="eap-fld"><label>Texto</label><textarea oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value)">' + _esc(bloco.texto || '') + '</textarea></div>';
    } else if(bloco.tipo === 'texto'){
      html += '<div class="eap-fld"><label>Conteúdo</label><textarea rows="6" oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value)">' + _esc(bloco.texto || '') + '</textarea></div>';
    } else if(bloco.tipo === 'imagem'){
      html += '<div class="eap-fld"><label>URL da imagem</label><input type="text" placeholder="https://..." value="' + _esc(bloco.url || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'url\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Texto alternativo</label><input type="text" placeholder="Descrição" value="' + _esc(bloco.alt || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'alt\',this.value)"></div>';
    } else if(bloco.tipo === 'video'){
      html += '<div class="eap-fld"><label>URL do vídeo</label><input type="text" placeholder="https://youtube.com/watch?v=..." value="' + _esc(bloco.url || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'url\',this.value)"></div>';
      html += '<div style="font-size:10px;color:var(--muted,#9aa5b1);line-height:1.5;">Aceita YouTube (watch ou embed) e Vimeo. Auto-converte para embed responsivo.</div>';
    } else if(bloco.tipo === 'cta'){
      html += '<div class="eap-fld"><label>Texto do botão</label><input type="text" placeholder="Clique aqui" value="' + _esc(bloco.texto || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Link / ação</label><input type="text" placeholder="https://... ou tel:..." value="' + _esc(bloco.href || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'href\',this.value)"></div>';

    /* ── Fase 2 · property panels ── */
    } else if(bloco.tipo === 'tag'){
      var tags = (bloco.tags || []).join(', ');
      html += '<div class="eap-fld"><label>Tags (separadas por vírgula)</label><input type="text" placeholder="EQUIPE, CATEGORIA" value="' + _esc(tags) + '" oninput="window._eapEditarBloco(' + idx + ',\'tags\',this.value.split(/,\\s*/).filter(Boolean))"></div>';
    } else if(bloco.tipo === 'callout'){
      html += '<div class="eap-fld"><label>Título</label><input type="text" value="' + _esc(bloco.titulo || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'titulo\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Descrição</label><textarea rows="4" oninput="window._eapEditarBloco(' + idx + ',\'descricao\',this.value)">' + _esc(bloco.descricao || '') + '</textarea></div>';
    } else if(bloco.tipo === 'pillars' || bloco.tipo === 'chevron' || bloco.tipo === 'timeline-h' || bloco.tipo === 'process-curved' || bloco.tipo === 'photo-grid'){
      var items = bloco.items || [];
      html += '<div style="font-size:11px;color:var(--muted,#9aa5b1);margin-bottom:10px;">' + items.length + ' itens · edite direto no canvas</div>';
      if(bloco.tipo !== 'chevron' && bloco.tipo !== 'timeline-h' && bloco.tipo !== 'process-curved'){
        /* chevron/timeline/curved são fixos em 3-4, outros são variáveis */
        html += '<button class="eap-btn" style="width:100%;justify-content:center;margin-bottom:6px;" onclick="window._eapAddItem(' + idx + ')">+ Adicionar item</button>';
      }
      if(items.length > 1){
        html += '<button class="eap-btn" style="width:100%;justify-content:center;background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3);color:var(--red,#ef4444);" onclick="window._eapRemoverUltimoItem(' + idx + ')">– Remover último</button>';
      }
      if(bloco.tipo === 'photo-grid'){
        html += '<h4 style="margin-top:18px;">Imagens dos itens</h4>';
        items.forEach(function(it, i){
          html += '<div class="eap-fld"><label>Item ' + (i + 1) + ' · URL imagem</label><input type="text" placeholder="https://..." value="' + _esc(it.imagem || '') + '" oninput="window._eapEditarBlocoItem(' + idx + ',' + i + ',\'imagem\',this.value);window._eapRenderCanvas&&window._eapRenderCanvas();"></div>';
        });
      }
    } else if(bloco.tipo === 'big-stat'){
      html += '<div class="eap-fld"><label>Valor</label><input type="text" value="' + _esc(bloco.valor || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'valor\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Label</label><input type="text" value="' + _esc(bloco.label || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'label\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Descrição (opcional)</label><input type="text" value="' + _esc(bloco.descricao || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'descricao\',this.value)"></div>';
    } else if(bloco.tipo === 'mega-cta'){
      html += '<div class="eap-fld"><label>Frase</label><textarea rows="4" oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value)">' + _esc(bloco.texto || '') + '</textarea></div>';
    } else if(bloco.tipo === 'hero-photo'){
      html += '<div class="eap-fld"><label>URL imagem de fundo</label><input type="text" placeholder="https://..." value="' + _esc(bloco.imagem || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'imagem\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Badge (topo)</label><input type="text" value="' + _esc(bloco.badge || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'badge\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Título</label><input type="text" value="' + _esc(bloco.titulo || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'titulo\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Subtítulo</label><input type="text" value="' + _esc(bloco.subtitulo || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'subtitulo\',this.value)"></div>';
    } else if(bloco.tipo === 'half-photo'){
      html += '<div class="eap-fld"><label>Lado da foto</label><select onchange="window._eapEditarBloco(' + idx + ',\'lado\',this.value)">'
        + '<option value="left"' + (bloco.lado !== 'right' ? ' selected' : '') + '>Esquerda</option>'
        + '<option value="right"' + (bloco.lado === 'right' ? ' selected' : '') + '>Direita</option>'
        + '</select></div>';
      html += '<div class="eap-fld"><label>URL imagem</label><input type="text" placeholder="https://..." value="' + _esc(bloco.imagem || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'imagem\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Título</label><input type="text" value="' + _esc(bloco.titulo || '') + '" oninput="window._eapEditarBloco(' + idx + ',\'titulo\',this.value)"></div>';
      html += '<div class="eap-fld"><label>Texto</label><textarea rows="4" oninput="window._eapEditarBloco(' + idx + ',\'texto\',this.value)">' + _esc(bloco.texto || '') + '</textarea></div>';
    }

    r.innerHTML = html;
  }

  /* Adicionar/remover item dentro de bloco com items[] */
  window._eapAddItem = function(blkIdx){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos[blkIdx]) return;
    var blk = card.blocos[blkIdx];
    if(!blk.items) blk.items = [];
    blk.items.push({ titulo: 'Novo item', descricao: 'Descrição' });
    _render();
    _agendarSave();
  };
  window._eapRemoverUltimoItem = function(blkIdx){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos[blkIdx]) return;
    var blk = card.blocos[blkIdx];
    if(!blk.items || blk.items.length <= 1) return;
    blk.items.pop();
    _render();
    _agendarSave();
  };
  window._eapRenderCanvas = function(){ _renderCanvas(); };

  /* ── Manipulação de cards ──────────────────────────────────────── */
  window._eapAdicionarCard = function(){
    _apr.cards.push({ id: _uid('card_'), blocos: [] });
    _cardIdx = _apr.cards.length - 1;
    _render();
    _agendarSave();
  };

  /* ═══════════════════════════════════════════════════════════════
     GALERIA DE TEMPLATES · API
     ═══════════════════════════════════════════════════════════════ */
  window._eapAbrirGaleria = function(){
    var gal = document.getElementById('eapGaleria');
    if(!gal) return;
    _galCatAtual = 'todos';
    _galBusca = '';
    var bs = document.getElementById('eapGalBusca');
    if(bs) bs.value = '';
    _renderGalTabs();
    _renderGalGrid();
    gal.classList.add('show');
  };
  window._eapFecharGaleria = function(){
    var gal = document.getElementById('eapGaleria');
    if(gal) gal.classList.remove('show');
  };
  window._eapGalCat = function(cat){
    _galCatAtual = cat;
    _renderGalTabs();
    _renderGalGrid();
  };
  window._eapGalFiltrar = function(termo){
    _galBusca = (termo || '').toLowerCase().trim();
    _renderGalGrid();
  };
  window._eapInserirTemplate = function(tplId){
    var tpl = _TEMPLATES.filter(function(t){ return t.id === tplId; })[0];
    if(!tpl){ _toast('Template não encontrado', 'var(--red,#ef4444)'); return; }
    /* Deep clone dos blocos */
    var blocosClone = JSON.parse(JSON.stringify(tpl.blocos));
    var novoCard = { id: _uid('card_'), blocos: blocosClone };
    /* Insere após o card atual */
    _apr.cards.splice(_cardIdx + 1, 0, novoCard);
    _cardIdx++;
    _render();
    _agendarSave();
    window._eapFecharGaleria();
    _toast('✓ Template inserido: ' + tpl.nome);
  };

  /* ═══════════════════════════════════════════════════════════════
     EXPORT HTML STANDALONE · Fase 5 / Opção A
     ═══════════════════════════════════════════════════════════════ */
  window._eapAbrirExport = function(){
    if(!_apr || !_apr.cards.length){ _toast('Adicione conteúdo antes de exportar', 'var(--amber,#fbbf24)'); return; }
    var box = document.getElementById('eapExport');
    if(!box) return;
    var nm = document.getElementById('eapExpNome');
    if(nm) nm.value = _slug(_apr.titulo || 'apresentacao') + '.html';
    box.classList.add('show');
  };
  window._eapFecharExport = function(){
    var box = document.getElementById('eapExport');
    if(box) box.classList.remove('show');
  };
  window._eapBaixarExport = function(){
    var nmInp = document.getElementById('eapExpNome');
    var modoSel = document.getElementById('eapExpModo');
    var nm = (nmInp && nmInp.value.trim()) || (_slug(_apr.titulo) + '.html');
    if(!/\.html?$/i.test(nm)) nm += '.html';
    var modo = (modoSel && modoSel.value) || 'completo';
    var html = _buildExportHtml(modo);
    _baixarBlob(html, nm, 'text/html;charset=utf-8');
    window._eapFecharExport();
    _toast('✓ HTML baixado: ' + nm);
  };

  function _baixarBlob(conteudo, nome, mime){
    try{
      var blob = new Blob([conteudo], { type: mime || 'text/plain' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    }catch(e){
      _toast('Erro ao baixar: ' + e.message, 'var(--red,#ef4444)');
    }
  }

  /* Constrói o HTML standalone com CSS + dados + presenter inline */
  function _buildExportHtml(modo){
    var cssEl = document.getElementById('eapCss');
    var css = cssEl ? cssEl.textContent : '';
    /* Sanitiza JSON pra evitar que "</script>" ou "<!--" dentro de textos quebre o parsing HTML */
    var aprJson = JSON.stringify(_apr)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
    var tema = _apr.tema || 'black-tie';
    var titulo = _esc(_apr.titulo || 'Apresentação');
    var completo = (modo !== 'view');

    /* CSS adicional pro standalone (override do que era do editor) */
    var cssExtra = ''
      + 'html,body{margin:0;padding:0;background:#0a0e1a;font-family:"DM Sans",-apple-system,sans-serif;color:#fff;height:100%;overflow:hidden;}'
      + '.ex-host{position:fixed;inset:0;background:#0a0e1a;}'
      /* override .eap-show pra ser o container principal */
      + '.eap-show{display:flex !important;opacity:1 !important;visibility:visible !important;pointer-events:auto !important;}';

    /* Presenter JS embutido — versão standalone do _buildShow + nav + atalhos */
    var presenterJs = _buildPresenterScript(completo);

    return '<!DOCTYPE html>\n'
      + '<html lang="pt-BR">\n'
      + '<head>\n'
      + '<meta charset="UTF-8">\n'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
      + '<title>' + titulo + '</title>\n'
      + '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;700&family=DM+Mono&display=swap" rel="stylesheet">\n'
      + '<style>\n' + css + '\n' + cssExtra + '\n</style>\n'
      + '</head>\n'
      + '<body>\n'
      + '<div class="ex-host"><div class="eap-show active" id="exShow" data-tema="' + tema + '"></div></div>\n'
      + '<script>\n'
      + 'var APR = ' + aprJson + ';\n'
      + presenterJs + '\n'
      + '</script>\n'
      + '</body>\n'
      + '</html>';
  }

  /* Constrói o script JS do presenter standalone */
  function _buildPresenterScript(completo){
    /* Strings das funções helper precisam ser serializadas */
    var helpers = ''
      + 'function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;");}\n'
      + 'function embedUrl(u){if(!u)return"";var yt=u.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/|youtube\\.com\\/embed\\/)([\\w-]+)/);if(yt)return"https://www.youtube.com/embed/"+yt[1];var vm=u.match(/vimeo\\.com\\/(\\d+)/);if(vm)return"https://player.vimeo.com/video/"+vm[1];return u;}\n';

    /* Função renderBloco — clone do _renderBlocoApresentacao em formato standalone */
    var renderBloco = ''
      + 'function renderBloco(b){\n'
      + ' if(b.tipo==="heading"){var t=(b.nivel===2)?"h2":"h1";var c=(b.nivel===2)?"eap-h2-input":"eap-h1-input";return"<"+t+\' class="\'+c+\'" style="margin:0 0 14px;">\'+esc(b.texto||"")+"</"+t+">";}\n'
      + ' if(b.tipo==="texto")return\'<p class="eap-p-input" style="margin:0 0 14px;white-space:pre-wrap;">\'+esc(b.texto||"")+"</p>";\n'
      + ' if(b.tipo==="imagem"){if(!b.url)return"";return\'<div class="eap-img-wrap" style="margin-bottom:14px;"><img src="\'+esc(b.url)+\'" alt="\'+esc(b.alt||"")+\'"></div>\';}\n'
      + ' if(b.tipo==="video"){if(!b.url)return"";return\'<div class="eap-video-wrap" style="margin-bottom:14px;"><iframe src="\'+esc(embedUrl(b.url))+\'" allowfullscreen></iframe></div>\';}\n'
      + ' if(b.tipo==="cta"){var h=b.href?esc(b.href):"#";return\'<div class="eap-cta-wrap"><a class="eap-cta-btn" href="\'+h+\'" target="_blank" rel="noopener" style="text-decoration:none;">\'+esc(b.texto||"Clique aqui")+"</a></div>";}\n'
      + ' if(b.tipo==="tag"){var tags=b.tags||[];return\'<div class="eap-blk-tags" style="margin-bottom:14px;">\'+tags.map(function(t){return\'<span class="tag">\'+esc(t)+"</span>";}).join("")+"</div>";}\n'
      + ' if(b.tipo==="callout")return\'<div class="eap-blk-callout" style="margin-bottom:14px;"><div style="font-family:Playfair Display,serif;font-size:18px;font-style:italic;color:#d4af37;margin-bottom:6px;">\'+esc(b.titulo||"")+\'</div><div style="font-size:14px;color:rgba(255,255,255,.85);">\'+esc(b.descricao||"")+"</div></div>";\n'
      + ' if(b.tipo==="pillars"){var its=b.items||[];return\'<div class="eap-blk-pillars" style="margin-bottom:14px;">\'+its.map(function(it,i){return\'<div class="eap-blk-pillar"><div class="pn">\'+String(i+1).padStart(2,"0")+\'</div><div class="pl"></div><div style="font-family:Playfair Display,serif;font-size:20px;color:#d4af37;">\'+esc(it.titulo||"")+\'</div><div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:2px;">\'+esc(it.descricao||"")+"</div></div>";}).join("")+"</div>";}\n'
      + ' if(b.tipo==="chevron"){var its=b.items||[];var cs=["","silver","dark"];return\'<div style="margin-bottom:14px;"><div class="eap-blk-chevs">\'+its.map(function(it,i){return\'<div class="eap-blk-chev \'+(cs[i]||"")+\'"><div class="eap-blk-chev-n">\'+(i+1)+"</div></div>";}).join("")+\'</div><div class="eap-blk-chev-row">\'+its.map(function(it){return\'<div class="eap-blk-chev-lbl"><div style="font-family:Playfair Display,serif;font-size:16px;color:#d4af37;">\'+esc(it.titulo||"")+\'</div><div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:2px;">\'+esc(it.descricao||"")+"</div></div>";}).join("")+"</div></div>";}\n'
      + ' if(b.tipo==="timeline-h"){var its=b.items||[];return\'<div class="eap-blk-htime" style="margin-bottom:14px;"><div class="eap-blk-htime-line"></div><div class="eap-blk-htime-nodes">\'+its.map(function(it,i){var ac=(i%2===0);var ct=\'<div style="font-family:Playfair Display,serif;font-size:16px;color:#d4af37;">\'+esc(it.titulo||"")+\'</div><div style="font-size:10px;color:rgba(255,255,255,.7);">\'+esc(it.descricao||"")+"</div>";return\'<div class="eap-blk-htime-node">\'+(ac?\'<div class="eap-blk-htime-above">\'+ct+"</div>":"")+\'<div class="eap-blk-htime-num">\'+(i+1)+"</div>"+(!ac?\'<div class="eap-blk-htime-below">\'+ct+"</div>":"")+"</div>";}).join("")+"</div></div>";}\n'
      + ' if(b.tipo==="process-curved"){var its=b.items||[];var svg=\'<svg class="eap-blk-curved-svg" viewBox="0 0 400 50" preserveAspectRatio="none"><path d="M 50 25 Q 100 -10 150 25 Q 200 60 250 25 Q 300 -10 350 25" fill="none" stroke="#d4af37" stroke-width="2" opacity=".7"/></svg>\';return\'<div class="eap-blk-curved" style="margin-bottom:14px;">\'+svg+its.map(function(it){return\'<div class="eap-blk-curved-node"><div style="font-family:Playfair Display,serif;font-size:18px;color:#d4af37;margin-bottom:4px;">\'+esc(it.titulo||"")+\'</div><div style="font-size:11px;color:rgba(255,255,255,.75);">\'+esc(it.descricao||"")+"</div></div>";}).join("")+"</div>";}\n'
      + ' if(b.tipo==="photo-grid"){var its=b.items||[];return\'<div class="eap-blk-pgrid" style="margin-bottom:14px;">\'+its.map(function(it){var th=it.imagem?\'<img src="\'+esc(it.imagem)+\'">\':"🖼";return\'<div class="eap-blk-pcol"><div class="eap-blk-pthumb">\'+th+\'</div><div class="eap-blk-pcol-c"><div style="font-family:Playfair Display,serif;font-size:16px;color:#d4af37;">\'+esc(it.titulo||"")+\'</div><div style="font-size:12px;color:rgba(255,255,255,.7);">\'+esc(it.descricao||"")+"</div></div></div>";}).join("")+"</div>";}\n'
      + ' if(b.tipo==="big-stat")return\'<div class="eap-blk-bigstat" style="margin-bottom:14px;"><div style="font-family:Playfair Display,serif;font-size:80px;color:rgba(255,255,255,.85);line-height:1;">\'+esc(b.valor||"")+\'</div><div style="font-family:Playfair Display,serif;font-size:18px;color:#d4af37;font-style:italic;margin:4px 0;">\'+esc(b.label||"")+\'</div>\'+(b.descricao?\'<div style="font-size:12px;color:rgba(255,255,255,.6);">\'+esc(b.descricao)+"</div>":"")+"</div>";\n'
      + ' if(b.tipo==="mega-cta")return\'<div style="font-family:Playfair Display,serif;font-size:64px;font-style:italic;color:#d4af37;line-height:1.05;text-align:center;padding:30px 0;margin-bottom:14px;">\'+esc(b.texto||"")+"</div>";\n'
      + ' if(b.tipo==="hero-photo"){var bg=b.imagem?\'background-image:linear-gradient(180deg,rgba(10,14,26,.4),rgba(10,14,26,.85)),url(\'+esc(b.imagem)+\');background-size:cover;background-position:center;\':"background:linear-gradient(135deg,#2a1a3a 0%,#532b6c 50%,#1a1a2e 100%);";return\'<div class="eap-blk-herobg" style="margin-bottom:14px;\'+bg+\'">\'+(b.badge?\'<div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:.2em;color:#d4af37;margin-bottom:14px;">\'+esc(b.badge)+"</div>":"")+\'<div style="font-family:Playfair Display,serif;font-size:40px;font-weight:700;color:#d4af37;line-height:1.05;margin:0 0 8px;">\'+esc(b.titulo||"")+"</div>"+(b.subtitulo?\'<div style="font-family:Playfair Display,serif;font-size:20px;font-style:italic;color:rgba(255,255,255,.8);">\'+esc(b.subtitulo)+"</div>":"")+"</div>";}\n'
      + ' if(b.tipo==="half-photo"){var im=b.imagem?\'<img src="\'+esc(b.imagem)+\'">\':\'<span style="z-index:2;color:rgba(255,255,255,.4);font-size:32px;">🖼</span>\';var ph=\'<div class="eap-blk-half-photo">\'+im+"</div>";var co=\'<div class="eap-blk-half-content"><div style="font-family:Playfair Display,serif;font-size:28px;color:#d4af37;margin:0 0 8px;">\'+esc(b.titulo||"")+\'</div><div style="font-size:14px;color:rgba(255,255,255,.85);line-height:1.6;">\'+esc(b.texto||"")+"</div></div>";return\'<div class="eap-blk-half" style="margin-bottom:14px;">\'+(b.lado==="right"?co+ph:ph+co)+"</div>";}\n'
      + ' return"";\n'
      + '}\n';

    /* Bootstrap inline com nav + atalhos + (se completo) timer/fullscreen */
    var bootstrap = ''
      + 'var sIdx=0;var tStart=Date.now();var tInt=null;\n'
      + 'function build(){\n'
      + ' var show=document.getElementById("exShow");var tema=APR.tema||"black-tie";\n'
      + ' var slides=APR.cards.map(function(c,i){var inner="";(c.blocos||[]).forEach(function(b){inner+=renderBloco(b);});if(!inner)inner=\'<div style="text-align:center;color:rgba(255,255,255,.3);padding:60px;">Card vazio</div>\';return\'<div class="eap-show-slide\'+(i===sIdx?" curr":"")+\'"><div class="eap-card" data-tema="\'+tema+\'">\'+inner+"</div></div>";}).join("");\n'
      + ' var dots=APR.cards.map(function(_,i){return\'<span class="eap-show-dot\'+(i===sIdx?" curr":"")+\'" onclick="ir(\'+i+\')"></span>\';}).join("");\n'
      + ' show.innerHTML=\'\'+\n'
      + '   \'<div class="eap-show-top"><div class="eap-show-t">🎯 \'+esc(APR.titulo||"Apresentação")+"</div>"'
      + (completo ? '+\'<div class="eap-show-timer"><span class="dot"></span><span id="exTime">00:00</span></div>\'+\'<button class="eap-show-btn" onclick="fs()" title="F · Tela cheia">⛶</button>\'' : '')
      + '+"</div>"+\n'
      + '   \'<button class="eap-show-arrow left" id="exPrev" onclick="nav(-1)">‹</button>\'+\n'
      + '   \'<button class="eap-show-arrow right" id="exNext" onclick="nav(1)">›</button>\'+\n'
      + '   \'<div class="eap-show-stage">\'+slides+"</div>"+\n'
      + '   \'<div class="eap-show-nav"><div class="eap-show-dots">\'+dots+\'</div><div class="eap-show-counter"><b id="exPos">\'+(sIdx+1)+"</b> / "+APR.cards.length+"</div></div>";\n'
      + ' atualizar();\n'
      + '}\n'
      + 'function ir(idx){if(idx<0||idx>=APR.cards.length)return;var sl=document.querySelectorAll(".eap-show-slide");var dt=document.querySelectorAll(".eap-show-dot");sl.forEach(function(s,i){s.classList.remove("curr","prev-exit");if(i===idx)s.classList.add("curr");else if(i<idx)s.classList.add("prev-exit");});dt.forEach(function(d,i){d.classList.toggle("curr",i===idx);});sIdx=idx;var p=document.getElementById("exPos");if(p)p.textContent=idx+1;atualizar();}\n'
      + 'function nav(d){ir(sIdx+d);}\n'
      + 'function atualizar(){var p=document.getElementById("exPrev");var n=document.getElementById("exNext");if(p)p.disabled=(sIdx===0);if(n)n.disabled=(sIdx===APR.cards.length-1);}\n'
      + 'window.ir=ir;window.nav=nav;\n';

    var completoExtras = completo ? ''
      + 'function fs(){if(!document.fullscreenElement){try{document.documentElement.requestFullscreen();}catch(e){}}else{try{document.exitFullscreen();}catch(e){}}}\n'
      + 'window.fs=fs;\n'
      + 'tInt=setInterval(function(){var el=document.getElementById("exTime");if(!el)return;var s=Math.floor((Date.now()-tStart)/1000);var m=Math.floor(s/60);var ss=s%60;el.textContent=(m<10?"0":"")+m+":"+(ss<10?"0":"")+ss;},1000);\n'
      + 'document.addEventListener("keydown",function(e){if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")return;if(e.key==="ArrowRight"||e.key===" "||e.key==="PageDown"){e.preventDefault();nav(1);}else if(e.key==="ArrowLeft"||e.key==="PageUp"){e.preventDefault();nav(-1);}else if(e.key==="Home"){e.preventDefault();ir(0);}else if(e.key==="End"){e.preventDefault();ir(APR.cards.length-1);}else if((e.key||"").toLowerCase()==="f"){e.preventDefault();fs();}});\n'
      : ''
      /* view-only: navegação ainda funciona com setas */
      + 'document.addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key===" "){e.preventDefault();nav(1);}else if(e.key==="ArrowLeft"){e.preventDefault();nav(-1);}});\n';

    return helpers + renderBloco + bootstrap + completoExtras + 'build();';
  }

  function _renderGalTabs(){
    var t = document.getElementById('eapGalTabs');
    if(!t) return;
    t.innerHTML = _CATEGORIAS.map(function(c){
      var cont = (c.id === 'todos')
        ? _TEMPLATES.length
        : _TEMPLATES.filter(function(tp){ return tp.categoria === c.id; }).length;
      return '<button class="eap-gal-tab' + (c.id === _galCatAtual ? ' on' : '') + '"'
        + ' onclick="window._eapGalCat(\'' + c.id + '\')">'
        + c.emoji + ' ' + c.nome + ' · ' + cont
        + '</button>';
    }).join('');
  }

  function _renderGalGrid(){
    var g = document.getElementById('eapGalGrid');
    if(!g) return;
    var lista = _TEMPLATES.filter(function(tp){
      if(_galCatAtual !== 'todos' && tp.categoria !== _galCatAtual) return false;
      if(_galBusca){
        var hay = (tp.nome + ' ' + tp.categoria).toLowerCase();
        if(hay.indexOf(_galBusca) < 0) return false;
      }
      return true;
    });
    if(!lista.length){
      g.innerHTML = '<div class="eap-gal-empty">Nenhum template encontrado pra "<b>' + _esc(_galBusca) + '</b>"</div>';
      return;
    }
    g.innerHTML = lista.map(function(tp){
      var cat = _CATEGORIAS.filter(function(c){ return c.id === tp.categoria; })[0] || {};
      return '<div class="eap-tpl-card" onclick="window._eapInserirTemplate(\'' + tp.id + '\')">'
        +   '<div class="eap-tpl-thumb">' + _tplThumb(tp) + '</div>'
        +   '<div class="eap-tpl-meta">'
        +     '<div class="nm">' + tp.emoji + ' ' + _esc(tp.nome) + '</div>'
        +     '<div class="cat">' + (cat.nome || '') + '</div>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  /* Mini-thumb visual baseado nos blocos do template */
  function _tplThumb(tpl){
    var html = '';
    tpl.blocos.slice(0, 5).forEach(function(b){
      if(b.tipo === 'heading'){
        html += '<div class="tt">' + _esc((b.texto || '').slice(0, 22)) + '</div>';
      } else if(b.tipo === 'texto'){
        html += '<div class="tx">' + _esc((b.texto || '').slice(0, 40)) + '</div>';
      } else if(b.tipo === 'tag'){
        (b.tags || []).slice(0, 2).forEach(function(t){
          html += '<span class="tg">' + _esc(t.slice(0, 8)) + '</span>';
        });
      } else if(b.tipo === 'callout'){
        html += '<div class="tt" style="font-size:10px;">' + _esc((b.titulo || '').slice(0, 24)) + '</div>';
        html += '<div class="tx">' + _esc((b.descricao || '').slice(0, 38)) + '</div>';
      } else if(b.tipo === 'pillars'){
        html += '<div class="tx">' + (b.items || []).slice(0, 3).map(function(it){
          return '▪ ' + _esc((it.titulo || '').slice(0, 14));
        }).join(' · ') + '</div>';
      } else if(b.tipo === 'chevron'){
        html += '<div class="tx" style="color:#d4af37;">' + (b.items || []).map(function(it,i){
          return (i+1) + ' ▶ ' + _esc((it.titulo || '').slice(0, 8));
        }).join(' ') + '</div>';
      } else if(b.tipo === 'timeline-h'){
        html += '<div class="tx" style="color:#d4af37;">○━○━○━○ ' + (b.items || []).length + ' nós</div>';
      } else if(b.tipo === 'process-curved'){
        html += '<div class="tx" style="color:#d4af37;">↣ ' + (b.items || []).length + ' etapas curvas</div>';
      } else if(b.tipo === 'photo-grid'){
        html += '<div class="tx" style="color:#d4af37;">⫼ ' + (b.items || []).length + ' fotos</div>';
      } else if(b.tipo === 'big-stat'){
        html += '<div class="tt" style="font-size:18px;">' + _esc(b.valor || '') + '</div>';
        html += '<div class="tx">' + _esc((b.label || '').slice(0, 26)) + '</div>';
      } else if(b.tipo === 'mega-cta'){
        html += '<div class="tt" style="font-size:14px;font-style:italic;">' + _esc((b.texto || '').slice(0, 22)) + '</div>';
      } else if(b.tipo === 'hero-photo'){
        html += '<div class="ic">🖼</div>';
        html += '<div class="tt" style="text-align:center;">' + _esc((b.titulo || '').slice(0, 20)) + '</div>';
      } else if(b.tipo === 'half-photo'){
        html += '<div class="tx" style="color:#d4af37;">' + (b.lado === 'right' ? '◨' : '◧') + ' ' + _esc((b.titulo || '').slice(0, 18)) + '</div>';
      } else if(b.tipo === 'imagem'){
        html += '<div class="ic">🖼</div>';
      } else if(b.tipo === 'video'){
        html += '<div class="ic">▶</div>';
      } else if(b.tipo === 'cta'){
        html += '<div class="tg" style="background:rgba(200,240,90,.18);color:#c8f05a;">▶ ' + _esc((b.texto || '').slice(0, 16)) + '</div>';
      }
    });
    return html || '<div class="tx" style="opacity:.4;">(preview)</div>';
  }
  window._eapRemoverCard = function(idx){
    if(_apr.cards.length <= 1){ _toast('Não pode remover o último card', 'var(--amber,#fbbf24)'); return; }
    if(!confirm('Remover este card?')) return;
    _apr.cards.splice(idx, 1);
    if(_cardIdx >= _apr.cards.length) _cardIdx = _apr.cards.length - 1;
    _render();
    _agendarSave();
  };
  window._eapTrocarCard = function(idx){
    if(idx < 0 || idx >= _apr.cards.length) return;
    _cardIdx = idx;
    /* Limpa seleção de bloco ao trocar de card */
    if(_apr.cards[_cardIdx]) _apr.cards[_cardIdx]._selBlk = -1;
    _render();
  };

  /* ── Manipulação de blocos ─────────────────────────────────────── */
  window._eapAddBloco = function(tipo){
    var card = _apr.cards[_cardIdx];
    if(!card) return;
    if(!card.blocos) card.blocos = [];
    var novo = { tipo: tipo };
    /* Defaults · 5 tipos da Fase 1 */
    if(tipo === 'heading'){ novo.texto = ''; novo.nivel = 1; }
    else if(tipo === 'texto'){ novo.texto = ''; }
    else if(tipo === 'imagem'){ novo.url = ''; novo.alt = ''; }
    else if(tipo === 'video'){ novo.url = ''; }
    else if(tipo === 'cta'){ novo.texto = 'Clique aqui'; novo.href = ''; }
    /* Defaults · 11 tipos da Fase 2 */
    else if(tipo === 'tag'){ novo.tags = ['EQUIPE', 'CATEGORIA']; }
    else if(tipo === 'callout'){ novo.titulo = 'Propósito'; novo.descricao = 'Descrição do callout aqui.'; }
    else if(tipo === 'pillars'){
      novo.items = [
        { titulo: 'Pilar 1', descricao: 'Descrição curta do pilar.' },
        { titulo: 'Pilar 2', descricao: 'Descrição curta do pilar.' },
        { titulo: 'Pilar 3', descricao: 'Descrição curta do pilar.' }
      ];
    }
    else if(tipo === 'chevron'){
      novo.items = [
        { titulo: 'Execute', descricao: 'Primeira etapa.' },
        { titulo: 'Comunique', descricao: 'Segunda etapa.' },
        { titulo: 'Resolva', descricao: 'Terceira etapa.' }
      ];
    }
    else if(tipo === 'timeline-h'){
      novo.items = [
        { titulo: 'Etapa 1', descricao: 'Detalhe' },
        { titulo: 'Etapa 2', descricao: 'Detalhe' },
        { titulo: 'Etapa 3', descricao: 'Detalhe' },
        { titulo: 'Etapa 4', descricao: 'Detalhe' }
      ];
    }
    else if(tipo === 'process-curved'){
      novo.items = [
        { titulo: 'Visão', descricao: 'Definir propósito' },
        { titulo: 'Foco', descricao: 'Priorizar iniciativas' },
        { titulo: 'Estratégia', descricao: 'Planejar com critério' },
        { titulo: 'Execução', descricao: 'Implementar com ritmo' }
      ];
    }
    else if(tipo === 'photo-grid'){
      novo.items = [
        { titulo: 'Item 1', descricao: 'Descrição curta', imagem: '' },
        { titulo: 'Item 2', descricao: 'Descrição curta', imagem: '' },
        { titulo: 'Item 3', descricao: 'Descrição curta', imagem: '' }
      ];
    }
    else if(tipo === 'big-stat'){ novo.valor = '50+'; novo.label = 'Indicador'; novo.descricao = ''; }
    else if(tipo === 'mega-cta'){ novo.texto = 'Pode contar comigo.'; }
    else if(tipo === 'hero-photo'){ novo.imagem = ''; novo.badge = 'EQUIPE · CATEGORIA'; novo.titulo = 'Título da capa'; novo.subtitulo = 'Subtítulo elegante em italic.'; }
    else if(tipo === 'half-photo'){ novo.lado = 'left'; novo.imagem = ''; novo.titulo = 'Título do bloco'; novo.texto = 'Texto explicativo aqui.'; }

    card.blocos.push(novo);
    card._selBlk = card.blocos.length - 1;
    _render();
    _agendarSave();
    _fecharPopupBlocos();
  };

  /* ── Popup picker pra adicionar bloco ──────────────────────────── */
  window._eapAbrirPopupBlocos = function(){
    var pop = document.getElementById('eapBlkPopup');
    if(!pop){
      pop = document.createElement('div');
      pop.className = 'eap-blk-popup';
      pop.id = 'eapBlkPopup';
      pop.innerHTML = ''
        + '<input class="eap-blk-popup-search" id="eapBlkSearch" placeholder="Buscar bloco...">'
        + '<div class="eap-blk-popup-cat">📝 Texto & título</div>'
        + _popupItem('heading', '𝐇', 'Título', 'H1 ou H2 serif')
        + _popupItem('texto', '¶', 'Parágrafo', 'Texto corpo')
        + _popupItem('mega-cta', '𝓢', 'Mega-CTA', 'Texto serif gigante', 'gold')
        + '<div class="eap-blk-popup-cat">🎬 Mídia</div>'
        + _popupItem('imagem', '🖼', 'Imagem', 'URL externa')
        + _popupItem('video', '🎬', 'Vídeo', 'YouTube/Vimeo embed')
        + _popupItem('photo-grid', '⫼', 'Photo grid 3-col', 'Foto + título + texto', 'gold')
        + '<div class="eap-blk-popup-cat">⭐ Componentes Premium</div>'
        + _popupItem('tag', '🏷', 'Tag pill', 'Badges no topo do card', 'gold')
        + _popupItem('callout', '⫶', 'Callout gold', 'Borda dourada esquerda', 'gold')
        + _popupItem('pillars', '1⃣', 'Lista 01..N', 'Pilares numerados serif', 'gold')
        + _popupItem('chevron', '⇒', 'Chevron arrows', 'Setas numeradas', 'gold')
        + _popupItem('timeline-h', '⏳', 'Timeline horizontal', 'Nós alternados', 'gold')
        + _popupItem('process-curved', '↣', 'Process curvo', 'Etapas conectadas', 'gold')
        + _popupItem('big-stat', '50', 'Big stat', 'Número serif gigante', 'gold')
        + '<div class="eap-blk-popup-cat">🌃 Hero / Layout</div>'
        + _popupItem('hero-photo', '🌃', 'Hero foto-bg', 'Imagem + overlay escuro', 'gold')
        + _popupItem('half-photo', '⇿', 'Half-photo bleed', '50/50 foto até a borda', 'gold')
        + _popupItem('cta', '🔘', 'Botão CTA', 'Link ou ação');
      document.body.appendChild(pop);
      /* Bind search */
      setTimeout(function(){
        var s = document.getElementById('eapBlkSearch');
        if(s) s.addEventListener('input', function(){
          var q = this.value.toLowerCase();
          pop.querySelectorAll('.eap-blk-popup-item').forEach(function(it){
            var t = (it.querySelector('.eap-blk-popup-item-n').textContent + ' ' + it.querySelector('.eap-blk-popup-item-s').textContent).toLowerCase();
            it.style.display = t.indexOf(q) >= 0 ? '' : 'none';
          });
        });
      }, 50);
    }
    /* Posiciona perto do botão */
    var btn = document.getElementById('eapBtnAddBlk');
    if(btn){
      var r = btn.getBoundingClientRect();
      pop.style.left = Math.max(20, r.left - 150) + 'px';
      pop.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      pop.style.top = '';
    }
    pop.classList.add('show');
    var s = document.getElementById('eapBlkSearch');
    if(s){ s.value = ''; s.focus(); }
  };
  function _fecharPopupBlocos(){
    var p = document.getElementById('eapBlkPopup');
    if(p) p.classList.remove('show');
  }
  function _popupItem(tipo, icone, nome, desc, iconCls){
    return '<div class="eap-blk-popup-item" onclick="window._eapAddBloco(\'' + tipo + '\')">'
      + '<div class="eap-blk-popup-item-i ' + (iconCls || '') + '">' + icone + '</div>'
      + '<div><div class="eap-blk-popup-item-n">' + nome + '</div><div class="eap-blk-popup-item-s">' + desc + '</div></div>'
      + '</div>';
  }
  /* Fecha popup ao clicar fora */
  document.addEventListener('click', function(e){
    var pop = document.getElementById('eapBlkPopup');
    if(!pop || !pop.classList.contains('show')) return;
    if(pop.contains(e.target) || (e.target.closest && e.target.closest('#eapBtnAddBlk'))) return;
    _fecharPopupBlocos();
  });

  /* ═══════════════════════════════════════════════════════════════
     DRAG-AND-DROP · reordenar blocos (canvas) e cards (sidebar)
     ═══════════════════════════════════════════════════════════════ */
  var _dragSrcIdx = -1;       /* índice do bloco sendo arrastado */
  var _dragCardSrcIdx = -1;   /* índice do card sendo arrastado */

  /* Delegação de eventos no canvas pra drag de blocos */
  document.addEventListener('dragstart', function(e){
    var dragEl = e.target.closest && e.target.closest('.eap-blk-drag');
    if(dragEl){
      _dragSrcIdx = parseInt(dragEl.dataset.dragIdx, 10);
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setData('text/plain', 'blk'); }catch(_){}
      var blk = dragEl.closest('.eap-blk');
      if(blk) blk.classList.add('dragging');
      return;
    }
    /* Drag de card na sidebar */
    var thumb = e.target.closest && e.target.closest('.eap-thumb');
    if(thumb && thumb.parentNode && thumb.parentNode.id === 'eapSide'){
      var idx = Array.prototype.indexOf.call(thumb.parentNode.querySelectorAll('.eap-thumb'), thumb);
      _dragCardSrcIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
      try{ e.dataTransfer.setData('text/plain', 'card'); }catch(_){}
      thumb.classList.add('dragging');
    }
  });

  document.addEventListener('dragover', function(e){
    /* Drop line de blocos */
    if(_dragSrcIdx >= 0){
      var line = e.target.closest && e.target.closest('.eap-drop-line');
      if(line){
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.eap-drop-line').forEach(function(l){ l.classList.remove('active'); });
        line.classList.add('active');
      }
    }
    /* Drop em cards (sidebar) */
    if(_dragCardSrcIdx >= 0){
      var thumb = e.target.closest && e.target.closest('.eap-thumb');
      var side = document.getElementById('eapSide');
      if(thumb && side && side.contains(thumb)){
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }
    }
  });

  document.addEventListener('dragleave', function(e){
    /* Remove highlight se sai da drop zone */
    var line = e.target.closest && e.target.closest('.eap-drop-line');
    if(line && line.classList.contains('active')){
      /* só remove se não está entrando em outro lugar */
      setTimeout(function(){
        var ativo = document.querySelector('.eap-drop-line.active:hover');
        if(!ativo) line.classList.remove('active');
      }, 30);
    }
  });

  document.addEventListener('drop', function(e){
    /* Drop de bloco */
    if(_dragSrcIdx >= 0){
      var line = e.target.closest && e.target.closest('.eap-drop-line');
      if(line){
        e.preventDefault();
        var destIdx = parseInt(line.dataset.dropBefore, 10);
        _moverBlocoDragDrop(_dragSrcIdx, destIdx);
      }
    }
    /* Drop de card */
    if(_dragCardSrcIdx >= 0){
      var thumb = e.target.closest && e.target.closest('.eap-thumb');
      var side = document.getElementById('eapSide');
      if(thumb && side && side.contains(thumb)){
        e.preventDefault();
        var destIdx = Array.prototype.indexOf.call(side.querySelectorAll('.eap-thumb'), thumb);
        _moverCardDragDrop(_dragCardSrcIdx, destIdx);
      }
    }
    document.querySelectorAll('.eap-drop-line.active').forEach(function(l){ l.classList.remove('active'); });
    document.querySelectorAll('.eap-blk.dragging,.eap-thumb.dragging').forEach(function(b){ b.classList.remove('dragging'); });
    _dragSrcIdx = -1;
    _dragCardSrcIdx = -1;
  });

  document.addEventListener('dragend', function(){
    document.querySelectorAll('.eap-drop-line.active').forEach(function(l){ l.classList.remove('active'); });
    document.querySelectorAll('.eap-blk.dragging,.eap-thumb.dragging').forEach(function(b){ b.classList.remove('dragging'); });
    _dragSrcIdx = -1;
    _dragCardSrcIdx = -1;
  });

  function _moverBlocoDragDrop(src, dest){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos) return;
    if(src === dest || src + 1 === dest) return; /* nada a fazer */
    var bloco = card.blocos.splice(src, 1)[0];
    /* Se moveu de antes pra depois, ajusta o índice destino */
    var insertAt = dest > src ? dest - 1 : dest;
    card.blocos.splice(insertAt, 0, bloco);
    /* Atualiza seleção se aplicável */
    if(card._selBlk === src) card._selBlk = insertAt;
    _render();
    _agendarSave();
  }

  function _moverCardDragDrop(src, dest){
    if(src === dest || !_apr || !_apr.cards) return;
    var card = _apr.cards.splice(src, 1)[0];
    _apr.cards.splice(dest, 0, card);
    /* Ajusta cardIdx */
    if(_cardIdx === src) _cardIdx = dest;
    else if(src < _cardIdx && dest >= _cardIdx) _cardIdx--;
    else if(src > _cardIdx && dest <= _cardIdx) _cardIdx++;
    _render();
    _agendarSave();
  }

  /* ═══════════════════════════════════════════════════════════════
     SLASH COMMAND · digita "/" em qualquer textarea/input vazio
     dentro de um bloco pra abrir o menu de blocos
     ═══════════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', function(e){
    if(e.key !== '/') return;
    var t = e.target;
    if(!t || (t.tagName !== 'TEXTAREA' && t.tagName !== 'INPUT')) return;
    /* Só dentro de um bloco do editor */
    if(!t.closest || !t.closest('.eap-blk')) return;
    /* Só quando o input está vazio (slash no início) */
    if((t.value || '').length > 0) return;
    e.preventDefault();
    /* Posição do cursor no viewport */
    var rect = t.getBoundingClientRect();
    _abrirSlashCmd(rect.left, rect.top + rect.height + 4);
  });

  function _abrirSlashCmd(x, y){
    var sl = document.getElementById('eapSlashCmd');
    if(!sl){
      sl = document.createElement('div');
      sl.className = 'eap-slash';
      sl.id = 'eapSlashCmd';
      sl.innerHTML = ''
        + _slashItem('heading', '𝐇', 'Título', 'H1 ou H2 serif')
        + _slashItem('texto', '¶', 'Texto', 'Parágrafo')
        + _slashItem('callout', '⫶', 'Callout', 'Borda dourada', 'gold')
        + _slashItem('pillars', '1⃣', 'Lista Pilares', '01..N numerados', 'gold')
        + _slashItem('chevron', '⇒', 'Chevron arrows', 'Setas processuais', 'gold')
        + _slashItem('timeline-h', '⏳', 'Timeline horiz.', 'Linha + nós', 'gold')
        + _slashItem('process-curved', '↣', 'Process curvo', 'Etapas conectadas', 'gold')
        + _slashItem('photo-grid', '⫼', 'Photo grid 3-col', 'Foto + texto', 'gold')
        + _slashItem('big-stat', '50', 'Big stat', 'Número gigante', 'gold')
        + _slashItem('mega-cta', '𝓢', 'Mega-CTA', 'Serif italic', 'gold')
        + _slashItem('tag', '🏷', 'Tag pill', 'Badges topo', 'gold')
        + _slashItem('imagem', '🖼', 'Imagem', 'URL externa')
        + _slashItem('video', '🎬', 'Vídeo', 'YouTube/Vimeo')
        + _slashItem('hero-photo', '🌃', 'Hero foto-bg', 'Imagem + overlay', 'gold')
        + _slashItem('half-photo', '⇿', 'Half-photo', '50/50 bleed', 'gold')
        + _slashItem('cta', '🔘', 'Botão CTA', 'Link/ação');
      document.body.appendChild(sl);
      /* Marca o primeiro como curr */
      var primeiro = sl.querySelector('.eap-slash-item');
      if(primeiro) primeiro.classList.add('curr');
    }
    sl.style.left = Math.min(x, window.innerWidth - 300) + 'px';
    sl.style.top = Math.min(y, window.innerHeight - 290) + 'px';
    sl.classList.add('show');
  }
  function _slashItem(tipo, icone, nome, desc, iconCls){
    return '<div class="eap-slash-item" data-tipo="' + tipo + '" onclick="window._eapSlashAdd(\'' + tipo + '\')">'
      + '<div class="eap-slash-item-i ' + (iconCls || '') + '">' + icone + '</div>'
      + '<div><div class="eap-slash-item-n">' + nome + '</div><div class="eap-slash-item-s">' + desc + '</div></div>'
      + '</div>';
  }
  window._eapSlashAdd = function(tipo){
    _fecharSlash();
    /* Remove o bloco vazio atual se for um heading/texto sem conteúdo */
    var card = _apr.cards[_cardIdx];
    if(card && card.blocos && card._selBlk >= 0){
      var atual = card.blocos[card._selBlk];
      if(atual && (atual.tipo === 'heading' || atual.tipo === 'texto') && !atual.texto){
        card.blocos.splice(card._selBlk, 1);
      }
    }
    window._eapAddBloco(tipo);
  };
  function _fecharSlash(){
    var sl = document.getElementById('eapSlashCmd');
    if(sl) sl.classList.remove('show');
  }
  /* Fechar slash ao clicar fora ou ESC */
  document.addEventListener('click', function(e){
    var sl = document.getElementById('eapSlashCmd');
    if(!sl || !sl.classList.contains('show')) return;
    if(!sl.contains(e.target)) _fecharSlash();
  });
  document.addEventListener('keydown', function(e){
    var sl = document.getElementById('eapSlashCmd');
    if(!sl || !sl.classList.contains('show')) return;
    if(e.key === 'Escape'){ e.preventDefault(); _fecharSlash(); return; }
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      var items = sl.querySelectorAll('.eap-slash-item');
      var curr = sl.querySelector('.eap-slash-item.curr');
      var i = Array.prototype.indexOf.call(items, curr);
      var ni = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      if(curr) curr.classList.remove('curr');
      items[ni].classList.add('curr');
      items[ni].scrollIntoView({ block:'nearest' });
    } else if(e.key === 'Enter'){
      e.preventDefault();
      var curr = sl.querySelector('.eap-slash-item.curr');
      if(curr) curr.click();
    }
  });

  /* ═══════════════════════════════════════════════════════════════
     MARKDOWN SHORTCUTS · digita "# " ou "## " ou "> " ou "- " no
     começo de um input vazio pra converter o bloco no tipo
     correspondente automaticamente
     ═══════════════════════════════════════════════════════════════ */
  document.addEventListener('input', function(e){
    var t = e.target;
    if(!t || (t.tagName !== 'TEXTAREA' && t.tagName !== 'INPUT')) return;
    if(!t.closest || !t.closest('.eap-blk')) return;
    var val = t.value;
    if(val === '# '){ _converterBlocoAtual('heading', 1); t.value = ''; }
    else if(val === '## '){ _converterBlocoAtual('heading', 2); t.value = ''; }
    else if(val === '> '){ _converterBlocoAtual('callout'); t.value = ''; }
    else if(val === '* ' || val === '- '){ _converterBlocoAtual('pillars'); t.value = ''; }
  });

  function _converterBlocoAtual(tipo, nivel){
    var card = _apr.cards[_cardIdx];
    if(!card || card._selBlk < 0) return;
    var atual = card.blocos[card._selBlk];
    if(!atual) return;
    /* Reseta o bloco mantendo posição */
    if(tipo === 'heading') card.blocos[card._selBlk] = { tipo: 'heading', texto: '', nivel: nivel || 1 };
    else if(tipo === 'callout') card.blocos[card._selBlk] = { tipo: 'callout', titulo: '', descricao: '' };
    else if(tipo === 'pillars') card.blocos[card._selBlk] = { tipo: 'pillars', items: [{ titulo: '', descricao: '' }] };
    _render();
    _agendarSave();
  }
  window._eapRemoverBloco = function(idx){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos) return;
    card.blocos.splice(idx, 1);
    if(card._selBlk === idx) card._selBlk = -1;
    _render();
    _agendarSave();
  };
  window._eapDuplicarBloco = function(idx){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos[idx]) return;
    var clone = JSON.parse(JSON.stringify(card.blocos[idx]));
    card.blocos.splice(idx + 1, 0, clone);
    _render();
    _agendarSave();
  };
  window._eapMoverBloco = function(idx, delta){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos) return;
    var novo = idx + delta;
    if(novo < 0 || novo >= card.blocos.length) return;
    var tmp = card.blocos[idx];
    card.blocos[idx] = card.blocos[novo];
    card.blocos[novo] = tmp;
    if(card._selBlk === idx) card._selBlk = novo;
    _render();
    _agendarSave();
  };
  window._eapEditarNotasCard = function(valor){
    var card = _apr.cards[_cardIdx];
    if(!card) return;
    card.notas = valor;
    _agendarSave();
  };
  window._eapEditarBloco = function(idx, campo, valor){
    var card = _apr.cards[_cardIdx];
    if(!card || !card.blocos[idx]) return;
    card.blocos[idx][campo] = valor;
    _agendarSave();
    /* Pra imagem/video: re-render imediato para mostrar preview */
    if(campo === 'url' && (card.blocos[idx].tipo === 'imagem' || card.blocos[idx].tipo === 'video')){
      /* debounce: só re-renderiza após 400ms de inatividade pra não piscar a cada letra */
      clearTimeout(window._eapRerenderTimer);
      window._eapRerenderTimer = setTimeout(function(){ _renderCanvas(); }, 400);
    } else if(campo === 'texto' || campo === 'href' || campo === 'alt'){
      _renderSidebar(); /* atualiza thumbnail preview */
    } else {
      _render();
    }
  };
  window._eapSelBloco = function(idx){
    var card = _apr.cards[_cardIdx];
    if(!card) return;
    card._selBlk = idx;
    /* Marca visualmente sem re-render completo */
    document.querySelectorAll('.eap-blk').forEach(function(el){
      el.classList.toggle('sel', parseInt(el.dataset.idx, 10) === idx);
    });
    _renderRight();
  };

  /* ── Título da apresentação ────────────────────────────────────── */
  window._eapTitulo = function(val){
    if(!_apr) return;
    _apr.titulo = val;
    _agendarSave();
  };

  /* ── Tema visual (Black Tie / Black & Gold) ─────────────────── */
  window._eapTrocarTema = function(tema){
    if(!_apr) return;
    _apr.tema = tema;
    _renderCanvas();
    _agendarSave();
    _toast('🎨 Tema alterado para ' + (tema === 'black-gold' ? 'Black & Gold' : 'Black Tie'));
  };

  /* ── Save · auto + manual ──────────────────────────────────────── */
  function _agendarSave(){
    _statusSave('salvando');
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function(){ _salvar(); }, 800);
  }
  function _statusSave(estado){
    var s = document.getElementById('eapSav');
    if(!s) return;
    if(estado === 'salvando'){ s.textContent = '💾 Salvando...'; s.classList.add('salvando'); }
    else { s.textContent = '💾 Salvo'; s.classList.remove('salvando'); }
  }
  function _salvar(){
    if(!_apr || !_apr.id) return;
    _apr.atualizadoEm = new Date().toISOString();
    /* Limpa _selBlk antes de salvar (campo só de UI) */
    var clone = JSON.parse(JSON.stringify(_apr));
    clone.cards.forEach(function(c){ delete c._selBlk; });
    if(typeof window._fbSet === 'function'){
      /* 1) Conteúdo completo no namespace apresentacoes/ */
      window._fbSet('treinamentos/apresentacoes/' + _apr.id, clone);
      /* 2) Metadata em adicionados/ pra aparecer no painel Treinamentos/Apresentações */
      var primeiraHeading = '';
      var primeiroTexto = '';
      if(clone.cards[0] && clone.cards[0].blocos){
        clone.cards[0].blocos.forEach(function(b){
          if(!primeiraHeading && b.tipo === 'heading') primeiraHeading = b.texto || '';
          if(!primeiroTexto && b.tipo === 'texto') primeiroTexto = b.texto || '';
        });
      }
      var qtdBlocos = clone.cards.reduce(function(s, c){ return s + ((c.blocos && c.blocos.length) || 0); }, 0);
      var metadata = {
        id: _apr.id,
        titulo: _apr.titulo || 'Apresentação sem título',
        descricao: (primeiroTexto || primeiraHeading || 'Apresentação criada no editor visual').slice(0, 160),
        produto: _apr.produto || 'Geral',
        tipo: 'apresentacao',
        status: 'publicado',
        novo: true,
        ordem: 100,
        url: '__editor:' + _apr.id,  /* URL especial → 52 chama abrirEditorApresentacao */
        icone: '📐',
        origem: 'editor',
        qtdCards: clone.cards.length,
        qtdBlocos: qtdBlocos,
        tema: _apr.tema || 'black-tie',
        criadoEm: _apr.criadoEm,
        atualizadoEm: _apr.atualizadoEm
      };
      window._fbSet('treinamentos/adicionados/' + _apr.id, metadata);
    }
    _statusSave('salvo');
  }
  window._eapSalvar = function(){
    _salvar();
    _toast('✓ Apresentação salva');
  };

  /* ── Modo Apresentar ───────────────────────────────────────────── */
  window._eapApresentar = function(){
    if(!_apr || !_apr.cards.length){ _toast('Adicione pelo menos um card', 'var(--amber,#fbbf24)'); return; }
    _slideIdx = _cardIdx; /* começa pelo card atualmente selecionado */
    _modoApresentar = true;
    _buildShow();
    var show = document.getElementById('eapShow');
    show.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  window._eapFecharApresentacao = function(){
    _modoApresentar = false;
    var show = document.getElementById('eapShow');
    show.classList.remove('active');
    document.body.style.overflow = '';
    if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch(e){} }
    /* Para timer e auto-advance */
    _pararTimerApresentacao();
    if(_autoOn) _pararAutoAdvance();
    /* Reseta estado das ferramentas pra próxima sessão */
    _destaqueOn = false; _destaqueItems = []; _destaqueIdx = 0;
    _canetaOn = false; _drawHistory = []; _drawCtx = null;
    _blackOn = false; _whiteOn = false;
    _overviewOn = false; _notesOn = false;
  };

  function _buildShow(){
    var show = document.getElementById('eapShow');
    if(!show) return;
    /* Render slides como clones dos cards (mas read-only) */
    var slidesHtml = _apr.cards.map(function(card, i){
      var inner = '';
      (card.blocos || []).forEach(function(b){
        inner += _renderBlocoApresentacao(b);
      });
      if(!inner) inner = '<div style="text-align:center;color:rgba(255,255,255,.3);padding:60px;">Card vazio</div>';
      var tema = _apr.tema || 'black-tie';
      return '<div class="eap-show-slide' + (i === _slideIdx ? ' curr' : '') + '"><div class="eap-card" data-tema="' + tema + '">' + inner + '</div></div>';
    }).join('');

    var dotsHtml = _apr.cards.map(function(_, i){
      return '<span class="eap-show-dot' + (i === _slideIdx ? ' curr' : '') + '" onclick="window._eapIrSlide(' + i + ')"></span>';
    }).join('');

    show.innerHTML = ''
      /* Barra de progresso do auto-advance */
      + '<div class="eap-show-progress" id="eapShowProgress"><div class="eap-show-progress-bar" id="eapShowProgressBar"></div></div>'
      /* Top bar com timer + botões de ferramentas */
      + '<div class="eap-show-top">'
      +   '<div class="eap-show-t">🎯 ' + _esc(_apr.titulo || 'Apresentação') + '</div>'
      +   '<div class="eap-show-timer"><span class="dot"></span><span id="eapShowTime">00:00</span></div>'
      +   '<button class="eap-show-btn" onclick="window._eapToggleAuto()" id="eapBtnAuto" title="Auto-avanço">⏵ Auto</button>'
      +   '<button class="eap-show-btn" onclick="window._eapToggleOverview()" title="O · Visão geral">▦ Overview</button>'
      +   '<button class="eap-show-btn" onclick="window._eapToggleNotes()" title="N · Notas do palestrante">📝 Notas</button>'
      +   '<button class="eap-show-btn" onclick="window._eapToggleDest()" id="eapBtnDest" title="S · Destaque (revelação progressiva)">🔦 Destaque</button>'
      +   '<button class="eap-show-btn" onclick="window._eapToggleDraw()" id="eapBtnCaneta" title="L · Caneta">✏ Caneta</button>'
      +   '<button class="eap-show-btn" onclick="window._eapToggleFs()" title="F · Tela cheia">⛶</button>'
      +   '<button class="eap-show-btn" onclick="window._eapFecharApresentacao()" title="ESC">✕</button>'
      + '</div>'
      + '<button class="eap-show-arrow left" id="eapShowPrev" onclick="window._eapNavSlide(-1)">‹</button>'
      + '<button class="eap-show-arrow right" id="eapShowNext" onclick="window._eapNavSlide(1)">›</button>'
      + '<div class="eap-show-stage">' + slidesHtml + '</div>'
      /* Overview · grade de slides (oculto inicialmente) */
      + '<div class="eap-show-overview" id="eapShowOverview"></div>'
      /* Painel de notas do palestrante (oculto inicialmente) */
      + '<div class="eap-show-notes" id="eapShowNotes">'
      +   '<div class="eap-notes-h"><span>📝 Notas do palestrante</span><button onclick="window._eapToggleNotes()">✕</button></div>'
      +   '<div class="eap-notes-b" id="eapNotesBody"></div>'
      + '</div>'
      /* Contador da revelação progressiva */
      + '<div class="eap-dest-counter" id="eapDestCounter"></div>'
      /* Canvas da caneta */
      + '<canvas class="eap-show-draw" id="eapShowDraw"></canvas>'
      /* Toolbar da caneta */
      + '<div class="eap-draw-tools" id="eapDrawTools">'
      +   '<div class="eap-draw-grp">'
      +     '<button class="eap-draw-btn on" data-mode="pen" title="Caneta (P)">✏</button>'
      +     '<button class="eap-draw-btn" data-mode="highlight" title="Marca-texto (H)">🖍</button>'
      +     '<button class="eap-draw-btn" data-mode="erase" title="Borracha (E)">🧽</button>'
      +   '</div>'
      +   '<div class="eap-draw-sep"></div>'
      +   '<div style="display:flex;gap:6px;align-items:center;">'
      +     '<div class="eap-draw-color on" data-color="#c8f05a" style="background:#c8f05a;" title="Lima"></div>'
      +     '<div class="eap-draw-color" data-color="#f0c896" style="background:#f0c896;" title="Dourado"></div>'
      +     '<div class="eap-draw-color" data-color="#ef4444" style="background:#ef4444;" title="Vermelho"></div>'
      +     '<div class="eap-draw-color" data-color="#60a5fa" style="background:#60a5fa;" title="Azul"></div>'
      +     '<div class="eap-draw-color" data-color="#a78bfa" style="background:#a78bfa;" title="Roxo"></div>'
      +     '<div class="eap-draw-color" data-color="#ffffff" style="background:#fff;" title="Branco"></div>'
      +   '</div>'
      +   '<div class="eap-draw-sep"></div>'
      +   '<div style="display:flex;gap:2px;align-items:center;">'
      +     '<div class="eap-draw-thick t1" data-thick="2" title="Fina"><div class="eap-draw-thick-dot"></div></div>'
      +     '<div class="eap-draw-thick t2 on" data-thick="4" title="Média"><div class="eap-draw-thick-dot"></div></div>'
      +     '<div class="eap-draw-thick t3" data-thick="8" title="Grossa"><div class="eap-draw-thick-dot"></div></div>'
      +     '<div class="eap-draw-thick t4" data-thick="14" title="Extra grossa"><div class="eap-draw-thick-dot"></div></div>'
      +   '</div>'
      +   '<div class="eap-draw-sep"></div>'
      +   '<div class="eap-draw-grp">'
      +     '<button class="eap-draw-btn" onclick="window._eapDrawUndo()" title="Desfazer (Ctrl+Z)">↶</button>'
      +     '<button class="eap-draw-btn" onclick="window._eapDrawClear()" title="Limpar (C)">🗑</button>'
      +     '<button class="eap-draw-btn" onclick="window._eapToggleDraw()" title="Fechar (L)" style="color:rgba(255,255,255,.5);">✕</button>'
      +   '</div>'
      + '</div>'
      /* Blackout / Whiteout */
      + '<div class="eap-show-color-ov" id="eapColorOv"></div>'
      /* Bottom nav */
      + '<div class="eap-show-nav">'
      +   '<div class="eap-show-dots">' + dotsHtml + '</div>'
      +   '<div class="eap-show-counter"><b id="eapShowPos">' + (_slideIdx + 1) + '</b> / ' + _apr.cards.length + '</div>'
      + '</div>';

    _atualizarBotoes();
    _bindDrawTools();
    _iniciarTimerApresentacao();
  }

  function _renderBlocoApresentacao(b){
    if(b.tipo === 'heading'){
      var tag = (b.nivel === 2) ? 'h2' : 'h1';
      var cls = (b.nivel === 2) ? 'eap-h2-input' : 'eap-h1-input';
      return '<' + tag + ' class="' + cls + '" style="margin:0 0 14px;">' + _esc(b.texto || '') + '</' + tag + '>';
    }
    if(b.tipo === 'texto'){
      return '<p class="eap-p-input" style="margin:0 0 14px;white-space:pre-wrap;">' + _esc(b.texto || '') + '</p>';
    }
    if(b.tipo === 'imagem'){
      if(!b.url) return '';
      return '<div class="eap-img-wrap" style="margin-bottom:14px;"><img src="' + _esc(b.url) + '" alt="' + _esc(b.alt || '') + '"></div>';
    }
    if(b.tipo === 'video'){
      if(!b.url) return '';
      return '<div class="eap-video-wrap" style="margin-bottom:14px;"><iframe src="' + _esc(_embedUrl(b.url)) + '" allowfullscreen></iframe></div>';
    }
    if(b.tipo === 'cta'){
      var href = b.href ? _esc(b.href) : '#';
      return '<div class="eap-cta-wrap"><a class="eap-cta-btn" href="' + href + '" target="_blank" rel="noopener" style="text-decoration:none;">' + _esc(b.texto || 'Clique aqui') + '</a></div>';
    }

    /* ───── Fase 2 · render em apresentação ───── */
    if(b.tipo === 'tag'){
      var tags = b.tags || [];
      return '<div class="eap-blk-tags" style="margin-bottom:14px;">'
        + tags.map(function(t){ return '<span class="tag">' + _esc(t) + '</span>'; }).join('')
        + '</div>';
    }
    if(b.tipo === 'callout'){
      return '<div class="eap-blk-callout" style="margin-bottom:14px;">'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:18px;font-style:italic;color:#d4af37;margin-bottom:6px;">' + _esc(b.titulo || '') + '</div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,.85);">' + _esc(b.descricao || '') + '</div>'
        + '</div>';
    }
    if(b.tipo === 'pillars'){
      var items = b.items || [];
      return '<div class="eap-blk-pillars" style="margin-bottom:14px;">'
        + items.map(function(it, i){
            return '<div class="eap-blk-pillar">'
              + '<div class="pn">' + String(i + 1).padStart(2, '0') + '</div>'
              + '<div class="pl"></div>'
              + '<div style="font-family:\'Playfair Display\',serif;font-size:20px;color:#d4af37;">' + _esc(it.titulo || '') + '</div>'
              + '<div style="font-size:13px;color:rgba(255,255,255,.7);margin-top:2px;">' + _esc(it.descricao || '') + '</div>'
              + '</div>';
          }).join('')
        + '</div>';
    }
    if(b.tipo === 'chevron'){
      var items = b.items || [];
      var cores = ['', 'silver', 'dark'];
      return '<div style="margin-bottom:14px;">'
        + '<div class="eap-blk-chevs">'
        + items.map(function(it, i){
            return '<div class="eap-blk-chev ' + (cores[i] || '') + '"><div class="eap-blk-chev-n">' + (i + 1) + '</div></div>';
          }).join('')
        + '</div>'
        + '<div class="eap-blk-chev-row">'
        + items.map(function(it){
            return '<div class="eap-blk-chev-lbl">'
              + '<div style="font-family:\'Playfair Display\',serif;font-size:16px;color:#d4af37;">' + _esc(it.titulo || '') + '</div>'
              + '<div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:2px;">' + _esc(it.descricao || '') + '</div>'
              + '</div>';
          }).join('')
        + '</div></div>';
    }
    if(b.tipo === 'timeline-h'){
      var items = b.items || [];
      return '<div class="eap-blk-htime" style="margin-bottom:14px;">'
        + '<div class="eap-blk-htime-line"></div>'
        + '<div class="eap-blk-htime-nodes">'
        + items.map(function(it, i){
            var acima = (i % 2 === 0);
            var content = '<div style="font-family:\'Playfair Display\',serif;font-size:16px;color:#d4af37;">' + _esc(it.titulo || '') + '</div>'
              + '<div style="font-size:10px;color:rgba(255,255,255,.7);">' + _esc(it.descricao || '') + '</div>';
            return '<div class="eap-blk-htime-node">'
              + (acima ? '<div class="eap-blk-htime-above">' + content + '</div>' : '')
              + '<div class="eap-blk-htime-num">' + (i + 1) + '</div>'
              + (!acima ? '<div class="eap-blk-htime-below">' + content + '</div>' : '')
              + '</div>';
          }).join('')
        + '</div></div>';
    }
    if(b.tipo === 'process-curved'){
      var items = b.items || [];
      var svg = '<svg class="eap-blk-curved-svg" viewBox="0 0 400 50" preserveAspectRatio="none">'
        + '<path d="M 50 25 Q 100 -10 150 25 Q 200 60 250 25 Q 300 -10 350 25" fill="none" stroke="#d4af37" stroke-width="2" opacity=".7"/>'
        + '</svg>';
      return '<div class="eap-blk-curved" style="margin-bottom:14px;">'
        + svg
        + items.map(function(it){
            return '<div class="eap-blk-curved-node">'
              + '<div style="font-family:\'Playfair Display\',serif;font-size:18px;color:#d4af37;margin-bottom:4px;">' + _esc(it.titulo || '') + '</div>'
              + '<div style="font-size:11px;color:rgba(255,255,255,.75);">' + _esc(it.descricao || '') + '</div>'
              + '</div>';
          }).join('')
        + '</div>';
    }
    if(b.tipo === 'photo-grid'){
      var items = b.items || [];
      return '<div class="eap-blk-pgrid" style="margin-bottom:14px;">'
        + items.map(function(it){
            var thumb = it.imagem
              ? '<img src="' + _esc(it.imagem) + '">'
              : '🖼';
            return '<div class="eap-blk-pcol">'
              + '<div class="eap-blk-pthumb">' + thumb + '</div>'
              + '<div class="eap-blk-pcol-c">'
              + '<div style="font-family:\'Playfair Display\',serif;font-size:16px;color:#d4af37;margin-bottom:3px;">' + _esc(it.titulo || '') + '</div>'
              + '<div style="font-size:12px;color:rgba(255,255,255,.7);">' + _esc(it.descricao || '') + '</div>'
              + '</div></div>';
          }).join('')
        + '</div>';
    }
    if(b.tipo === 'big-stat'){
      return '<div class="eap-blk-bigstat" style="margin-bottom:14px;">'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:80px;color:rgba(255,255,255,.85);line-height:1;">' + _esc(b.valor || '') + '</div>'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:18px;color:#d4af37;font-style:italic;margin:4px 0;">' + _esc(b.label || '') + '</div>'
        + (b.descricao ? '<div style="font-size:12px;color:rgba(255,255,255,.6);">' + _esc(b.descricao) + '</div>' : '')
        + '</div>';
    }
    if(b.tipo === 'mega-cta'){
      return '<div style="font-family:\'Playfair Display\',serif;font-size:64px;font-style:italic;color:#d4af37;line-height:1.05;text-align:center;padding:30px 0;margin-bottom:14px;">' + _esc(b.texto || '') + '</div>';
    }
    if(b.tipo === 'hero-photo'){
      var bgStyle = b.imagem
        ? 'background-image:linear-gradient(180deg,rgba(10,14,26,.4),rgba(10,14,26,.85)),url(' + _esc(b.imagem) + ');background-size:cover;background-position:center;'
        : 'background:linear-gradient(135deg,#2a1a3a 0%,#532b6c 50%,#1a1a2e 100%);';
      return '<div class="eap-blk-herobg" style="margin-bottom:14px;' + bgStyle + '">'
        + (b.badge ? '<div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:.2em;color:#d4af37;margin-bottom:14px;">' + _esc(b.badge) + '</div>' : '')
        + '<div style="font-family:\'Playfair Display\',serif;font-size:40px;font-weight:700;color:#d4af37;line-height:1.05;margin:0 0 8px;">' + _esc(b.titulo || '') + '</div>'
        + (b.subtitulo ? '<div style="font-family:\'Playfair Display\',serif;font-size:20px;font-style:italic;color:rgba(255,255,255,.8);">' + _esc(b.subtitulo) + '</div>' : '')
        + '</div>';
    }
    if(b.tipo === 'half-photo'){
      var img = b.imagem ? '<img src="' + _esc(b.imagem) + '">' : '<span style="z-index:2;color:rgba(255,255,255,.4);font-size:32px;">🖼</span>';
      var photo = '<div class="eap-blk-half-photo">' + img + '</div>';
      var content = '<div class="eap-blk-half-content">'
        + '<div style="font-family:\'Playfair Display\',serif;font-size:28px;color:#d4af37;margin:0 0 8px;">' + _esc(b.titulo || '') + '</div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,.85);line-height:1.6;">' + _esc(b.texto || '') + '</div>'
        + '</div>';
      return '<div class="eap-blk-half" style="margin-bottom:14px;">' + (b.lado === 'right' ? content + photo : photo + content) + '</div>';
    }
    return '';
  }

  function _navSlide(delta){
    /* Se Destaque está ativo e ainda há itens pra revelar, avança a revelação primeiro */
    if(_destaqueOn && delta > 0 && _destaqueIdx < _destaqueItems.length){
      _revelarProximo();
      return;
    }
    /* Se voltar com Destaque ativo, esconde o último item revelado antes de pular slide */
    if(_destaqueOn && delta < 0 && _destaqueIdx > 0){
      _destaqueIdx--;
      var item = _destaqueItems[_destaqueIdx];
      if(item){
        item.classList.remove('dest-revealed');
        item.classList.add('dest-hidden');
      }
      _atualizarContadorDest();
      return;
    }
    _irSlide(_slideIdx + delta);
  }
  function _irSlide(idx){
    if(idx < 0 || idx >= _apr.cards.length) return;
    var slides = document.querySelectorAll('.eap-show-slide');
    var dots = document.querySelectorAll('.eap-show-dot');
    slides.forEach(function(s, i){
      s.classList.remove('curr', 'prev-exit');
      if(i === idx) s.classList.add('curr');
      else if(i < idx) s.classList.add('prev-exit');
    });
    dots.forEach(function(d, i){ d.classList.toggle('curr', i === idx); });
    var p = document.getElementById('eapShowPos');
    if(p) p.textContent = idx + 1;
    _slideIdx = idx;
    _atualizarBotoes();
    /* Limpa caneta entre slides (cada slide tem suas próprias linhas) */
    _drawHistory = [];
    if(_canetaOn) _drawClear();
    /* Reaplica destaque ao slide atual se estiver ativo */
    if(_destaqueOn) _prepararDestaqueSlideAtual();
    /* Atualiza notas do palestrante */
    if(_notesOn) _renderNotesPanel();
    /* Reseta cronômetro do auto-advance pro próximo segmento */
    if(_autoOn) _resetAutoSegmento();
  }
  window._eapNavSlide = _navSlide;
  window._eapIrSlide = _irSlide;
  function _atualizarBotoes(){
    var p = document.getElementById('eapShowPrev');
    var n = document.getElementById('eapShowNext');
    if(p) p.disabled = (_slideIdx === 0);
    if(n) n.disabled = (_slideIdx === _apr.cards.length - 1);
  }
  window._eapToggleFs = function(){
    if(!document.fullscreenElement){
      try{ document.getElementById('eapShow').requestFullscreen(); }catch(e){}
    } else {
      try{ document.exitFullscreen(); }catch(e){}
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     FASE 4 · TIMER + AUTO-ADVANCE
     ═══════════════════════════════════════════════════════════════ */
  function _iniciarTimerApresentacao(){
    _showStartTime = Date.now();
    if(_timerInterval) clearInterval(_timerInterval);
    _timerInterval = setInterval(function(){
      var el = document.getElementById('eapShowTime');
      if(!el) return;
      var s = Math.floor((Date.now() - _showStartTime) / 1000);
      var m = Math.floor(s / 60);
      var ss = s % 60;
      el.textContent = (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
    }, 1000);
  }
  function _pararTimerApresentacao(){
    if(_timerInterval){ clearInterval(_timerInterval); _timerInterval = null; }
  }

  window._eapToggleAuto = function(){
    var btn = document.getElementById('eapBtnAuto');
    if(_autoOn){
      _pararAutoAdvance();
      if(btn){ btn.classList.remove('on'); btn.innerHTML = '⏵ Auto'; }
      return;
    }
    var resp = prompt('Auto-avanço · segundos por slide:', _autoSeg || 8);
    var seg = parseInt(resp, 10);
    if(!seg || seg < 1){ return; }
    _autoSeg = seg;
    _autoOn = true;
    if(btn){ btn.classList.add('on'); btn.innerHTML = '⏸ Auto (' + seg + 's)'; }
    var prog = document.getElementById('eapShowProgress');
    if(prog) prog.classList.add('show');
    _resetAutoSegmento();
  };
  function _resetAutoSegmento(){
    _autoStart = Date.now();
    if(_autoTimer){ clearTimeout(_autoTimer); _autoTimer = null; }
    if(_autoRAF){ cancelAnimationFrame(_autoRAF); _autoRAF = null; }
    /* Próximo slide depois de _autoSeg segundos */
    _autoTimer = setTimeout(function(){
      if(!_autoOn) return;
      if(_slideIdx >= _apr.cards.length - 1){
        /* Acabou — para o auto */
        window._eapToggleAuto();
        return;
      }
      _navSlide(1);
    }, _autoSeg * 1000);
    /* Anima a barra de progresso */
    var bar = document.getElementById('eapShowProgressBar');
    if(bar){
      bar.style.width = '0%';
      var tick = function(){
        if(!_autoOn) return;
        var pct = Math.min(100, ((Date.now() - _autoStart) / (_autoSeg * 1000)) * 100);
        bar.style.width = pct + '%';
        if(pct < 100) _autoRAF = requestAnimationFrame(tick);
      };
      _autoRAF = requestAnimationFrame(tick);
    }
  }
  function _pararAutoAdvance(){
    _autoOn = false;
    if(_autoTimer){ clearTimeout(_autoTimer); _autoTimer = null; }
    if(_autoRAF){ cancelAnimationFrame(_autoRAF); _autoRAF = null; }
    var prog = document.getElementById('eapShowProgress');
    if(prog) prog.classList.remove('show');
    var bar = document.getElementById('eapShowProgressBar');
    if(bar) bar.style.width = '0%';
  }

  /* ═══════════════════════════════════════════════════════════════
     FASE 4 · CANETA (canvas drawing)
     ═══════════════════════════════════════════════════════════════ */
  function _bindDrawTools(){
    var tb = document.getElementById('eapDrawTools');
    if(!tb) return;
    /* Modos */
    tb.querySelectorAll('.eap-draw-btn[data-mode]').forEach(function(btn){
      btn.onclick = function(){
        tb.querySelectorAll('.eap-draw-btn[data-mode]').forEach(function(b){ b.classList.remove('on'); });
        btn.classList.add('on');
        _drawMode = btn.getAttribute('data-mode');
      };
    });
    /* Cores */
    tb.querySelectorAll('.eap-draw-color').forEach(function(c){
      c.onclick = function(){
        tb.querySelectorAll('.eap-draw-color').forEach(function(b){ b.classList.remove('on'); });
        c.classList.add('on');
        _drawColor = c.getAttribute('data-color');
      };
    });
    /* Espessuras */
    tb.querySelectorAll('.eap-draw-thick').forEach(function(t){
      t.onclick = function(){
        tb.querySelectorAll('.eap-draw-thick').forEach(function(b){ b.classList.remove('on'); });
        t.classList.add('on');
        _drawThick = parseInt(t.getAttribute('data-thick'), 10) || 4;
      };
    });
  }

  function _setupCanvas(){
    var canvas = document.getElementById('eapShowDraw');
    if(!canvas) return null;
    var show = document.getElementById('eapShow');
    var rect = show.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    var ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    _drawCtx = ctx;
    /* Re-renderiza histórico (resize-safe) */
    _redrawHistory();
    return canvas;
  }

  function _redrawHistory(){
    if(!_drawCtx) return;
    var c = document.getElementById('eapShowDraw');
    _drawCtx.clearRect(0, 0, c.width, c.height);
    _drawHistory.forEach(function(path){
      _drawCtx.globalCompositeOperation = (path.mode === 'erase') ? 'destination-out' : 'source-over';
      _drawCtx.strokeStyle = path.color;
      _drawCtx.lineWidth = path.thick;
      _drawCtx.globalAlpha = (path.mode === 'highlight') ? 0.4 : 1;
      _drawCtx.beginPath();
      path.points.forEach(function(p, i){
        if(i === 0) _drawCtx.moveTo(p.x, p.y);
        else _drawCtx.lineTo(p.x, p.y);
      });
      _drawCtx.stroke();
    });
    _drawCtx.globalAlpha = 1;
    _drawCtx.globalCompositeOperation = 'source-over';
  }

  window._eapToggleDraw = function(){
    _canetaOn = !_canetaOn;
    var canvas = document.getElementById('eapShowDraw');
    var tb = document.getElementById('eapDrawTools');
    var btn = document.getElementById('eapBtnCaneta');
    if(_canetaOn){
      _setupCanvas();
      if(canvas) canvas.classList.add('active');
      if(tb) tb.classList.add('show');
      if(btn) btn.classList.add('on');
      _attachDrawEvents(canvas);
    } else {
      if(canvas) canvas.classList.remove('active');
      if(tb) tb.classList.remove('show');
      if(btn) btn.classList.remove('on');
      _detachDrawEvents(canvas);
    }
  };

  function _getPos(canvas, e){
    var r = canvas.getBoundingClientRect();
    var t = e.touches && e.touches[0];
    var cx = (t ? t.clientX : e.clientX) - r.left;
    var cy = (t ? t.clientY : e.clientY) - r.top;
    return { x: cx, y: cy };
  }
  var _onDrawStart, _onDrawMove, _onDrawEnd;
  function _attachDrawEvents(canvas){
    if(!canvas) return;
    _onDrawStart = function(e){
      e.preventDefault();
      _drawing = true;
      var p = _getPos(canvas, e);
      _drawPath = { mode: _drawMode, color: _drawColor, thick: _drawThick, points: [p] };
    };
    _onDrawMove = function(e){
      if(!_drawing) return;
      e.preventDefault();
      var p = _getPos(canvas, e);
      _drawPath.points.push(p);
      /* Desenha incrementalmente o último segmento */
      var pts = _drawPath.points;
      var a = pts[pts.length - 2], b = pts[pts.length - 1];
      _drawCtx.globalCompositeOperation = (_drawPath.mode === 'erase') ? 'destination-out' : 'source-over';
      _drawCtx.strokeStyle = _drawPath.color;
      _drawCtx.lineWidth = _drawPath.thick;
      _drawCtx.globalAlpha = (_drawPath.mode === 'highlight') ? 0.4 : 1;
      _drawCtx.beginPath();
      _drawCtx.moveTo(a.x, a.y);
      _drawCtx.lineTo(b.x, b.y);
      _drawCtx.stroke();
      _drawCtx.globalAlpha = 1;
      _drawCtx.globalCompositeOperation = 'source-over';
    };
    _onDrawEnd = function(){
      if(!_drawing) return;
      _drawing = false;
      if(_drawPath && _drawPath.points.length > 1){
        _drawHistory.push(_drawPath);
      }
      _drawPath = null;
    };
    canvas.addEventListener('mousedown', _onDrawStart);
    canvas.addEventListener('mousemove', _onDrawMove);
    canvas.addEventListener('mouseup', _onDrawEnd);
    canvas.addEventListener('mouseleave', _onDrawEnd);
    canvas.addEventListener('touchstart', _onDrawStart, { passive: false });
    canvas.addEventListener('touchmove', _onDrawMove, { passive: false });
    canvas.addEventListener('touchend', _onDrawEnd);
  }
  function _detachDrawEvents(canvas){
    if(!canvas || !_onDrawStart) return;
    canvas.removeEventListener('mousedown', _onDrawStart);
    canvas.removeEventListener('mousemove', _onDrawMove);
    canvas.removeEventListener('mouseup', _onDrawEnd);
    canvas.removeEventListener('mouseleave', _onDrawEnd);
    canvas.removeEventListener('touchstart', _onDrawStart);
    canvas.removeEventListener('touchmove', _onDrawMove);
    canvas.removeEventListener('touchend', _onDrawEnd);
  }
  function _drawClear(){
    if(!_drawCtx) return;
    var c = document.getElementById('eapShowDraw');
    if(c) _drawCtx.clearRect(0, 0, c.width, c.height);
  }
  window._eapDrawClear = function(){
    _drawHistory = [];
    _drawClear();
  };
  window._eapDrawUndo = function(){
    if(!_drawHistory.length) return;
    _drawHistory.pop();
    _redrawHistory();
  };

  /* ═══════════════════════════════════════════════════════════════
     FASE 4 · DESTAQUE (revelação progressiva)
     ═══════════════════════════════════════════════════════════════ */
  function _coletarItensDestaque(slideEl){
    if(!slideEl) return [];
    var nodes = [];
    var card = slideEl.querySelector('.eap-card');
    if(!card) return [];
    /* Pega todos os filhos diretos visíveis na ordem do DOM */
    var all = card.querySelectorAll(_DEST_SELECTORS.join(','));
    all.forEach(function(n){
      /* Evita pegar filhos dentro de blocos já presentes na lista (ex.: h1 dentro de hero-photo) */
      var skip = false;
      nodes.forEach(function(p){ if(p !== n && p.contains(n)) skip = true; });
      if(!skip) nodes.push(n);
    });
    return nodes;
  }
  function _prepararDestaqueSlideAtual(){
    var slides = document.querySelectorAll('.eap-show-slide');
    slides.forEach(function(s){
      s.classList.remove('dest-active');
      s.querySelectorAll('.dest-hidden, .dest-revealed').forEach(function(n){
        n.classList.remove('dest-hidden', 'dest-revealed');
      });
    });
    var slideAtual = slides[_slideIdx];
    if(!slideAtual) return;
    slideAtual.classList.add('dest-active');
    _destaqueItems = _coletarItensDestaque(slideAtual);
    _destaqueIdx = 0;
    _destaqueItems.forEach(function(n){ n.classList.add('dest-hidden'); });
    _atualizarContadorDest();
  }
  function _atualizarContadorDest(){
    var el = document.getElementById('eapDestCounter');
    if(!el) return;
    if(!_destaqueOn){ el.classList.remove('show'); return; }
    el.classList.add('show');
    var total = _destaqueItems.length;
    if(!total){
      el.innerHTML = '🔦 Nenhum item destacável <small>Setas avançam slides</small>';
    } else {
      el.innerHTML = '🔦 <b>' + _destaqueIdx + '</b> / ' + total + ' <small>Setas para revelar</small>';
    }
  }
  function _revelarProximo(){
    if(_destaqueIdx >= _destaqueItems.length) return;
    var item = _destaqueItems[_destaqueIdx];
    if(item){
      item.classList.remove('dest-hidden');
      item.classList.add('dest-revealed');
    }
    _destaqueIdx++;
    _atualizarContadorDest();
  }
  window._eapToggleDest = function(){
    _destaqueOn = !_destaqueOn;
    var btn = document.getElementById('eapBtnDest');
    if(_destaqueOn){
      if(btn) btn.classList.add('on');
      _prepararDestaqueSlideAtual();
    } else {
      if(btn) btn.classList.remove('on');
      /* Restaura tudo visível */
      document.querySelectorAll('.eap-show-slide').forEach(function(s){
        s.classList.remove('dest-active');
        s.querySelectorAll('.dest-hidden, .dest-revealed').forEach(function(n){
          n.classList.remove('dest-hidden', 'dest-revealed');
        });
      });
      _destaqueItems = [];
      _destaqueIdx = 0;
      var c = document.getElementById('eapDestCounter');
      if(c) c.classList.remove('show');
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     FASE 4 · OVERVIEW (grade de slides)
     ═══════════════════════════════════════════════════════════════ */
  window._eapToggleOverview = function(){
    _overviewOn = !_overviewOn;
    var ov = document.getElementById('eapShowOverview');
    if(!ov) return;
    if(_overviewOn){
      var tema = _apr.tema || 'black-tie';
      var html = _apr.cards.map(function(card, i){
        var inner = '';
        (card.blocos || []).forEach(function(b){ inner += _renderBlocoApresentacao(b); });
        if(!inner) inner = '<div style="text-align:center;color:rgba(255,255,255,.3);padding:40px;font-size:11px;">Card vazio</div>';
        var cls = 'eap-ov-thumb' + (i === _slideIdx ? ' curr' : '');
        return '<div class="' + cls + '" onclick="window._eapIrOverview(' + i + ')">'
          +   '<div class="eap-ov-thumb-n">' + (i + 1) + '</div>'
          +   '<div class="eap-ov-thumb-c"><div class="eap-card" data-tema="' + tema + '">' + inner + '</div></div>'
          + '</div>';
      }).join('');
      ov.innerHTML = html;
      ov.classList.add('show');
    } else {
      ov.classList.remove('show');
    }
  };
  window._eapIrOverview = function(idx){
    _irSlide(idx);
    if(_overviewOn) window._eapToggleOverview();
  };

  /* ═══════════════════════════════════════════════════════════════
     FASE 4 · NOTAS DO PALESTRANTE
     ═══════════════════════════════════════════════════════════════ */
  function _renderNotesPanel(){
    var b = document.getElementById('eapNotesBody');
    if(!b) return;
    var card = _apr.cards[_slideIdx];
    var n = (card && card.notas) ? card.notas : '';
    b.innerHTML = n ? _esc(n).replace(/\n/g, '<br>') : '<em style="color:rgba(255,255,255,.4);">Sem notas para este slide.</em>';
  }
  window._eapToggleNotes = function(){
    _notesOn = !_notesOn;
    var p = document.getElementById('eapShowNotes');
    if(!p) return;
    if(_notesOn){
      _renderNotesPanel();
      p.classList.add('show');
    } else {
      p.classList.remove('show');
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     FASE 4 · BLACKOUT / WHITEOUT
     ═══════════════════════════════════════════════════════════════ */
  function _aplicarColorOv(){
    var ov = document.getElementById('eapColorOv');
    if(!ov) return;
    ov.classList.remove('black', 'white');
    if(_blackOn) ov.classList.add('black');
    else if(_whiteOn) ov.classList.add('white');
  }
  window._eapToggleBlack = function(){
    _blackOn = !_blackOn;
    _whiteOn = false;
    _aplicarColorOv();
  };
  window._eapToggleWhite = function(){
    _whiteOn = !_whiteOn;
    _blackOn = false;
    _aplicarColorOv();
  };

  /* ── Entrada principal ─────────────────────────────────────────── */
  function _registrarNoArrayTelas(){
    try{
      if(Array.isArray(window._TELAS) && window._TELAS.indexOf('editorApresentacaoScreen') < 0){
        window._TELAS.push('editorApresentacaoScreen');
      }
    }catch(e){}
  }

  window.abrirEditorApresentacao = function(opts){
    opts = opts || {};
    _injectCss();
    _registrarNoArrayTelas();

    if(!_montado){
      _buildShell();
      _montado = true;
    }

    /* Carrega ou cria */
    if(opts.id && !opts.novo){
      _carregarApresentacao(opts.id);
    } else {
      _criarNovaApresentacao(opts);
    }

    /* Mostra tela */
    if(typeof window._mostrarTela === 'function'){
      window._mostrarTela('editorApresentacaoScreen', false);
    } else {
      ['turmasScreen','telaTurmasScreen','mapeamentoScreen','novaPipelineScreen','dashboard','loginScreen','trapScreen'].forEach(function(t){
        var el = document.getElementById(t); if(el) el.style.display = 'none';
      });
      var host = document.getElementById('editorApresentacaoScreen');
      if(host) host.style.display = '';
    }
    window.scrollTo(0, 0);
  };

  window.voltarEditorApresentacao = function(){
    if(_modoApresentar) window._eapFecharApresentacao();
    /* Salva antes de sair */
    _salvar();
    /* Volta pro painel de Treinamentos / Apresentações se existir, senão home */
    if(typeof window._mostrarTela === 'function'){
      var alvo = document.getElementById('trapScreen') ? 'trapScreen' : 'turmasScreen';
      window._mostrarTela(alvo, false);
    }
  };

  function _criarNovaApresentacao(opts){
    _apr = {
      id: opts.id || 'apr_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      titulo: opts.titulo || 'Nova apresentação',
      produto: opts.produto || 'Geral',
      tema: opts.tema || 'black-tie',
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      cards: [{
        id: _uid('card_'),
        blocos: [
          { tipo: 'heading', texto: 'Título do primeiro card', nivel: 1 },
          { tipo: 'texto', texto: 'Comece a escrever aqui ou adicione novos blocos abaixo.' }
        ]
      }]
    };
    _cardIdx = 0;
    _render();
    _statusSave('salvo');
  }

  function _carregarApresentacao(id){
    if(typeof window._fbGet !== 'function'){
      _criarNovaApresentacao({ id: id });
      return;
    }
    window._fbGet('treinamentos/apresentacoes/' + id).then(function(d){
      if(d && d.cards){
        _apr = d;
        _cardIdx = 0;
        _render();
        _statusSave('salvo');
      } else {
        _criarNovaApresentacao({ id: id });
      }
    }).catch(function(){
      _criarNovaApresentacao({ id: id });
    });
  }

})();
