'use strict';
// O Tratante: porta determinista para un axente comprador.
// O LLM conversa; esta porta decide. Do vendedor só entran números (prezo, envío, comisións):
// as súas palabras clasifícanse como tácticas para o rexistro, pero NUNCA moven W nin T.

const TACTICAS = [
  ['ultimo_prezo', /(últim[oa]|ultim[oa]|final|last)\s*(prezo|precio|price|oferta|offer)|non baixo máis|no bajo más|take it or leave it|lo tomas o lo dejas|o colles ou o deixas|últim[oa] de verdade|non se fala máis|no se habla más|xúro|te lo juro|\bi swear\b/i],
  ['presa', /(?<!\p{L})(hoxe|hoy|today|agora mesmo|ahora mismo|right now|mañá|mañana|tomorrow|só ata|solo hasta|only until|expira|expires|pechámolo|cerramos ya|pronto|cuanto antes|canto antes|lo antes posible|asap|me voy de viaje|vou de viaxe|me mudo|múdome|\d+\s*(minutos|horas|minutes|hours))(?!\p{L})/iu],
  ['outro_comprador', /(outr[oa]|otr[oa]|another|other)\s+(comprador|interesad[oa]|buyer|persoa|persona)|ten(go|ño)\s+(máis|más)\s+(interesados|ofertas)|(máis|más) xente|(máis|más) gente|(un par de|varias|otras|outras) (personas|persoas)|people (are )?asking|moita demanda|mucha demanda/i],
  ['drama', /(alug|alquiler|\brent\b|médic|medic|enferm|\bsick\b|meu fill|mi hij|my kid|despid|fired|necesito (os cartos|el dinero|o diñeiro)|need the money|operación|perder (cartos|dinero)|pasándo(o|lo) mal|me salvas|sálvasme)/i],
  ['falso_desconto', /(\d+\s*%|rebaix|rebaj|descuento|desconto|discount|chollo|ganga|bargain|regalad|antes (custaba|costaba)|\bwas\s+\$?\d+|prezo de tenda|precio de tienda|retail|nov[oa] (sae|custa|vale)|nuev[oa] (sale|cuesta|vale)|(sae|sale) por máis de|new (it )?costs|menos de lo que cuesta|menos do que custa)/i],
  ['minimizar_defectos', /(detall|nada grave|no es nada|non é nada|cosmetic|estétic|apenas se nota|barely|\bminor\b|funciona perfect)/i],
  ['escaseza', /(únic[oa]|\bunique\b|último que queda|last one|edición limitada|limited edition|\braro\b|\brare\b|non volverás|no volverás|never find)/i],
  ['reciprocidade', /(xa (baixei|rebaixei)|ya (bajé|rebajé)|already (dropped|lowered)|fago un esforzo|hago un esfuerzo|meet me halfway|a medias|partir a diferen|split the difference|no medio|en el medio|se te moves|si te mueves|sobre a túa oferta|sobre tu oferta)/i],
  ['adulacion', /(bo ollo|buen ojo|good eye|sabes do que|sabes de lo que|know your stuff|para ti|a ti cho|a ti te lo|porque es ti|me caes b|excepción|exception)/i],
  ['pago_sen_proteccion', /(bizum|transferencia|wire transfer|western union|paypal (amigos|friends)|friends and family|sinal|señal|por adiantado|por adelantado|upfront|quítame comisión|me quita comisión|fóra da plataforma|fuera de la plataforma)/i],
  ['custo_oculto', /((envío|envio|portes|shipping)\b[^.]{0,15}(aparte|non incluíd|no incluid|not included|extra)|\+\s*(envío|shipping)|comisión|\bfee\b|seguro obrigatorio|seguro obligatorio)/i],
];

function detectarTacticas(texto = '') {
  return TACTICAS.filter(([, re]) => re.test(texto)).map(([id]) => id);
}

