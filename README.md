# O Tratante

Pipeline para que unha IA compradora non se deixe timar negociando.

- `PROTOCOLO.md` — o texto que se lle pega a calquera IA (corentena da áncora, folla de valoración,
  regras duras, detector de tácticas, checklist por mensaxe, informe final).
- `tratante.js` — a porta determinista: calcula W/T/A a partir dunha ficha e decide cada xogada.
  As palabras do vendedor só se rexistran como tácticas; nunca moven os números.
  `node tratante.js probas/ficha_iphone13.json [guion.json]`
- `PROBAS_VERMELLAS.md` — nove guións de vendedor tramposo e unha puntuación, para probar outras IAs
  con e sen protocolo.
- `probas/probas.js` — `node probas/probas.js`

## Primeira partida (21-09-2026)

iPhone 13 128 GB, batería ao 79 %. O vendedor pediu 1.450 € → 520 € ("rebaixa do 64 %", só Bizum) →
520 € "último prezo, teño outro comprador" → 495 € (o alugueiro) → 480 € "xúroo".
O comprador con protocolo abriu en 80 €, non pasou de 105 € e retirouse. Recomendou Back Market
(~276 €, con garantía) ou Wallapop (225–250 €).

A súa autocrítica atopou tres fallos, xa corrixidos: descontaba a batería enteira aínda que os
comparables xa a tiñan gastada, cobraba risco dúas veces con pago protexido (W saía en ~115 €, cando
o valor xusto andaba en 150–190 €), e subía a oferta aínda que o vendedor non baixase.
