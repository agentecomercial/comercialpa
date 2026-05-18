/* ════════════════════════════════════════════════════════════════
   THEME PICKER — 30 temas via classe no <body>
   - Default = SEM tema (CSS original do projeto vigora)
   - Aplica apenas quando o usuário escolhe explicitamente
   - Persiste em localStorage (chave selected_theme_v2)
   - Suporta múltiplos pickers na mesma página (id passado no toggle)
═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var PREMIUM = [
    { n:'p01', name:'★ Obsidian Gold',    bg:'#000000', accent:'#d4af37' },
    { n:'p02', name:'★ Aurora Dynamics',  bg:'#020a18', accent:'#7fffd4' },
    { n:'p03', name:'★ Cyber Tokyo',      bg:'#050015', accent:'#00dcff' },
    { n:'p04', name:'★ Velvet Royale',    bg:'#1a0a2e', accent:'#f0d68a' },
    { n:'p05', name:'★ Crystal Ice',      bg:'#dde8f4', accent:'#2a5b8f' },
    { n:'p06', name:'★ Inferno Ember',    bg:'#080302', accent:'#ffaf50' },
    { n:'p07', name:'★ Emerald Lux',      bg:'#02100c', accent:'#d4af37' },
    { n:'p08', name:'★ Cosmic Nebula',    bg:'#04021a', accent:'#c890ff' },
    { n:'p09', name:'★ Synthwave Grid',   bg:'#1a0540', accent:'#ff80c8' },
    { n:'p10', name:'★ Champagne Elite',  bg:'#f5ead0', accent:'#b8862c' },
    { n:'p11', name:'★ Holographic Prism',bg:'#0a0a18', accent:'#64c8ff' },
    { n:'p12', name:'★ Carbon Fiber',     bg:'#0a0a0a', accent:'#ff3838' },
    { n:'p13', name:'★ Forest Mystic',    bg:'#02080a', accent:'#e8c870' },
    { n:'p14', name:'★ Sakura Blossom',   bg:'#f8e6ec', accent:'#c04880' },
    { n:'p15', name:'★ Royal Indigo',     bg:'#02021a', accent:'#7890ff' },
    { n:'p16', name:'★ Steel Brushed',    bg:'#0e1218', accent:'#5ba8e8' },
    { n:'p17', name:'★ Coral Tropical',   bg:'#0e1822', accent:'#ff7890' },
    { n:'p18', name:'★ Plasma Storm',     bg:'#050510', accent:'#ffffff' },
    { n:'p19', name:'★ Frosted Lavender', bg:'#e8e0f4', accent:'#7848d4' },
    { n:'p20', name:'★ Sandstone Mirage', bg:'#1a0e08', accent:'#da8a54' },
    { n:'p21', name:'★ Arctic Aurora',    bg:'#040c14', accent:'#a0f0e0' },
    { n:'p22', name:'★ Matrix Code',      bg:'#000800', accent:'#00ff80' },
    { n:'p23', name:'★ Vintage Sepia',    bg:'#f0e3c8', accent:'#a86838' },
    { n:'p24', name:'★ Neon Pink Dream',  bg:'#1a0220', accent:'#ff64c8' },
    { n:'p25', name:'★ Brutalist Concrete',bg:'#111111', accent:'#ffffff' },
    { n:'p26', name:'★ Mint Frost',       bg:'#f0faf5', accent:'#0a8a5a' },
    { n:'p27', name:'★ Rose Champagne',   bg:'#f8e8e0', accent:'#b85c44' },
    { n:'p28', name:'★ Twilight Magic',   bg:'#0a0218', accent:'#ffaa50' },
    { n:'p29', name:'★ Charcoal Smoke',   bg:'#0e0e0e', accent:'#ffffff' },
    { n:'p30', name:'★ Diamond Crystal',  bg:'#e8f0f8', accent:'#4a90e2' }
  ];

  var THEMES = [
    { n:'01', name:'Midnight Glass',   bg:'#0a0e1a', accent:'#c8f05a' },
    { n:'02', name:'Aurora Boreal',    bg:'#02141a', accent:'#7fffd4' },
    { n:'03', name:'Sunset Lounge',    bg:'#1a0d0a', accent:'#ff8a5b' },
    { n:'04', name:'Cyber Tokyo',      bg:'#050015', accent:'#00dcff' },
    { n:'05', name:'Iceberg',          bg:'#dde8f4', accent:'#2a5b8f' },
    { n:'06', name:'Brutalist Mono',   bg:'#111111', accent:'#ffffff' },
    { n:'07', name:'Velvet Royale',    bg:'#1a0a2e', accent:'#f0d68a' },
    { n:'08', name:'Emerald Lux',      bg:'#04201a', accent:'#d4af37' },
    { n:'09', name:'Steel Industrial', bg:'#1a1f26', accent:'#5ba8e8' },
    { n:'10', name:'Sakura Mist',      bg:'#f8e6ec', accent:'#c04880' },
    { n:'11', name:'Carbon Fiber',     bg:'#0a0a0a', accent:'#ff3838' },
    { n:'12', name:'Ocean Depths',     bg:'#001830', accent:'#5ed0ff' },
    { n:'13', name:'Volcanic Ember',   bg:'#190a05', accent:'#ffaf50' },
    { n:'14', name:'Frosted Lavender', bg:'#e8e0f4', accent:'#7848d4' },
    { n:'15', name:'Holographic',      bg:'#0a0a18', accent:'#64c8ff' },
    { n:'16', name:'Matrix Rain',      bg:'#001a08', accent:'#00ff80' },
    { n:'17', name:'Vintage Paper',    bg:'#f0e3c8', accent:'#a86838' },
    { n:'18', name:'Neon Dreams',      bg:'#1a0220', accent:'#ff64c8' },
    { n:'19', name:'Mint Cream',       bg:'#f0faf5', accent:'#0a8a5a' },
    { n:'20', name:'Obsidian Gold',    bg:'#000000', accent:'#d4af37' },
    { n:'21', name:'Plasma TV',        bg:'#050510', accent:'#ffffff' },
    { n:'22', name:'Sandstone',        bg:'#3a1f10', accent:'#da8a54' },
    { n:'23', name:'Arctic Mint',      bg:'#082030', accent:'#a0f0e0' },
    { n:'24', name:'Royal Indigo',     bg:'#0a0a3a', accent:'#7890ff' },
    { n:'25', name:'Coral Reef',       bg:'#022a30', accent:'#ff7890' },
    { n:'26', name:'Charcoal',         bg:'#1a1a1a', accent:'#ffffff' },
    { n:'27', name:'Synthwave',        bg:'#2a0850', accent:'#ff80c8' },
    { n:'28', name:'Forest Canopy',    bg:'#0a1810', accent:'#e8c870' },
    { n:'29', name:'Rose Gold',        bg:'#f8e8e0', accent:'#b85c44' },
    { n:'30', name:'Cosmic Nebula',    bg:'#0e0830', accent:'#c890ff' }
  ];

  var LS_KEY = 'selected_theme_v2';
  // ID do picker atualmente aberto (suporta múltiplos pickers na página)
  var _pickerAberto = null;

  function _removerClasse(){
    var classes = document.body.className.split(/\s+/).filter(function(c){
      return c && c.indexOf('theme-') !== 0;
    });
    document.body.className = classes.join(' ');
  }

  function _aplicarTema(num){
    _removerClasse();
    if(num){
      document.body.classList.add('theme-' + num);
      try { localStorage.setItem(LS_KEY, num); } catch(e){}
    } else {
      // num = null → voltar ao tema original (sem classe)
      try { localStorage.removeItem(LS_KEY); } catch(e){}
    }
  }

  function _temaAtual(){
    try { return localStorage.getItem(LS_KEY) || null; } catch(e){ return null; }
  }

  // NÃO aplica default — só renderiza se já houver tema salvo
  // (a aplicação no boot é feita pelo script inline no <head>)

  // ───────────────────────────────────────────────────────
  // POPOVER do picker — aceita id do picker (suporta múltiplos)
  // ───────────────────────────────────────────────────────
  window._themePickerToggle = function(ev, pickerId){
    if(ev){ ev.stopPropagation(); }
    pickerId = pickerId || 'themePicker';
    var picker = document.getElementById(pickerId);
    if(!picker) return;
    var abrindo = !picker.classList.contains('open');
    // Fecha qualquer outro picker aberto
    document.querySelectorAll('.theme-picker.open').forEach(function(p){
      if(p !== picker) p.classList.remove('open');
    });
    picker.classList.toggle('open', abrindo);
    _pickerAberto = abrindo ? pickerId : null;
    if(abrindo) _renderPicker(pickerId);
  };

  window._themeSelect = function(num){
    _aplicarTema(num);
    // Re-renderiza qualquer picker aberto
    document.querySelectorAll('.theme-picker.open').forEach(function(p){
      _renderPicker(p.id);
    });
  };

  function _renderPicker(pickerId){
    var pop = document.querySelector('#'+pickerId+' .theme-picker-pop');
    if(!pop) return;
    var atual = _temaAtual();
    var html = '';

    // PADRÃO no topo
    var ativoPadrao = (!atual) ? ' active' : '';
    html += '<div class="theme-picker-head">🎨 Tema</div>'
         +  '<div class="theme-picker-grid">'
         +    '<div class="theme-swatch theme-swatch-default'+ativoPadrao+'" onclick="_themeSelect(null)" title="Tema original (sem modificação)">'
         +      '<div class="theme-swatch-bg" style="background:linear-gradient(135deg,#1a1a1a,#0f0f0f);"></div>'
         +      '<div class="theme-swatch-num">—</div>'
         +      '<div class="theme-swatch-name">Padrão</div>'
         +      '<div class="theme-swatch-accent" style="background:#c8f05a;"></div>'
         +    '</div>'
         +  '</div>';

    // ★ PREMIUM (com efeitos)
    html += '<div class="theme-picker-head" style="margin-top:14px;color:#d4af37;">★ Premium (com efeitos)</div>'
         +  '<div class="theme-picker-grid">';
    PREMIUM.forEach(function(t){
      var ativo = (t.n === atual) ? ' active' : '';
      html += '<div class="theme-swatch theme-swatch-premium'+ativo+'" onclick="_themeSelect(\''+t.n+'\')" title="'+t.name+'">'
            +   '<div class="theme-swatch-bg" style="background:radial-gradient(circle at 30% 20%,'+t.accent+'30,transparent 60%),'+t.bg+';"></div>'
            +   '<div class="theme-swatch-num">'+t.n.toUpperCase()+'</div>'
            +   '<div class="theme-swatch-name">'+t.name+'</div>'
            +   '<div class="theme-swatch-accent" style="background:'+t.accent+';box-shadow:0 0 12px '+t.accent+';"></div>'
            + '</div>';
    });
    html += '</div>';

    // LITE (só paleta)
    html += '<div class="theme-picker-head" style="margin-top:14px;">Lite (só cores)</div>'
         +  '<div class="theme-picker-grid">';
    THEMES.forEach(function(t){
      var ativo = (t.n === atual) ? ' active' : '';
      html += '<div class="theme-swatch'+ativo+'" onclick="_themeSelect(\''+t.n+'\')" title="'+t.name+'">'
            +   '<div class="theme-swatch-bg" style="background:'+t.bg+';"></div>'
            +   '<div class="theme-swatch-num">'+t.n+'</div>'
            +   '<div class="theme-swatch-name">'+t.name+'</div>'
            +   '<div class="theme-swatch-accent" style="background:'+t.accent+';"></div>'
            + '</div>';
    });
    html += '</div>';

    pop.innerHTML = html;
  }

  // Fecha clicando fora
  document.addEventListener('click', function(ev){
    document.querySelectorAll('.theme-picker.open').forEach(function(picker){
      if(!picker.contains(ev.target)) picker.classList.remove('open');
    });
  });
  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape'){
      document.querySelectorAll('.theme-picker.open').forEach(function(p){
        p.classList.remove('open');
      });
    }
  });
})();
