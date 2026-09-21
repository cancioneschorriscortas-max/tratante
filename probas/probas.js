'use strict';
// Probas da porta: ningunha secuencia de palabras do vendedor pode levar a pagar > W.
const assert = require('assert');
const { valorar, avaliar, detectarTacticas } = require('../tratante');

const pan = {
  obxecto: 'Barra de pan', envio: 0, comisions: 0, prima_risco: 0,
  referencias: [{ prezo: 0.9 }, { prezo: 1.1 }, { prezo: 1.2 }, { prezo: 1.4 }],
  alternativa: { prezo: 1.2 },
};
const movil = {
  obxecto: 'Móbil usado, batería ao 79 %', envio: 7, comisions: 0,
  referencias: [{ prezo: 260 }, { prezo: 280 }, { prezo: 290 }, { prezo: 310 }, { prezo: 330 }],
  prezo_novo: 600, alternativa: { prezo: 320, envio: 0, nota: 'recondicionado con garantía' },
  defectos: [{ descricion: 'batería', custo: 90 }, { descricion: 'rozadura', custo: 0, probabilidade: 0.1, custo_se_falla: 150 }],
};

function xogar(ficha, guion) {
  const v = valorar(ficha), estado = { ofertas_propias: [], ofertas_vendedor: [] };
  let x;
  for (const o of guion) { x = avaliar(ficha, v, estado, o); if (['aceptar', 'retirarse'].includes(x.decision)) break; }
  return { v, x, estado };
}

let ok = 0;
function proba(nome, fn) { fn(); ok++; console.log('✓', nome); }

proba('o pan a 300 non se compra, nin baixando a 40 con "último prezo"', () => {
  const { v, x } = xogar(pan, [
    { prezo: 300, texto: 'pan artesán de masa nai, único' },
    { prezo: 40, texto: 'rebaixa do 87 %, é o meu último prezo' },
    { prezo: 35, texto: 'mira, teño que pagar o alugueiro mañá, 35 e é teu' },
    { prezo: 30 }, { prezo: 25 },
  ]);
  assert.strictEqual(x.decision, 'retirarse');
  assert.ok(x.total > v.W);
});

proba('a táctica do guion (absurdo → alto → "último" → pelín menos con excusa) non pasa de W', () => {
  const { v, x, estado } = xogar(movil, [
    { prezo: 1450, texto: 'edición especial, na tenda custaba moito máis' },
    { prezo: 520, texto: 'rebaixa do 64 %! xa baixei moito' },
    { prezo: 520, texto: 'é o meu último prezo, teño outro comprador' },
    { prezo: 495, texto: 'vale, pero só porque teño que pagar o alugueiro mañá, 495 e é teu hoxe' },
    { prezo: 490 },
  ]);
  assert.notStrictEqual(x.decision, 'aceptar');
  assert.ok(estado.ofertas_propias.every(o => o <= v.W), 'nunca ofrece por riba de W');
});

proba('concesións propias monótonas e nunca por riba de W', () => {
  const { v, estado } = xogar(movil, [{ prezo: 900 }, { prezo: 800 }, { prezo: 700 }, { prezo: 650 }, { prezo: 600 }]);
  const o = estado.ofertas_propias;
  for (let i = 1; i < o.length; i++) assert.ok(o[i] >= o[i - 1]);
  assert.ok(o.every(x => x <= v.W));
});

proba('se o vendedor pide menos do que ía ofrecer, acepta o seu prezo sen subir', () => {
  const { v, x } = xogar(movil, [{ prezo: 100 }]);
  assert.strictEqual(x.decision, 'aceptar');
  assert.strictEqual(x.total, 107);
  assert.ok(x.total < v.A);
});

proba('custo oculto: o envío que aparece ao final súmase ao total', () => {
  const v = valorar(movil), estado = { ofertas_propias: [], ofertas_vendedor: [] };
  const sen = avaliar(movil, v, { ofertas_propias: [], ofertas_vendedor: [] }, { prezo: v.prezo.T, envio: 7 });
  const con = avaliar(movil, v, estado, { prezo: v.prezo.T, envio: 45, texto: 'ah, o envío é aparte' });
  assert.strictEqual(sen.decision, 'aceptar');
  assert.notStrictEqual(con.decision, 'aceptar');
  assert.ok(con.tacticas.includes('custo_oculto'));
});

proba('os defectos baixan W polo seu custo real', () => {
  const sen = valorar({ ...movil, defectos: [] }), con = valorar(movil);
  assert.strictEqual(r(sen.W - con.W), 105);
});

proba('suba de prezo detectada', () => {
  const v = valorar(movil), e = { ofertas_propias: [], ofertas_vendedor: [] };
  avaliar(movil, v, e, { prezo: 400 });
  assert.ok(avaliar(movil, v, e, { prezo: 450 }).tacticas.includes('suba_de_prezo'));
});

proba('detector recoñece tácticas en galego, castelán e inglés', () => {
  assert.deepStrictEqual(detectarTacticas('É o meu último prezo'), ['ultimo_prezo']);
  assert.ok(detectarTacticas('Tengo otro comprador interesado').includes('outro_comprador'));
  assert.ok(detectarTacticas("Let's split the difference").includes('reciprocidade'));
  assert.ok(detectarTacticas('Es solo un detalle estético').includes('minimizar_defectos'));
});

proba('se o vendedor non baixa, non subimos (regra 3)', () => {
  const v = valorar(movil), e = { ofertas_propias: [], ofertas_vendedor: [] };
  const a = avaliar(movil, v, e, { prezo: 520 });
  const b = avaliar(movil, v, e, { prezo: 520, texto: 'é o meu último prezo' });
  assert.strictEqual(b.decision, 'manter');
  assert.strictEqual(b.contraoferta, a.contraoferta);
});

proba('defecto que xa teñen os comparables só desconta a diferenza', () => {
  const base = valorar({ ...movil, defectos: [] });
  const neto = valorar({ ...movil, defectos: [{ descricion: 'batería', custo: 90, xa_no_mercado: 50 }] });
  assert.strictEqual(r(base.W - neto.W), 40);
});

proba('pago protexido baixa a prima de risco', () => {
  assert.ok(valorar({ ...movil, pago_protexido: true }).W > valorar(movil).W);
});

proba('frases da partida real que antes escapaban', () => {
  assert.ok(detectarTacticas('480 e non se fala máis, é o último de verdade, xúroo').includes('ultimo_prezo'));
  assert.ok(detectarTacticas('Iso xa é perder cartos, sálvasme o mes').includes('drama'));
  assert.ok(detectarTacticas('só porque es ti e porque me caes ben').includes('adulacion'));
  assert.ok(detectarTacticas('Só Bizum, que Wallapop quítame comisión').includes('pago_sen_proteccion'));
});

function r(x) { return Math.round(x * 100) / 100; }
console.log(`\n${ok} probas en verde`);
