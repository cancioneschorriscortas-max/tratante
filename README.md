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

## Segunda partida (21-09-2026): vendedor IA fronte a comprador IA

Switch OLED + Mario Kart 8 + Zelda TotK, Joy-Con esquerdo con drift. O vendedor quería o máximo e
tiña un mínimo secreto de 215 €. Ofertas: 285 → 255 → 240 → 225 → 215 "último" → 205, fronte a
185 → 185 → 185 → 195 → 195. **Trato en 195 € + ~20 € de envío e protección**, dentro do rango
xusto (~195–225 € para un lote con drift) e na parte boa para o comprador.

O que decidiu a partida foron os datos, non a presión: o vendedor confesou o drift antes do vídeo
(boa xogada), o comprador cazou un erro de conta (240 − 45 presentado como 225) e usou o método do
propio vendedor para fixar o tope. Os "outros interesados", as presas e o "último prezo" non moveron
nada. O vendedor acabou revisando a súa alternativa real (unha tenda pagaría menos por mor do drift)
e baixou o seu mínimo.

Corrixido despois: comisión proporcional (protección de Wallapop), manter oferta xa non gasta unha
concesión, reafirmar o tope unha vez antes de aceptar ao final, máis frases no detector.

## Terceira partida (21-09-2026): escaleira de áncoras absurdas

AirPods Pro 3 precintados (novos: ~199–204 €). O vendedor tiña guion: 10.000.000 € ("é un filtro
contra bots") → 1.000 € → 590 € ("marcho de viaxe o xoves") → 399 € "prezo final", co mínimo
secreto en 359 € (1,8 × prezo novo). O comprador abriu en 108 €, non se moveu nin un euro en toda
a partida ("por riba do que custan novos non os compro, sexan de quen sexan") e retirouse.
**Sen trato: correcto.** A alternativa é compralos novos por ~204 €.

A porta si fallaba: contaba cada baixada desde a áncora como movemento e propoñía subir a 117 € e
a 127 €. O comprador ignorouna con criterio. Corrixido: por riba do teito (novo/alternativa) as
baixadas non contan, e con catro mensaxes aí retírase; `rexistrarEnviada` para cando o axente manda
outra cifra da que propuxo a porta.
