"use client";

import { useEffect, useRef } from "react";
import { COPY, LINKS } from "@/lib/conteudo";
import { estadoFundo } from "@/lib/fundo";
import { limita, suave } from "@/lib/movimento";
import { alturaTopo, naMedida, naRolagem, rolaAte } from "@/lib/rolagem";
import { pedeDesenho } from "@/lib/tres";
import { FILMES } from "@/tres/filme";
import { Cena } from "./Cena";
import { Icone } from "./Marca";
import { Titulo } from "./Titulo";

// Computador (≥ 900 × 600): o palco fica parado e a rolagem conduz o filme 3D de cada tratamento; quando
// um termina, a rolagem desliza para o próximo (e completa o deslize no sentido em que vinha). Celular ou
// menos movimento: um carrossel que o dedo desliza, e o filme corre quando o desenho aparece (60% à vista).
// Os passos do texto acendem com a fase do filme e, tocados, levam a ela.

const DURACAO = 9; // segundos de cada filme no carrossel

export function Vitrine() {
  const ref = useRef<HTMLDivElement>(null);
  const lista = COPY.tratamentos.lista;

  useEffect(() => {
    const vitrine = ref.current;
    if (!vitrine) return;
    const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paineis = [...vitrine.querySelectorAll<HTMLElement>(".trat")];
    const abas = [...vitrine.querySelectorAll<HTMLButtonElement>(".vitrine__aba")];
    const setas = [...vitrine.querySelectorAll<HTMLButtonElement>("[data-passo-trat]")];
    const trilho = vitrine.querySelector<HTMLElement>(".vitrine__trilho")!;
    const itens = paineis.map((p) => [...p.querySelectorAll<HTMLElement>(".trat__passos li")]);
    const legendas = paineis.map((p) => p.querySelector<HTMLElement>(".trat__legenda"));
    const textos = paineis.map((p) => p.querySelector<HTMLElement>(".trat__texto")!);
    const frases = itens.map((lis) => lis.map((li, k) => `0${k + 1} · ${li.textContent?.trim() ?? ""}`));
    const ids = lista.map((t) => t.id);
    const tempos = lista.map((t) => t.tempos);
    const mq = matchMedia("(min-width: 900px) and (min-height: 600px)");
    let modo: "rolagem" | "carrossel" | null = null;
    let atual = -1;

    const acende = (i: number, p: number) => {
      let k = 0;
      tempos[i].forEach((t, j) => {
        if (p >= t) k = j;
      });
      itens[i].forEach((li, j) => li.classList.toggle("agora", j === k));
      const leg = legendas[i];
      if (leg && leg.textContent !== frases[i][k]) leg.textContent = frases[i][k];
    };
    const poe = (i: number, p: number) => {
      FILMES[ids[i]].p = p;
      pedeDesenho();
      acende(i, p);
      paineis[i].style.setProperty("--p", p.toFixed(4));
    };
    const marcaAtual = (i: number) => {
      if (i === atual) return;
      atual = i;
      abas.forEach((a, j) => a.setAttribute("aria-current", j === i ? "true" : "false"));
      paineis.forEach((p, j) => p.classList.toggle("na-vez", j === i));
      setas[0].disabled = i === 0;
      setas[1].disabled = i === paineis.length - 1;
      setas[1].classList.remove("convida");
    };
    const passoLateral = () => paineis[1].getBoundingClientRect().left - paineis[0].getBoundingClientRect().left;

    // --- rolagem ---
    let L = 0;
    let S = 0;
    let D = 0;
    let alvo = 0;
    let mostrado = 0;
    let rodando = false;
    let largura = 0;
    let trava = 0;
    let sentido = 1;
    const medeRolagem = () => {
      L = innerHeight * 0.75;
      S = innerHeight * 0.22;
      D = paineis.length * L + (paineis.length - 1) * S;
      vitrine.style.height = `calc(100svh - var(--topo) + ${D}px)`;
      largura = passoLateral();
    };
    const desenhaRolagem = (s: number) => {
      const bloco = L + S;
      paineis.forEach((_, i) => {
        const u = limita((s - i * bloco) / L);
        poe(i, u);
        abas[i].style.setProperty("--p", u.toFixed(3));
      });
      const i = Math.min(paineis.length - 1, Math.floor(s / bloco));
      const resto = s - i * bloco;
      const x = i + (resto > L ? suave(limita((resto - L) / S)) : 0);
      trilho.style.transform = `translateX(${(-x * largura).toFixed(1)}px)`;
      textos.forEach((t, j) => {
        t.style.opacity = (1 - 0.7 * limita(Math.abs(j - x) / 0.5)).toFixed(3);
      });
      // a luz do fundo esquenta um pouco a cada tratamento
      estadoFundo.calor = limita(x / (paineis.length - 1)) * 0.8;
      marcaAtual(Math.round(x));
    };
    const passoRolagem = () => {
      const dif = alvo - mostrado;
      // num salto longo (mais de um filme e meio de uma vez), vai direto: passar por todos os filmes no
      // caminho deixava lascas e etapas no meio do ar quando a vitrine já saía da tela
      mostrado = Math.abs(dif) < 0.5 || Math.abs(dif) > 1.5 * (L + S) ? alvo : mostrado + dif * 0.16;
      desenhaRolagem(mostrado);
      if (mostrado !== alvo) requestAnimationFrame(passoRolagem);
      else rodando = false;
    };
    const base = () => vitrine.getBoundingClientRect().top + scrollY - alturaTopo();
    const prende = () => {
      const bloco = L + S;
      const i = Math.floor(alvo / bloco);
      const resto = alvo - i * bloco;
      if (resto <= L + 2 || resto >= bloco - 2 || i >= paineis.length - 1) return;
      const destino = sentido > 0 ? (i + 1) * bloco : i * bloco + L;
      rolaAte(base() + destino);
    };
    const lerRolagem = () => {
      const novo = limita(alturaTopo() - vitrine.getBoundingClientRect().top, 0, D);
      if (novo !== alvo) sentido = Math.sign(novo - alvo);
      alvo = novo;
      if (!rodando) {
        rodando = true;
        requestAnimationFrame(passoRolagem);
      }
      clearTimeout(trava);
      trava = window.setTimeout(prende, 180);
    };
    const rolaPara = (i: number, p: number) => rolaAte(base() + i * (L + S) + p * L + 2);

    // --- carrossel ---
    let laco = 0;
    let espera = 0;
    const arteVisivel = paineis.map(() => false);
    const pausa = () => cancelAnimationFrame(laco);
    const toca = (i: number, desde = 0) => {
      pausa();
      let p = desde;
      let antes = performance.now();
      const passo = (agora: number) => {
        p = Math.min(1, p + (agora - antes) / 1000 / DURACAO);
        antes = agora;
        poe(i, p);
        abas[i].style.setProperty("--p", p.toFixed(3));
        if (p >= 1) setas[1].classList.toggle("convida", i < paineis.length - 1);
        else laco = requestAnimationFrame(passo);
      };
      laco = requestAnimationFrame(passo);
    };
    const irCarrossel = (i: number) => {
      // a distância entre os dois painéis já é a posição certa, em qualquer ponto da rolagem: somar a rolagem
      // atual passava do fim, e as abas e as setas não voltavam
      trilho.scrollTo({ left: paineis[i].getBoundingClientRect().left - paineis[0].getBoundingClientRect().left, behavior: calmo ? "auto" : "smooth" });
    };
    const lerCarrossel = () => {
      const i = limita(Math.round(trilho.scrollLeft / passoLateral()), 0, paineis.length - 1);
      if (i === atual) return;
      marcaAtual(i);
      if (calmo) return;
      pausa();
      clearTimeout(espera);
      espera = window.setTimeout(() => {
        if (arteVisivel[i] && modo === "carrossel") toca(i, FILMES[ids[i]].p < 1 ? FILMES[ids[i]].p : 0);
      }, 260);
    };

    // --- troca de modo ---
    const aplicaModo = () => {
      const novo = !calmo && mq.matches ? "rolagem" : "carrossel";
      if (novo === modo) {
        if (modo === "rolagem") {
          medeRolagem();
          lerRolagem();
        }
        return;
      }
      modo = novo;
      pausa();
      vitrine.classList.toggle("vitrine--rolagem", modo === "rolagem");
      vitrine.classList.toggle("vitrine--carrossel", modo === "carrossel");
      trilho.style.transform = "";
      vitrine.style.height = "";
      textos.forEach((t) => {
        t.style.opacity = "";
      });
      trilho.scrollLeft = 0;
      atual = -1;
      marcaAtual(0);
      if (modo === "rolagem") {
        medeRolagem();
        mostrado = alvo = limita(alturaTopo() - vitrine.getBoundingClientRect().top, 0, D);
        desenhaRolagem(mostrado);
      } else {
        paineis.forEach((_, i) => {
          poe(i, calmo ? 1 : 0);
          abas[i].style.setProperty("--p", calmo ? "1" : "0");
        });
        if (arteVisivel[0] && !calmo) toca(0);
      }
    };

    const limpa: (() => void)[] = [];
    itens.forEach((lis, i) =>
      lis.forEach((li, k) => {
        const b = li.querySelector("button");
        const vai = () => {
          if (modo === "rolagem") rolaPara(i, tempos[i][k] + 0.001);
          else {
            marcaAtual(i);
            toca(i, tempos[i][k]);
          }
        };
        b?.addEventListener("click", vai);
        limpa.push(() => b?.removeEventListener("click", vai));
      }),
    );
    abas.forEach((a, i) => {
      const vai = () => (modo === "rolagem" ? rolaPara(i, 0) : irCarrossel(i));
      a.addEventListener("click", vai);
      limpa.push(() => a.removeEventListener("click", vai));
    });
    setas.forEach((b) => {
      const vai = () => irCarrossel(limita(atual + Number(b.dataset.passoTrat), 0, paineis.length - 1));
      b.addEventListener("click", vai);
      limpa.push(() => b.removeEventListener("click", vai));
    });
    const noTrilho = () => {
      if (modo === "carrossel") lerCarrossel();
    };
    trilho.addEventListener("scroll", noTrilho, { passive: true });
    const foco = (e: FocusEvent) => {
      const i = paineis.findIndex((p) => p.contains(e.target as Node));
      if (modo === "rolagem" && i >= 0 && i !== atual) rolaPara(i, 0.999);
    };
    trilho.addEventListener("focusin", foco);
    const olho = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const i = paineis.findIndex((p) => p.contains(e.target));
          arteVisivel[i] = e.intersectionRatio >= 0.6;
          if (modo !== "carrossel" || calmo || i !== atual) continue;
          if (arteVisivel[i]) toca(i, FILMES[ids[i]].p < 1 ? FILMES[ids[i]].p : 0);
          else pausa();
        }
      },
      { threshold: [0, 0.6] },
    );
    paineis.forEach((p) => olho.observe(p.querySelector(".trat__arte")!));
    const fimRolagem = naRolagem(() => {
      if (modo === "rolagem") lerRolagem();
    });
    const fimMedida = naMedida(aplicaModo);
    mq.addEventListener("change", aplicaModo);
    aplicaModo();

    return () => {
      limpa.forEach((f) => f());
      trilho.removeEventListener("scroll", noTrilho);
      trilho.removeEventListener("focusin", foco);
      olho.disconnect();
      fimRolagem();
      fimMedida();
      mq.removeEventListener("change", aplicaModo);
      pausa();
      clearTimeout(trava);
      clearTimeout(espera);
    };
  }, [lista]);

  return (
    <section className="tratamentos" id="tratamentos" aria-labelledby="t-trat" data-sol="62 22 0.35">
      <div className="moldura tratamentos__cabeca">
        <p className="rotulo">{COPY.tratamentos.rotulo}</p>
        <Titulo partes={COPY.tratamentos.titulo} id="t-trat" />
      </div>
      <div className="vitrine" ref={ref}>
        <div className="vitrine__palco">
          <div className="moldura vitrine__moldura">
            <div className="vitrine__barra">
              <nav className="vitrine__abas" aria-label="Escolha o tratamento">
                {lista.map((t) => (
                  <button key={t.id} className="vitrine__aba" type="button" aria-controls={`trat-${t.id}`}>
                    <span className="vitrine__aba-num">{t.numero}</span> <span className="vitrine__aba-nome">{t.nome}</span>
                    <span className="vitrine__aba-curto" aria-hidden="true">
                      {t.curto}
                    </span>
                    <span className="vitrine__aba-barra">
                      <i />
                    </span>
                  </button>
                ))}
              </nav>
              <div className="vitrine__setas">
                <button className="vitrine__seta" type="button" data-passo-trat="-1" aria-label="Tratamento anterior">
                  <Icone nome="i-seta" />
                </button>
                <button className="vitrine__seta" type="button" data-passo-trat="1" aria-label="Próximo tratamento">
                  <Icone nome="i-seta" />
                </button>
              </div>
            </div>
            <div className="vitrine__janela">
              <div className="vitrine__trilho">
                {lista.map((t) => (
                  <article key={t.id} className={`trat trat--${t.id}`} id={`trat-${t.id}`} aria-labelledby={`n-trat-${t.id}`}>
                    <div className="trat__arte">
                      <Cena id={t.id} className="trat__3d" />
                      <p className="trat__legenda" aria-hidden="true" />
                    </div>
                    <div className="trat__texto">
                      <h3 className="trat__nome" id={`n-trat-${t.id}`}>
                        {t.nome}
                      </h3>
                      <p className="trat__resumo">{t.resumo}</p>
                      {t.paraQuem ? <p className="trat__paraquem">{t.paraQuem}</p> : null}
                      <p className="trat__rotulo">{t.rotuloPassos}</p>
                      <ol className="trat__passos">
                        {t.passos.map((p) => (
                          <li key={p}>
                            <button type="button" className="trat__passo">
                              {p}
                            </button>
                          </li>
                        ))}
                      </ol>
                      {t.nota ? <p className="trat__nota">{t.nota}</p> : null}
                      <a className="botao botao--tinta" href={LINKS.zap(t.mensagem)} target="_blank" rel="noopener">
                        <Icone nome="i-whatsapp" />
                        <span>
                          {t.ctaCurto ? (
                            <>
                              {t.ctaCurto}
                              <span className="cta-longo">{t.cta.slice(t.ctaCurto.length)}</span>
                            </>
                          ) : (
                            t.cta
                          )}
                        </span>
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