function mediana(xs) {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function cuartilBaixo(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return mediana(s.slice(0, Math.max(1, Math.floor(s.length / 2))));
}
const r2 = x => Math.round(x * 100) / 100;

// Custos de adquisición para un prezo p: envío + comisión fixa + comisión proporcional.
// `comisions` (fixa, compatibilidade) ou `comision_fixa` + `comision_pct`.
const extras = (f, p) => (f.envio ?? 0) + (f.comisions ?? f.comision_fixa ?? 0) + (f.comision_pct ?? 0) * p;
const totalAPrezo = (f, t) => r2((t - (f.envio ?? 0) - (f.comisions ?? f.comision_fixa ?? 0)) / (1 + (f.comision_pct ?? 0)));

// ficha: a folla de valoración da FASE 1. Todos os importes na mesma moeda.
function valorar(f) {
  if (!f.referencias || f.referencias.length < 3) throw new Error('Fan falla polo menos 3 referencias de mercado');
  const prezos = f.referencias.map(r => r.prezo);
  const M = mediana(prezos), Q1 = cuartilBaixo(prezos);
  const C = r2(extras(f, M));                                     // custo de adquirir ESTE (a prezo M)
  const Ctip = f.envio_tipico ?? C;                              // custo típico de adquirir un comparable
  const D = (f.defectos ?? []).reduce((s, d) => s + Math.max(0, (d.custo ?? 0) - (d.xa_no_mercado ?? 0)) + (d.probabilidade ?? 0) * (d.custo_se_falla ?? 0), 0);
  const R = M * (f.prima_risco ?? (f.pago_protexido ? 0.03 : 0.08));   // a protección xa cubre parte do risco
  const B = f.alternativa ? f.alternativa.prezo + (f.alternativa.envio ?? 0) : Infinity;
  const teito = Math.min(B, f.prezo_novo ?? Infinity, M + Ctip, f.orzamento ?? Infinity);
  const W = r2(teito - D - R);                                   // total máximo
  const T = r2(Math.min(W, Q1 + Ctip - D - R));                  // total obxectivo
  const A = r2(T * (f.factor_apertura ?? 0.85));                 // total de apertura
  const aPrezo = x => totalAPrezo(f, x);                         // total → prezo do obxecto
  return { M, Q1, C, D: r2(D), R: r2(R), B, W, T, A, teito: r2(teito),
           prezo: { W: aPrezo(W), T: aPrezo(T), A: aPrezo(A) } };
}

// Unha xogada. estado = { ofertas_propias: [totais], ofertas_vendedor: [totais] }
// oferta = { prezo, envio?, comisions?, texto? }
function avaliar(f, v, estado, oferta, maxRondas = 4, maxMensaxes = 8) {
  const total = r2(oferta.prezo + extras({ ...f, ...(oferta.envio !== undefined && { envio: oferta.envio }),
                                              ...(oferta.comisions !== undefined && { comisions: oferta.comisions }) }, oferta.prezo));
  const tacticas = detectarTacticas(oferta.texto);
  const anterior = estado.ofertas_vendedor.at(-1);
  if (anterior !== undefined && total > anterior) tacticas.push('suba_de_prezo');
  estado.ofertas_vendedor.push(total);

  const propias = estado.ofertas_propias;
  const rondas = new Set(propias).size;                          // concesións feitas, non mensaxes
  const miaUltima = propias.at(-1);
  let decision, contraoferta = null, motivo;

  if (total <= v.T) {
    decision = 'aceptar'; motivo = `total ${total} ≤ obxectivo ${v.T}`;
  } else if (miaUltima !== undefined && total <= miaUltima) {
    decision = 'aceptar'; motivo = 'pide o que xa ofrecín ou menos';
  } else if (rondas >= maxRondas && total <= v.W && !estado.reafirmado) {
    estado.reafirmado = true; decision = 'reafirmar'; contraoferta = miaUltima;
    motivo = `total ${total} ≤ W ${v.W}; reafirmo o meu tope unha vez e, se non o acepta, acepto o seu`;
  } else if (rondas >= maxRondas) {
    decision = total <= v.W ? 'aceptar' : 'retirarse';
    motivo = total <= v.W ? `sen máis rondas; total ${total} ≤ W ${v.W}` : `total ${total} > W ${v.W}, sen máis rondas`;
  } else if (total > v.teito && estado.ofertas_vendedor.length >= 4) {
    decision = 'retirarse'; motivo = `catro mensaxes e segue por riba do teito ${v.teito}: non está a negociar`;
  } else if (estado.ofertas_vendedor.length >= maxMensaxes) {
    decision = total <= v.W ? 'aceptar' : 'retirarse'; motivo = `límite de ${maxMensaxes} mensaxes`;
  } else if (total > v.teito && miaUltima !== undefined) {
    // Por riba do que custa novo ou a alternativa: baixar desde unha áncora absurda non é movemento.
    decision = 'manter'; contraoferta = miaUltima; propias.push(miaUltima);
    motivo = `total ${total} > teito ${v.teito} (novo/alternativa): a súa baixada non conta`;
  } else if (anterior !== undefined && total >= anterior && miaUltima !== undefined) {
    // O vendedor non se moveu: nós tampouco (regra 3). A rolda conta igual.
    decision = 'manter'; contraoferta = miaUltima; propias.push(miaUltima);
    motivo = 'o vendedor non baixou; mantemos a oferta';
  } else {
    // Calendario de concesións decrecentes: A → metade cara a T → T → metade cara a W (derradeira).
    const plan = [v.A, r2(v.A + (v.T - v.A) / 2), v.T, r2(v.T + (v.W - v.T) / 2)];
    let seguinte = Math.max(plan[Math.min(rondas, plan.length - 1)], miaUltima ?? -Infinity);
    seguinte = Math.min(seguinte, v.W, total);                    // nunca por riba de W nin do que pide
    if (seguinte >= total) { decision = 'aceptar'; motivo = 'a miña seguinte oferta xa cubriría o que pide'; }
    else { decision = total <= v.W ? 'seguir' : 'contraofertar'; contraoferta = seguinte; propias.push(seguinte);
           motivo = total <= v.W ? `aceptable (≤ W) pero por riba de T ${v.T}` : `total ${total} > W ${v.W}`; }
  }
  return { total, tacticas, decision, motivo,
           contraoferta, contraoferta_prezo: contraoferta === null ? null : totalAPrezo(f, contraoferta) };
}

// Se o axente envía unha oferta distinta da que propuxo a porta (ou ningunha), rexístrao aquí
// para que o estado non se desincronice: substitúe a última oferta propia pola realmente enviada.
function rexistrarEnviada(estado, total) {
  if (estado.ofertas_propias.length) estado.ofertas_propias[estado.ofertas_propias.length - 1] = total;
  else estado.ofertas_propias.push(total);
}

module.exports = { valorar, avaliar, rexistrarEnviada, detectarTacticas };

// CLI: node tratante.js ficha.json [guion.json]
if (require.main === module) {
  const fs = require('fs');
  const [fichaPath, guionPath] = process.argv.slice(2);
  if (!fichaPath) { console.log('uso: node tratante.js ficha.json [guion.json]'); process.exit(1); }
  const f = JSON.parse(fs.readFileSync(fichaPath, 'utf8'));
  const v = valorar(f);
  console.log(`\n${f.obxecto}\n  M=${v.M}  Q1=${v.Q1}  C=${v.C}  D=${v.D}  R=${v.R}  B=${v.B}`);
  console.log(`  TOTAIS  apertura ${v.A} · obxectivo ${v.T} · retirada ${v.W}`);
  console.log(`  PREZO   apertura ${v.prezo.A} · obxectivo ${v.prezo.T} · retirada ${v.prezo.W}\n`);
  if (guionPath) {
    const estado = { ofertas_propias: [], ofertas_vendedor: [] };
    for (const oferta of JSON.parse(fs.readFileSync(guionPath, 'utf8'))) {
      const x = avaliar(f, v, estado, oferta);
      if (oferta.enviada !== undefined) rexistrarEnviada(estado, oferta.enviada);   // o que se mandou de verdade
      console.log(`vendedor: ${oferta.prezo} "${oferta.texto ?? ''}"`);
      console.log(`  → total ${x.total} · ${x.decision}${x.contraoferta_prezo !== null ? ' · contraoferta ' + x.contraoferta_prezo : ''} · ${x.motivo}`);
      if (x.tacticas.length) console.log(`    tácticas: ${x.tacticas.join(', ')}`);
      if (x.decision === 'aceptar' || x.decision === 'retirarse') break;
    }
  }
}
