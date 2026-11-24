'use strict';
const find = selector => document.querySelector(selector);
const movies = JSON.parse(find('#data').textContent);
const cards = [...document.querySelectorAll('.film')];
const featured = [2, 0, 1];
let slide = 0;
let mode = 'discover';
let detailIndex = 0;
let saved = new Set();
try {
    const stored = JSON.parse(localStorage.getItem('orbita-lista') || '[]');
    if (Array.isArray(stored)) saved = new Set(stored);
} catch {}
const dialog = find('dialog');
dialog.setAttribute('aria-labelledby', 'dialog-title');
const saveIcon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';

function renderList() {
    const term = find('#query').value.trim().toLocaleLowerCase('pt-BR');
    let visible = 0;
    cards.forEach((card, i) => {
        const movie = movies[i];
        const marked = saved.has(movie.titulo);
        const mark = card.querySelector('.mark');
        mark.setAttribute('aria-pressed', String(marked));
        mark.setAttribute('aria-label', (marked ? 'Remover da lista: ' : 'Salvar: ') + movie.titulo);
        const show = mode === 'discover' ? i < 5 : mode === 'saved' ? marked : movie.titulo.toLocaleLowerCase('pt-BR').includes(term);
        card.hidden = !show;
        if (show) visible++;
    });
    find('#count').textContent = movies.filter(m => saved.has(m.titulo)).length;
    find('#empty').hidden = visible > 0;
    find('#empty').textContent = mode === 'saved' ? 'Sua lista está vazia. Use o marcador de um filme para guardá-lo aqui.' : 'Nenhum filme encontrado.';
    const currentSaved = saved.has(movies[featured[slide]].titulo);
    find('#save').innerHTML = saveIcon(currentSaved ? 'bookmark' : 'plus') + (currentSaved ? 'Na minha lista' : 'Minha lista');
    find('#save').setAttribute('aria-pressed', String(currentSaved));
    find('.dialog-save').textContent = saved.has(movies[detailIndex].titulo) ? 'Remover da minha lista' : 'Adicionar à minha lista';
}
function toggleMovie(index) {
    const name = movies[index].titulo;
    if (saved.has(name)) saved.delete(name);
    else saved.add(name);
    try { localStorage.setItem('orbita-lista', JSON.stringify([...saved])); } catch {}
    renderList();
}
function selectMode(nextMode, scroll = true) {
    mode = nextMode;
    find('#filters').hidden = mode !== 'catalog';
    find('#query').value = '';
    find('#section-title').innerHTML = ({discover:'Seleção em órbita', catalog:'Catálogo', saved:'Minha lista'})[mode] + '<span>.</span>';
    find('.all').hidden = mode === 'catalog';
    document.querySelectorAll('nav a').forEach((link,i) => link.classList.toggle('active', mode === ['discover','catalog'][i]));
    find('.list').setAttribute('aria-pressed', String(mode === 'saved'));
    renderList();
    if (scroll) find(mode === 'discover' ? '#destaques' : '#catalogo').scrollIntoView();
}
function changeSlide(direction) {
    slide = (slide + direction + featured.length) % featured.length;
    const movie = movies[featured[slide]];
    find('.scene').src = 'assets/' + movie.slug + '-hero.jpg';
    find('h1').textContent = movie.titulo;
    find('#year').textContent = movie.ano;
    find('#genre').textContent = movie.genero;
    find('#runtime').textContent = movie.duracao;
    find('#synopsis').textContent = movie.descricao;
    find('#current').textContent = String(slide + 1).padStart(2, '0');
    document.querySelectorAll('.segments i').forEach((segment, i) => segment.classList.toggle('on', i === slide));
    renderList();
}
function showMovie(index) {
    detailIndex = index;
    const movie = movies[index];
    find('#dialog-title').textContent = movie.titulo;
    find('.dialog-poster').src = cards[index].querySelector('img').src;
    find('.dialog-meta').textContent = [movie.ano, movie.genero, movie.duracao].filter(Boolean).join(' · ');
    find('.dialog-desc').textContent = movie.descricao || 'Sinopse indisponível.';
    renderList();
    dialog.showModal();
}
cards.forEach((card, i) => {
    card.querySelector('.open-card').onclick = () => showMovie(i);
    card.querySelector('.mark').onclick = () => toggleMovie(i);
});
find('#prev').onclick = () => changeSlide(-1);
find('#next').onclick = () => changeSlide(1);
find('#detail').onclick = () => showMovie(featured[slide]);
find('#save').onclick = () => toggleMovie(featured[slide]);
find('.dialog-save').onclick = () => toggleMovie(detailIndex);
find('.close').onclick = () => dialog.close();
dialog.onclick = event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
};
find('.list').onclick = () => selectMode('saved');
find('.all').onclick = () => selectMode('catalog');
find('.search').onclick = () => { selectMode('catalog'); find('#query').focus({preventScroll:true}); };
find('#query').oninput = renderList;
document.querySelectorAll('nav a').forEach((link,i) => {
    link.onclick = event => { event.preventDefault(); selectMode(i ? 'catalog' : 'discover'); };
});
selectMode(location.hash === '#catalogo' ? 'catalog' : 'discover', false);