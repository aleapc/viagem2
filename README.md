# Viagem²

PWA de curadoria de viagens e escapadas para duas pessoas. O projeto evoluiu a partir do motor do Caçador, cujo histórico original permanece preservado em `aleapc/cacador`.

**Site:** https://aleapc.github.io/viagem2/

Roda de hora em hora numa GitHub Action, lê as promoções publicadas pelo Melhores Destinos, extrai `{origem, destino, preço}` com a API da Anthropic e cruza os resultados com as preferências da dupla. A interface oferece onboarding separado, troca por WhatsApp, avaliações persistentes, filtros, Escapadas, Viagens e Salvos.

## Rodar

```bash
npm ci
node scripts/cacar/run.mjs --seco   # 2 matérias, não grava, não envia, imprime os alertas
node scripts/cacar/run.mjs          # rodada real
```

Precisa de `ANTHROPIC_API_KEY` no ambiente. Para alertar de verdade, também `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`. Em produção os três vêm de GitHub Secrets — nunca de `.env`, nunca commitados. Não existe request à API em runtime pelo navegador, então não há superfície de vazamento da chave.

## Decisões que não são óbvias

**Por que sitemap e não RSS.** O `robots.txt` do Melhores Destinos tem `Disallow: /feed/` e `*/feed/`, e ao mesmo tempo anuncia `Sitemap: /sitemap.xml`. As páginas `/promocao/` não estão restritas. Então descobrimos pelo sitemap e lemos as matérias — tudo que tocamos é explicitamente permitido. O feed seria o caminho óbvio e é justamente o proibido.

**Por que o Passageiro de Primeira está fora.** O `robots.txt` deles tem `User-agent: ClaudeBot / Disallow: /`, mais `Content-Signal: ai-train=no` e reserva de direitos sob o Art. 4 da Diretiva UE 2019/790, e o servidor devolve 403 em tudo. É um "não" deliberado, dito de três formas. Não contornar.

**Por que preservamos os links de afiliado.** O alerta manda você para a matéria deles, com o `melhores.la` intacto. Você clicando lá é o que paga a curadoria humana que este app consome. O app é cliente, não parasita.

**O título mente — e isso é sistemático.** Três variantes já observadas em matérias reais de 16/07/2026:

1. *Origem trocada* — título: "Portugal a partir de R$ 3.061, saindo de São Paulo". Corpo: os R$ 3.061 são de **Recife**; São Paulo sai por R$ 3.307.
2. *Preço fantasma* — título: "Miami a partir de R$ 1.745". O corpo diz R$ 1.928 como mínimo e **não menciona R$ 1.745 em lugar nenhum**. O post foi atualizado, o título não. Um regex no título alertaria uma passagem que não está à venda.
3. *Vários pares numa frase* — "menor valor é Bogotá saindo do Rio… Cartagena de São Paulo a R$ 2.095… R$ 2.284 de **Sampa**". Quatro pares origem-destino, uma origem em gíria.

Por isso o LLM lê o corpo, e por isso a extração custa dinheiro — é o único jeito de o número estar certo. O slug (`/promocao/passagens-aereas-*`) tria de graça; o LLM só roda no que passa.

**A tabela de preços da matéria é renderizada por JavaScript** — não existe `<table>` no HTML. O texto corrido tem os números que importam; não tente ler a tabela.

**Por que Telegram e não push de PWA.** Push no iOS é frágil e as subscriptions não podem viver num repo público. O Telegram já está aberto no seu celular.

**Por que os perfis são commitados.** Eles são filtro sobre o que o job já coletou, não parâmetro de busca — a origem é sempre São Paulo, então o job varre tudo e o filtro é local. Alta permanência por design: mexer neles é evento raro.

## Sair por outra praça ("posicionamento") — construído, medido, DESLIGADO

A ideia: GRU → praça brasileira (com milhas) → internacional pago. Os dados de 16/07/2026 pareciam ouro: Miami R$ 1.928 de Manaus contra R$ 2.809 de São Paulo — R$ 881/pessoa.

A pesquisa derrubou. O código está em `posicionamento.mjs` com os detalhes, mas o resumo:

