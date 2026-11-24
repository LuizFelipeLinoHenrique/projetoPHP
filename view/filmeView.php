<?php
if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    header('Location: ../index.php', true, 302);
    exit;
}

$catalogo = [];
foreach (require __DIR__ . '/../model/selecao.php' as [$titulo, $slug, $ano, $genero, $duracao, $descricao]) {
    $catalogo[$titulo] = compact('titulo', 'slug', 'ano', 'genero', 'duracao', 'descricao') + ['poster' => "assets/$slug.jpg"];
}
foreach ($filmes as $filme) {
    if (!empty($filme['titulo']) && !isset($catalogo[$filme['titulo']])) {
        $catalogo[$filme['titulo']] = $filme + ['ano' => '', 'genero' => '', 'duracao' => '', 'slug' => ''];
    }
}
$catalogo = array_values($catalogo);
function h($v) { return htmlspecialchars($v ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function icon($name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' . $name . '"/></svg>'; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#101112"><title>Órbita Cinema — Descobrir</title>
<link rel="icon" href="assets/orbita.svg" type="image/svg+xml">
<link rel="stylesheet" href="style.css?v=<?=filemtime(__DIR__ . '/../style.css')?>">
<script src="assets/catalogo.js?v=<?=filemtime(__DIR__ . '/../assets/catalogo.js')?>" defer></script>
</head>
<body>
<svg class="symbols" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>
<symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4-6 4z"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.8"/><path d="m16 16 5 5"/></symbol>
<symbol id="i-left" viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></symbol>
<symbol id="i-right" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
<symbol id="i-next" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
</defs></svg>
<header><div class="shell mast"><a class="brand" href="./" aria-label="Órbita Cinema, início"><img src="assets/orbita.svg" alt="">ÓRBITA<span>CINEMA</span></a>
<nav><a href="#destaques" class="active">Descobrir</a><a href="#catalogo">Catálogo</a></nav>
<div class="tools"><button class="search" aria-label="Buscar filmes"><?=icon('search')?></button><button class="list"><?=icon('bookmark')?> Minha lista <b id="count">0</b></button></div></div></header>
<main class="shell">
<section class="hero" id="destaques" aria-label="Filmes em destaque">
<img class="scene" src="assets/interstellar-hero.jpg" alt="" fetchpriority="high"><div class="shade"></div>
<div class="hero-copy"><div class="kicker"><span class="line"></span> EM DESTAQUE</div><h1>Interestelar</h1>
<div class="meta"><span id="year">2014</span><i></i><span id="genre">Ficção científica</span><i></i><span class="runtime"><?=icon('clock')?><span id="runtime">2h 49min</span></span></div>
<p id="synopsis"><?=h($catalogo[2]['descricao'])?></p>
<div class="actions"><button class="primary" id="detail">Ver detalhes <?=icon('next')?></button><button class="ghost" id="save"><?=icon('plus')?> Minha lista</button></div></div>
<div class="hero-controls"><span class="frame"><strong id="current">01</strong> / 03</span><button id="prev" aria-label="Destaque anterior"><?=icon('left')?></button><button id="next" aria-label="Próximo destaque"><?=icon('right')?></button></div>
<div class="segments" aria-hidden="true"><i class="on"></i><i></i><i></i></div></section>
<section id="catalogo" aria-labelledby="section-title"><div class="section-head"><div><div class="kicker"><span class="line"></span> CURADORIA ÓRBITA</div><h2 id="section-title">Seleção em órbita<span>.</span></h2></div><button class="all">Ver catálogo <?=icon('next')?></button></div>
<div id="filters" hidden><label for="query">Buscar no catálogo</label><input type="search" id="query" placeholder="Digite o nome de um filme"></div>
<div class="grid"><?php foreach ($catalogo as $idx => $f): ?>
<article class="film" data-index="<?=$idx?>" <?=$idx >= 5 ? 'hidden' : ''?>><button class="open-card" aria-label="Detalhes de <?=h($f['titulo'])?>"><span class="poster"><img src="<?=h(preg_replace('~^http://image\.tmdb\.org~', 'https://image.tmdb.org', $f['poster'] ?? ''))?>" alt="" loading="lazy"></span><strong><?=h($f['titulo'])?></strong></button><button class="mark" aria-label="Salvar <?=h($f['titulo'])?>"><?=icon('bookmark')?></button><small><?=h(implode(' · ', array_filter([$f['ano'], $f['genero']])))?></small></article>
<?php endforeach ?></div><p id="empty" hidden></p></section>
</main>
<footer class="shell"><span>ÓRBITA CINEMA</span><span>Dados e imagens · TMDB</span></footer>
<dialog><button class="close" aria-label="Fechar">×</button><img class="dialog-poster" alt=""><div class="dialog-text"><div class="kicker">FICHA DO FILME</div><h2 id="dialog-title"></h2><p class="dialog-meta"></p><p class="dialog-desc"></p><button class="primary dialog-save"></button></div></dialog>
<script type="application/json" id="data"><?=json_encode($catalogo, JSON_HEX_TAG | JSON_INVALID_UTF8_SUBSTITUTE)?></script></body></html>
