// Gadelha Odontologia · comportamento da página (v17). Sem dependências.
// Tudo o que depende da rolagem passa por um quadro só (requestAnimationFrame). Quem pediu menos
// movimento vê os desenhos já no quadro final, sem voo, sem palavras acendendo e sem passeio.
const raiz = document.documentElement;
raiz.classList.add("js");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
const topo = document.getElementById("topo");
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const alturaTopo = () => topo.offsetHeight;

const aoRolar = [];
const aoMedir = [];
let pedido = false;
const agenda = () => {
  if (pedido) return;
  pedido = true;
  requestAnimationFrame(() => { pedido = false; for (const f of aoRolar) f(); });
};
addEventListener("scroll", agenda, { passive: true });
addEventListener("resize", () => { for (const f of aoMedir) f(); agenda(); });

/* ---------- 1. topo: fundo translúcido depois de rolar; azul sobre as seções azuis ---------- */
const escuras = [...document.querySelectorAll("main .escuro, .rodape")];
aoRolar.push(() => {
  topo.classList.toggle("rolou", scrollY > 8);
  const linha = alturaTopo();
  topo.classList.toggle("topo--escuro", escuras.some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= linha && r.bottom > linha;
  }));
});

/* ---------- 2. blocos que entram ---------- */
const revela = new IntersectionObserver((itens) => {
  for (const it of itens) {
    if (it.isIntersecting) { it.target.classList.add("visivel"); revela.unobserve(it.target); }
  }
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
document.querySelectorAll("[data-revela]").forEach((el) => revela.observe(el));

/* ---------- 3. a espiral da abertura vira o símbolo do topo ---------- */
// A espiral sai do fluxo (position: fixed) e, conforme a rolagem, encolhe até o lugar do símbolo.
// O traço engrossa na mesma medida, até ficar igual ao da marca (2,02 no viewBox), e o azul do símbolo
// se desenha por cima do cáqui. Quando pousa, ela some e o símbolo de verdade aparece no mesmo lugar.
const espiral = document.querySelector(".abertura__espiral");
const lugar = document.querySelector(".abertura__lugar");
const simbolo = topo.querySelector(".marca__simbolo");
const nomeTopo = topo.querySelector(".marca__nome");
const orfaos = [...document.querySelectorAll(".abertura__local, .abertura__rolar")];
if (espiral && lugar && simbolo && !calmo) {
  const traco = espiral.querySelector(".espiral__traco");
  const azul = espiral.querySelector(".espiral__azul");
  let a = null, u0 = 0.11, acelerou = false;
  const mede = () => {
    traco.style.strokeWidth = "";
    azul.style.strokeWidth = "";
    u0 = parseFloat(getComputedStyle(traco).strokeWidth) || 0.11;
    const r = lugar.getBoundingClientRect();
    a = { x: r.left, y: r.top + scrollY, w: r.width, h: r.height };
    raiz.classList.add("voa");
    espiral.style.width = `${a.w}px`;
    espiral.style.height = `${a.h}px`;
  };
  const acelera = () => {
    // Se a pessoa já rolou, o desenho termina depressa em vez de seguir no ritmo da abertura.
    acelerou = true;
    for (const an of traco.getAnimations()) an.playbackRate = 4;
    // O rótulo e a linha de rolar passam a seguir a rolagem (some junto com o voo).
    for (const el of orfaos) for (const an of el.getAnimations()) an.cancel();
  };
  const atualiza = () => {
    const b = simbolo.getBoundingClientRect();
    const p = limita(scrollY / (innerHeight * 0.55));
    // Encolhe e anda para a esquerda antes de subir: assim chega ao topo já pequena e não passa
    // por cima do nome GADELHA.
    const e = suave(limita(p / 0.85));
    const w = a.w + (b.width - a.w) * e;
    const x = a.x + (b.left - a.x) * e;
    const y = a.y + (b.top - a.y) * suave(p);
    espiral.style.transform = `translate(${x}px, ${y}px) scale(${w / a.w})`;
    const px0 = (u0 * a.w) / 35.5;
    const px1 = (2.02 * b.width) / 35.5;
    traco.style.strokeWidth = azul.style.strokeWidth = `${((px0 + (px1 - px0) * e) * 35.5) / w}`;
    // O azul do símbolo se desenha por cima do cáqui nos últimos 15% do voo, do centro para fora, como na
    // abertura (misturar as duas cores passava por cinza em qualquer espaço de cor).
    azul.style.strokeDashoffset = `${(1 - limita((e - 0.85) / 0.15)).toFixed(4)}`;
    // O nome começa na margem e abre espaço para o símbolo pouco antes de ela chegar.
    const vao = (b.width + 12) * (1 - suave(limita((p - 0.45) / 0.35)));
    nomeTopo.style.transform = vao > 0.1 ? `translateX(${-vao}px)` : "";
    if (acelerou) { const f = (1 - limita(p / 0.2)).toFixed(3); for (const el of orfaos) el.style.opacity = f; }
    const pousou = p >= 1;
    raiz.classList.toggle("pousou", pousou);
    espiral.style.visibility = pousou ? "hidden" : "visible";
    simbolo.style.opacity = pousou ? "1" : "0";
    if (p > 0.01 && !acelerou) acelera();
  };
  mede();
  atualiza();
  aoMedir.push(mede);
  aoRolar.push(atualiza);
  if (document.fonts) document.fonts.ready.then(() => { mede(); atualiza(); });
  addEventListener("load", () => { mede(); atualiza(); });
}

const ctaFrase = document.querySelector(".manifesto__acao .botao");
if (ctaFrase) {
  new IntersectionObserver(([e]) => raiz.classList.toggle("cta-antes", e.isIntersecting || e.boundingClientRect.top > 0)).observe(ctaFrase);
}

/* ---------- 4. a frase acende palavra por palavra ---------- */
const titulo = document.querySelector("[data-palavras]");
if (titulo && !calmo) {
  const texto = titulo.textContent;
  titulo.setAttribute("aria-label", texto);
  titulo.innerHTML = texto.split(" ").map((p) => `<span class="palavra" aria-hidden="true">${p}</span>`).join(" ");
  const palavras = [...titulo.querySelectorAll(".palavra")];
  aoRolar.push(() => {
    const r = titulo.getBoundingClientRect();
    const q = limita((innerHeight * 0.95 - r.top) / (innerHeight * 0.3));
    palavras.forEach((s, i) => s.style.setProperty("--luz", limita(q * palavras.length - i).toFixed(3)));
  });
}

/* ---------- 5. tratamentos: os filmes ---------- */
// Cada elemento ganha uma animação só, que cobre o filme inteiro, com os quadros em milissegundos.
// Assim dá para pôr qualquer tempo (rolagem) ou tocar (carrossel) com o mesmo código.
const CURVA = "cubic-bezier(.45,0,.25,1)";
const FREIA = "cubic-bezier(.2,.7,.3,1)";
function linha(el, total, quadros, extra) {
  const kf = quadros.map(([t, props, curva]) => ({ ...props, offset: limita(t / total), easing: curva || CURVA }));
  if (kf[0].offset > 0) kf.unshift({ ...kf[0], offset: 0 });
  if (kf[kf.length - 1].offset < 1) kf.push({ ...kf[kf.length - 1], offset: 1 });
  const an = el.animate(kf, { duration: total, fill: "both", ...extra });
  an.pause();
  return an;
}
const some = { opacity: 0 };
const mostra = { opacity: 1 };
const centro = (el) => { el.style.transformBox = "fill-box"; el.style.transformOrigin = "50% 50%"; };
const deslocado = (el) => el.dataset.fora.split(",").map(Number);
const mov = ([s, n, r], f) => ({ transform: `translate(${s * f}px, ${n * f}px) rotate(${r * f}deg)` });
const pos = (x, y, r = 0) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` });

const FILMES = {
  // O caminho de cada dente aparece; a cada alinhador os dentes andam um terço; o último fica.
  orto(svg) {
    const T = 9000, ciclos = [1800, 4100, 6400], an = [];
    svg.querySelectorAll("[data-fora]").forEach((g) => {
      centro(g);
      const d = deslocado(g);
      const q = [[0, mov(d, 1)]];
      ciclos.forEach((c, k) => { q.push([c + 600, mov(d, 1 - k / 3)]); q.push([c + 1500, mov(d, 1 - (k + 1) / 3)]); });
      an.push(linha(g, T, q));
    });
    svg.querySelectorAll(".or-guia").forEach((g) => an.push(linha(g, T, [[400, some], [1300, mostra], [7900, mostra], [8500, some]])));
    const fora = { opacity: 0, transform: "scale(1.05)" };
    const dentro = { opacity: 1, transform: "scale(1)" };
    svg.querySelectorAll(".or-alinhador").forEach((g) => {
      centro(g);
      const q = [[0, fora]];
      ciclos.forEach((c, k) => {
        q.push([c, fora, FREIA], [c + 500, dentro]);
        if (k < 2) q.push([c + 1600, dentro], [c + 2100, fora]);
      });
      an.push(linha(g, T, q));
    });
    // "alinhador 1", "alinhador 2", "alinhador 3…": cada um aparece com o seu alinhador
    svg.querySelectorAll(".or-conta").forEach((el, k) => {
      const c = ciclos[k];
      an.push(linha(el, T, k < 2 ? [[c, some], [c + 400, mostra], [c + 1800, mostra], [c + 2100, some]] : [[c, some], [c + 400, mostra]]));
    });
    return { total: T, passos: [0, 1800, 4100], an };
  },

  // Medidas e marcas; uma lâmina desce sobre a frente do dente lascado e a lupa mostra a faceta de
  // perfil, colada só na frente; a ponta curta volta em camadas até a linha de medida.
  estetica(svg) {
    const T = 9400, an = [];
    const q = (sel, quadros) => svg.querySelectorAll(sel).forEach((el) => an.push(linha(el, T, quadros)));
    q(".es-medida", [[300, some], [1100, mostra], [7800, mostra], [8600, some]]);
    q(".es-marca--lasca", [[1400, some], [1900, mostra], [2900, mostra], [3300, some]]);
    q(".es-marca--curto", [[1600, some], [2100, mostra], [5500, mostra], [5900, some]]);
    // a escala de cor: a marca começa na cor do dente escuro e vai até a das vizinhas
    q(".es-escala", [[500, some], [1000, mostra], [2700, mostra], [3100, some]]);
    q(".es-escolha", [[1100, { opacity: 0, transform: "translateX(0px)" }], [1400, { opacity: 1, transform: "translateX(0px)" }],
      [1900, { opacity: 1, transform: "translateX(0px)" }], [2400, { opacity: 1, transform: "translateX(-132px)" }]]);
    svg.querySelectorAll(".es-lamina").forEach(centro);
    q(".es-lamina", [[3400, { opacity: 0, transform: "scale(1.06)" }, FREIA], [4200, { opacity: 1, transform: "scale(1)" }]]);
    const lupa = svg.querySelector(".es-lupa");
    lupa.style.transformOrigin = "150px 350px";
    an.push(linha(lupa, T, [[2900, { opacity: 0, transform: "scale(0.7)" }, FREIA], [3300, { opacity: 1, transform: "scale(1)" }]]));
    q(".es-faceta", [[3400, { opacity: 0, transform: "translateX(26px)" }, FREIA], [4200, { opacity: 1, transform: "translateX(0px)" }]]);
    q(".es-lascado", [[4200, mostra], [4400, some]]);
    q(".es-central", [[4200, some], [4400, mostra]]);
    q(".es-rotulos1", [[3400, some], [4000, mostra]]);
    q(".es-rotulos2", [[6000, some], [6400, mostra]]);
    q(".es-medida2", [[7800, mostra], [8600, some]]);
    // passo 3: a segunda lupa mostra a ponta do dente curto de perto; as camadas sobem ali e no dente
    const lupa2 = svg.querySelector(".es-lupa2");
    lupa2.style.transformOrigin = "330px 350px";
    an.push(linha(lupa2, T, [[5500, { opacity: 0, transform: "scale(0.7)" }, FREIA], [6000, { opacity: 1, transform: "scale(1)" }]]));
    svg.querySelectorAll(".es-camada:not(.es-camada2)").forEach((el, i) => an.push(linha(el, T, [[6000 + i * 550, some], [6350 + i * 550, mostra]])));
    svg.querySelectorAll(".es-camada2").forEach((el, i) => an.push(linha(el, T, [[6000 + i * 550, some], [6350 + i * 550, mostra]])));
    svg.querySelectorAll(".es-contorno2").forEach((el, i) => an.push(linha(el, T, [[6000 + i * 550, some], [6350 + i * 550, mostra]])));
    // no desenho grande, as camadas aparecem com o contorno cáqui da ponta nova; a linha do limite sai no fim
    q(".es-limite", [[6000, some], [6400, mostra], [8000, mostra], [8500, some]]);
    svg.querySelectorAll(".es-lateral").forEach((el, i) => an.push(linha(el, T, [[6000 + i * 550, some], [6350 + i * 550, mostra]])));
    return { total: T, passos: [0, 2900, 5500], an };
  },

  // O contorno do dente que falta; o implante entra girando; o osso fecha em volta; pilar e coroa.
  implante(svg) {
    const T = 9400, an = [];
    const q = (sel, quadros) => svg.querySelectorAll(sel).forEach((el) => an.push(linha(el, T, quadros)));
    q(".im-falta--coroa", [[200, some], [900, mostra], [7800, mostra], [8300, some]]);
    q(".im-falta--raiz", [[200, some], [900, mostra], [2400, mostra], [2900, some]]);
    q(".im-implante", [[900, some], [1100, mostra]]);
    q(".im-implante", [[900, { transform: "translateY(-190px)" }], [2500, { transform: "translateY(0px)" }]]);
    q(".im-roscas", [[900, { transform: "translateY(0px)" }, "linear"], [2500, { transform: "translateY(36px)" }]]);
    q(".im-fresta", [[2400, some], [2500, mostra], [3400, mostra], [5400, some]]);
    svg.querySelectorAll(".im-uniao circle").forEach((c) => {
      const t = 3400 + ((Number(c.dataset.y) - 304) / 100) * 1800;
      an.push(linha(c, T, [[t, some], [t + 300, mostra]]));
    });
    q(".im-pilar", [[6000, some], [6150, mostra]]);
    q(".im-pilar", [[6000, { transform: "translateY(-70px)" }, "cubic-bezier(.5,0,.8,.4)"], [6500, { transform: "translateY(3px)" }], [6700, { transform: "translateY(0px)" }]]);
    q(".im-coroa", [[6900, some], [7200, mostra]]);
    q(".im-coroa", [[6900, { transform: "translateY(-90px)" }, FREIA], [7800, { transform: "translateY(0px)" }]]);
    return { total: T, passos: [0, 3200, 6000], an };
  },

  // O tártaro sai em lascas e a placa some; a taça pole; o calendário do canto vira as folhas enquanto a
  // placa volta, e ela sai de novo na última folha (a revisão).
  profilaxia(svg) {
    const T = 9800, an = [];
    const q = (sel, quadros) => svg.querySelectorAll(sel).forEach((el) => an.push(linha(el, T, quadros)));
    const raspa = 900, passo = 260;
    const alvos = [[193, 243], [212, 240], [230, 241], [249, 239], [267, 240], [287, 242]];
    q(".pr-tartaro-faixa, .pr-lascas", [[0, mostra]]);
    svg.querySelectorAll(".pr-tartaro").forEach((el, i) => an.push(linha(el, T, [[raspa + i * passo, mostra], [raspa + i * passo + 220, some]])));
    q(".pr-pintas", [[raspa, mostra, "linear"], [raspa + 6 * passo, some]]);
    svg.querySelectorAll(".pr-lasca").forEach((el, i) => {
      const t = raspa + Math.floor(i / 2) * passo + 60;
      const lado = i % 2 ? 1 : -1;
      const fim = `translate(${lado * (8 + ((i * 7) % 10))}px, ${-(14 + ((i * 11) % 12))}px) rotate(${lado * (40 + i * 9)}deg)`;
      centro(el);
      an.push(linha(el, T, [[t, { opacity: 0, transform: "translate(0px, 0px) rotate(0deg)" }, "linear"],
        [t + 40, { opacity: 1, transform: "translate(0px, 0px) rotate(0deg)" }, FREIA], [t + 620, { opacity: 0, transform: fim }]]));
    });
    q(".pr-placa", [[2500, mostra], [3300, some], [6000, some], [8600, { opacity: 0.65 }], [8800, { opacity: 0.65 }], [9200, some]]);
    const raspagem = [[500, pos(330, 150)]];
    alvos.forEach(([x, y], i) => raspagem.push([raspa + i * passo, pos(x, y), "linear"]));
    raspagem.push([2700, pos(292, 202, -8)], [3050, pos(198, 188, -8)], [3500, pos(330, 110)]);
    q(".pr-instrumento", [[500, some], [800, mostra], [3300, mostra], [3500, some]]);
    q(".pr-instrumento", raspagem);
    q(".pr-taca", [[3600, some], [3850, mostra], [5400, mostra], [5650, some]]);
    q(".pr-taca", [[3600, pos(306, 160)], [4000, pos(276, 198)], [4500, pos(212, 206)], [5000, pos(266, 232)], [5400, pos(224, 236)], [5650, pos(320, 150)]]);
    svg.querySelectorAll(".pr-taca-gira").forEach(centro);
    q(".pr-taca-gira", [[3600, { transform: "rotate(0deg)" }, "linear"], [5650, { transform: "rotate(1440deg)" }]]);
    // o calendário aparece e vira três folhas (os meses até a revisão)
    q(".pr-calendario", [[5600, some], [5900, mostra]]);
    svg.querySelectorAll(".pr-folha").forEach((f, k) => {
      const t = 6300 + k * 800;
      f.style.transformOrigin = "408px 52px";
      an.push(linha(f, T, [[t, { opacity: 1, transform: "scaleY(1)" }, "cubic-bezier(.5,0,.75,0)"], [t + 380, { opacity: 0, transform: "scaleY(0.08)" }]]));
    });
    return { total: T, passos: [0, 3600, 5800], an };
  },
};

// As duas animações do planejamento digital: laços curtos que tocam só enquanto estão na tela.
const LACOS = {
  "arte--scan"(svg) {
    const T = 6200, it = { iterations: Infinity }, an = [];
    const ponta = svg.querySelector(".sc-ponteira");
    const pontos = ponta.dataset.pontos.split(";").map((p) => p.split(",").map(Number));
    an.push(linha(ponta, T, pontos.map(([x, y, g], n) => [500 + n * 300, pos(x, y, g)]), it));
    an.push(linha(ponta, T, [[0, some], [350, mostra], [4300, mostra], [4800, some]], it));
    svg.querySelectorAll(".sc-malha").forEach((m) => {
      const t = 500 + Number(m.dataset.n) * 300;
      an.push(linha(m, T, [[t, some], [t + 260, mostra], [5000, mostra], [5700, some]], it));
    });
    return an;
  },
  "arte--simulacao"(svg) {
    const T = 6000, it = { iterations: Infinity }, an = [];
    svg.querySelectorAll("[data-fora]").forEach((d) => {
      centro(d);
      const f = deslocado(d);
      an.push(linha(d, T, [[700, mov(f, 1)], [2700, mov(f, 0)], [4000, mov(f, 0)], [5600, mov(f, 1)]], it));
    });
    const ida = (x) => ({ transform: `translateX(${x}px)` });
    an.push(linha(svg.querySelector(".si-cursor"), T, [[700, ida(-188)], [2700, ida(0)], [4000, ida(0)], [5600, ida(-188)]], it));
    const feito = svg.querySelector(".si-trilho-feito");
    feito.style.transformOrigin = "66px 190px";
    const s = (k) => ({ transform: `scaleX(${k})` });
    an.push(linha(feito, T, [[700, s(0)], [2700, s(1)], [4000, s(1)], [5600, s(0)]], it));
    return an;
  },
};

/* ---------- 6. tratamentos: a vitrine ---------- */
// Computador: o palco fica parado e a rolagem conduz o filme de cada tratamento; quando um termina,
// a rolagem desliza para o próximo. Celular (ou menos movimento): um carrossel que o dedo desliza,
// e o filme toca quando o tratamento aparece. Os passos do texto acendem junto com a fase do filme
// e, tocados, levam a ela.
const vitrine = document.querySelector("[data-vitrine]");
if (vitrine) {
  const paineis = [...vitrine.querySelectorAll(".trat")];
  const abas = [...vitrine.querySelectorAll(".vitrine__aba")];
  const setas = [...vitrine.querySelectorAll("[data-passo-trat]")];
  const trilho = vitrine.querySelector(".vitrine__trilho");
  const itens = paineis.map((p) => [...p.querySelectorAll(".trat__passos li")]);
  const legendas = paineis.map((p) => p.querySelector(".trat__legenda"));
  const textos = paineis.map((p) => p.querySelector(".trat__texto"));
  const frases = itens.map((lis) => lis.map((li, k) => `0${k + 1} · ${li.textContent.trim()}`));
  const filmes = calmo ? null : paineis.map((p) => FILMES[p.dataset.trat](p.querySelector(".arte")));
  const tempos = paineis.map(() => -1);
  const mqRolagem = matchMedia("(min-width: 900px) and (min-height: 600px)");
  let modo = null, atual = -1;

  const acende = (i, t) => {
    const ps = filmes[i].passos;
    let k = 0;
    ps.forEach((p, j) => { if (t >= p) k = j; });
    itens[i].forEach((li, j) => li.classList.toggle("agora", j === k));
    if (legendas[i] && legendas[i].textContent !== frases[i][k]) legendas[i].textContent = frases[i][k];
  };
  const poeTempo = (i, t) => {
    if (!filmes || tempos[i] === t) return;
    tempos[i] = t;
    for (const an of filmes[i].an) an.currentTime = t;
    acende(i, t);
  };
  const marcaAtual = (i) => {
    if (i === atual) return;
    atual = i;
    abas.forEach((a, j) => a.setAttribute("aria-current", j === i ? "true" : "false"));
    paineis.forEach((p, j) => p.classList.toggle("na-vez", j === i));
    setas[0].disabled = i === 0;
    setas[1].disabled = i === paineis.length - 1;
    setas[1].classList.remove("convida");
  };
  const passoLateral = () => paineis[1].getBoundingClientRect().left - paineis[0].getBoundingClientRect().left;

  // --- modo rolagem ---
  let L = 0, S = 0, D = 0, alvo = 0, mostrado = 0, rodando = false, largura = 0;
  const medeRolagem = () => {
    L = innerHeight * 0.6;
    S = innerHeight * 0.2;
    D = paineis.length * L + (paineis.length - 1) * S;
    vitrine.style.height = `calc(100svh - var(--topo) + ${D}px)`;
    largura = passoLateral();
  };
  const desenhaRolagem = (s) => {
    const bloco = L + S;
    paineis.forEach((p, i) => {
      const u = limita((s - i * bloco) / L);
      if (filmes) poeTempo(i, Math.round(u * filmes[i].total));
      abas[i].style.setProperty("--p", u.toFixed(3));
    });
    const i = Math.min(paineis.length - 1, Math.floor(s / bloco));
    const resto = s - i * bloco;
    const x = i + (resto > L ? suave(limita((resto - L) / S)) : 0);
    trilho.style.transform = `translateX(${(-x * largura).toFixed(1)}px)`;
    // no deslize, o texto que sai e o que entra ficam mais claros: nunca se lê o nome de um ao lado do desenho do outro
    textos.forEach((t, j) => { t.style.opacity = (1 - 0.7 * limita(Math.abs(j - x) / 0.5)).toFixed(3); });
    marcaAtual(Math.round(x));
  };
  const passoRolagem = () => {
    const dif = alvo - mostrado;
    mostrado = Math.abs(dif) < 0.5 ? alvo : mostrado + dif * 0.16;
    desenhaRolagem(mostrado);
    if (mostrado !== alvo) requestAnimationFrame(passoRolagem);
    else rodando = false;
  };
  let trava = 0, sentido = 1;
  const prende = () => {
    // Quem para de rolar no meio de um deslize é levado adiante no sentido em que vinha rolando.
    const bloco = L + S;
    const i = Math.floor(alvo / bloco);
    const resto = alvo - i * bloco;
    if (resto <= L + 2 || resto >= bloco - 2 || i >= paineis.length - 1) return;
    const destino = sentido > 0 ? (i + 1) * bloco : i * bloco + L;
    const base = vitrine.getBoundingClientRect().top + scrollY - alturaTopo();
    scrollTo({ top: base + destino, behavior: "smooth" });
  };
  const lerRolagem = () => {
    const novo = limita(alturaTopo() - vitrine.getBoundingClientRect().top, 0, D);
    if (novo !== alvo) sentido = Math.sign(novo - alvo);
    alvo = novo;
    if (!rodando) { rodando = true; requestAnimationFrame(passoRolagem); }
    clearTimeout(trava);
    trava = setTimeout(prende, 180);
  };
  const rolaPara = (i, t) => {
    const base = vitrine.getBoundingClientRect().top + scrollY - alturaTopo();
    scrollTo({ top: base + i * (L + S) + (t / filmes[i].total) * L + 2, behavior: "smooth" });
  };

  // --- modo carrossel ---
  let laco = 0, espera = 0;
  const pausaTudo = () => { filmes?.forEach((f) => f.an.forEach((an) => an.pause())); cancelAnimationFrame(laco); };
  const acompanha = (i) => {
    cancelAnimationFrame(laco);
    const f = filmes[i];
    const passo = () => {
      const t = f.an[0].currentTime ?? 0;
      tempos[i] = t;
      acende(i, t);
      abas[i].style.setProperty("--p", limita(t / f.total).toFixed(3));
      if (t >= f.total) setas[1].classList.toggle("convida", i < paineis.length - 1);
      else if (f.an[0].playState === "running") laco = requestAnimationFrame(passo);
    };
    laco = requestAnimationFrame(passo);
  };
  const toca = (i, desde = 0) => {
    if (!filmes) return;
    pausaTudo();
    poeTempo(i, desde);
    filmes[i].an.forEach((an) => an.play());
    acompanha(i);
  };
  const irCarrossel = (i) => {
    trilho.scrollTo({ left: paineis[i].getBoundingClientRect().left - paineis[0].getBoundingClientRect().left, behavior: calmo ? "auto" : "smooth" });
  };
  const lerCarrossel = () => {
    const i = limita(Math.round(trilho.scrollLeft / passoLateral()), 0, paineis.length - 1);
    if (i === atual) return;
    marcaAtual(i);
    if (!filmes) return;
    pausaTudo();
    clearTimeout(espera);
    espera = setTimeout(() => { if (arteVisivel[i] && modo === "carrossel") toca(i); }, 260);
  };

  // --- troca de modo ---
  const aplicaModo = () => {
    const novo = !calmo && mqRolagem.matches ? "rolagem" : "carrossel";
    if (novo === modo) {
      if (modo === "rolagem") { medeRolagem(); lerRolagem(); }
      return;
    }
    modo = novo;
    pausaTudo();
    vitrine.classList.toggle("vitrine--rolagem", modo === "rolagem");
    vitrine.classList.toggle("vitrine--carrossel", modo === "carrossel");
    vitrine.classList.toggle("vitrine--viva", !!filmes);
    trilho.style.transform = "";
    vitrine.style.height = "";
    textos.forEach((t) => { t.style.opacity = ""; });
    trilho.scrollLeft = 0;
    atual = -1;
    marcaAtual(0);
    if (modo === "rolagem") {
      medeRolagem();
      mostrado = alvo = limita(alturaTopo() - vitrine.getBoundingClientRect().top, 0, D);
      desenhaRolagem(mostrado);
    } else {
      paineis.forEach((p, i) => { poeTempo(i, 0); abas[i].style.setProperty("--p", "0"); });
      if (arteVisivel[0]) toca(0);
    }
  };

  if (filmes) {
    itens.forEach((lis, i) => lis.forEach((li, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "trat__passo";
      b.append(...li.childNodes);
      li.append(b);
      b.addEventListener("click", () => {
        const t = filmes[i].passos[k];
        if (modo === "rolagem") rolaPara(i, t);
        else { marcaAtual(i); toca(i, t); }
      });
    }));
  }
  abas.forEach((a, i) => a.addEventListener("click", () => (modo === "rolagem" ? rolaPara(i, 0) : irCarrossel(i))));
  setas.forEach((b) => b.addEventListener("click", () => irCarrossel(limita(atual + Number(b.dataset.passoTrat), 0, paineis.length - 1))));
  trilho.addEventListener("scroll", () => { if (modo === "carrossel") lerCarrossel(); }, { passive: true });
  trilho.addEventListener("focusin", (e) => {
    const i = paineis.findIndex((p) => p.contains(e.target));
    if (modo === "rolagem" && i >= 0 && i !== atual) rolaPara(i, filmes[i].total);
  });
  // No carrossel, o filme do cartão da vez toca quando o desenho dele está pelo menos 60% na tela e pausa
  // quando sai; se já tinha terminado e a pessoa volta ao desenho, recomeça.
  const arteVisivel = paineis.map(() => false);
  const olho = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const i = paineis.findIndex((p) => p.contains(e.target));
      arteVisivel[i] = e.intersectionRatio >= 0.6;
      if (modo !== "carrossel" || !filmes || i !== atual) continue;
      if (arteVisivel[i]) toca(i, tempos[i] >= 0 && tempos[i] < filmes[i].total ? tempos[i] : 0);
      else pausaTudo();
    }
  }, { threshold: [0, 0.6] });
  paineis.forEach((p) => olho.observe(p.querySelector(".trat__arte")));
  aoRolar.push(() => { if (modo === "rolagem") lerRolagem(); });
  aoMedir.push(aplicaModo);
  mqRolagem.addEventListener("change", aplicaModo);
  aplicaModo();
}

/* ---------- 7. planejamento digital: os laços ---------- */
if (!calmo) {
  document.querySelectorAll(".processo .arte").forEach((svg) => {
    const nome = Object.keys(LACOS).find((c) => svg.classList.contains(c));
    if (!nome) return;
    const an = LACOS[nome](svg);
    new IntersectionObserver(([e]) => an.forEach((x) => (e.isIntersecting ? x.play() : x.pause())), { threshold: 0.2 }).observe(svg);
  });
}

/* ---------- 8. a clínica: a rolagem entra nas fotos ---------- */
// O palco fica parado; a foto da vez se aproxima devagar (quem anda pelo corredor) e a seguinte
// aparece como uma porta de correr que se abre do meio para os lados.
const passeio = document.querySelector("[data-passeio]");
if (passeio && !calmo) {
  passeio.classList.add("passeio--ativo");
  const palco = passeio.querySelector(".passeio__palco");
  const fotos = [...passeio.querySelectorAll(".passeio__foto")];
  const imgs = fotos.map((f) => f.querySelector("img"));
  const paradas = [...passeio.querySelectorAll(".passeio__paradas li")];
  const legenda = passeio.querySelector(".passeio__legenda");
  // o HTML (e não só o texto), para manter o "º" na fonte certa
  const fatos = paradas.map((li) => li.querySelector(".parada__fato")?.innerHTML.trim() ?? "");
  const limites = [[0, 0.36], [0.36, 0.76], [0.76, 1]];
  const mede = () => { passeio.style.height = `calc(100svh - var(--topo) + ${Math.round(innerHeight * 1.2)}px)`; };
  const atualiza = () => {
    const r = passeio.getBoundingClientRect();
    const D = passeio.offsetHeight - palco.offsetHeight;
    if (D <= 0 || r.bottom < -200 || r.top > innerHeight + 200) return;
    const q = limita((alturaTopo() - r.top) / D);
    const porta1 = suave(limita((q - 0.3) / 0.12));
    const porta2 = suave(limita((q - 0.7) / 0.12));
    // aproximação curta (no máximo 10%): as fotos são de celular e borram se crescerem mais
    imgs[0].style.transform = `scale(${(1 + 0.1 * limita(q / 0.42)).toFixed(4)})`;
    imgs[1].style.transform = `scale(${(1 + 0.08 * limita((q - 0.3) / 0.52)).toFixed(4)})`;
    imgs[2].style.transform = `scale(${(1 + 0.06 * limita((q - 0.7) / 0.3)).toFixed(4)})`;
    const porta = (k) => `inset(0 ${(50 - 50 * k).toFixed(2)}% 0 ${(50 - 50 * k).toFixed(2)}%)`;
    fotos[1].style.clipPath = porta(porta1);
    fotos[2].style.clipPath = porta(porta2);
    const ativa = q < 0.36 ? 0 : q < 0.76 ? 1 : 2;
    if (legenda && legenda.dataset.parada !== String(ativa)) { legenda.innerHTML = fatos[ativa]; legenda.dataset.parada = String(ativa); }
    paradas.forEach((li, i) => {
      li.classList.toggle("ativa", i === ativa);
      li.style.setProperty("--p", limita((q - limites[i][0]) / (limites[i][1] - limites[i][0])).toFixed(3));
    });
  };
  mede();
  aoMedir.push(mede);
  aoRolar.push(atualiza);
}

agenda();