- **A diferença bruta mente.** O GRU↔Manaus custa R$ 1.215–1.400 em dinheiro. Economia líquida do Miami: **negativa**.
- **A rota morre em 09/08/2026.** GOL MAO-MIA opera 18/06–09/08, 2x/semana, atrelada à Copa. Para 7–14 noites só fechavam saídas até ~27/jul.
- **A volta pousa às 02:20** — pernoite forçado nas duas pontas. Perder o voo custa 3–4 dias (frequência 2x/semana).
- **Regra das 4h (ANAC Res. 400):** atraso de 3h59 no doméstico = zero direito e conexão perdida. Bilhetes separados = contratos separados; mesma companhia não muda.
- **O Nordeste está invertido:** voos NE→Europa são MAIS caros que de SP apesar de mais curtos (ocupação ~90%). Os R$ 246 do Recife são ruído. Taxa de embarque também joga contra: GRU R$ 64,56 < Manaus R$ 97,73 < Recife R$ 100,62.
- **Febre amarela:** Manaus→Caribe conecta em Panamá/Bogotá; Colômbia exige vacina desde mar/2026, prazo ~15 dias.
- **Milhas não salvam:** Smiles não remarca bilhete-prêmio — só cancela a R$ 300/trecho/passageiro. Cancelar um GRU↔MAO de 2 pax custa R$ 1.200 contra R$ 817 do resgate. Desistir custa mais que a viagem.

**Nenhuma hipótese estrutural sobreviveu.** Zona Franca não toca bilhete de passageiro; taxa de embarque favorece GRU. O que resta é demanda rala — que é volátil por construção, o oposto de padrão.

Religar exige, nesta ordem: preço do trecho doméstico (Travelpayouts) para calcular economia LÍQUIDA; janela de sazonalidade e frequência da ida E da volta; trava sanitária; e checar se a cia vende em bilhete único (se vender, o risco evapora).

**Por que não é campo de milhas:** o gargalo não é saldo — é disponibilidade de resgate para 2 pessoas nas datas seg/sex de um voo 2x/semana sazonal. Um campo de saldo não ajudaria nisso, e apodreceria (não há API que leia saldo).

## O que este app NÃO faz, e por quê

**Não pega tarifa errada (bug fare).** É o achado desconfortável da pesquisa: os portais monetizam por afiliado (~35% de comissão em passagem), e tarifa errada **não paga comissão** — a companhia cancela a venda. Publicar bug é custo puro para eles. O bug real circula em grupo fechado de WhatsApp/Telegram, por convite, não indexável. Raspando portal monetizado você herda o viés dele: muita Mega Promo comissionada, quase nenhum bug. Além disso bug dura 30min–2h e o cron do GitHub Actions atrasa. E o STJ já decidiu (caso Decolar/KLM) que a companhia não é obrigada a emitir bilhete com preço de erro grosseiro.

Se quiser o wow de verdade, o caminho é humano: entrar nas rodas fechadas. O app então filtraria o que chega lá.

**Não compete com o alerta do Google Flights** em velocidade nem exclusividade. O diferencial é o cruzamento que nenhum deles faz: seus filtros + sem visto + custo de vida + sync do casal.

## Custo

**~US$ 3,60/mês**, medido em execução real (não estimado): ~2.700 tokens de entrada e ~400 de saída por matéria, = **US$ 0,024/matéria** no Opus 4.8 ($5/$25 por MTok). O Melhores Destinos publica ~5 promoções de voo/dia que passam pelo slug → ~150 matérias/mês.

A entrada é dominada pelo schema e pelo system prompt (~2.400 tokens), não pelo artigo (~250). Se o custo virar problema, é o schema que se enxuga — não o recorte.

O que segura o custo: o slug tria de graça (corta cupom, seguro, hotel, pacote e cruzeiro antes de qualquer token), e o recorte joga fora o menu e o widget — que não são só ruído caro, são ruído *perigoso*, porque o menu contém "Passagens Aéreas", "Hotéis" e "Seguro Viagem", exatamente as palavras que o extrator usa para classificar a matéria.

Prompt caching não vale aqui: o mínimo cacheável no Opus 4.8 é 4.096 tokens e o system prompt não chega perto — marcar `cache_control` só pagaria o prêmio de escrita sem nunca ler. O `run.mjs` imprime o custo real de cada rodada, para custo nunca ser surpresa.

## O que falta

- [ ] **Testar o extrator com chave real** — nunca rodou. É o primeiro passo.
- [ ] Confirmar que o IP de datacenter do GitHub Actions não toma 403 (o Garoa documenta esse problema com outro site; o Melhores Destinos usa gocache, não Cloudflare, então o risco é menor — mas não é zero, e só a primeira rodada da Action prova).
- [ ] Dataset de visto com fonte oficial + data (é o que faz o app ser diferente do Google, e o item que, se errar, barra no embarque — ver o caso do México, que exige visto de brasileiros desde 2022).
- [ ] Motor de grade (Travelpayouts) para baseline histórico: sem série, "R$ 2.900" não significa nada. Precisa do token — a Amadeus, que seria a escolha óbvia, foi descomissionada em 17/07/2026.
- [ ] PWA SvelteKit em GitHub Pages lendo `static/data/ofertas.json`, com sync do casal pelo padrão de código via WhatsApp.
- [ ] Segunda fonte (para a deduplicação virar sinal de confiança em vez de código morto).
