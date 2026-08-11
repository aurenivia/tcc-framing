# Leitor de Relatórios de Enquadramento — React

Implementação em React do aplicativo-demo descrito em [`aplicativo-demo.md`](../aplicativo-demo.md).
Duas partes: um **leitor** local do dataset pré-gerado (somente leitura) e uma
**análise ao vivo** que extrai o texto de uma URL (ou aceita texto colado) e roda
os 3 modelos (DeepSeek V4 Pro, GPT-5.4, Claude Sonnet 4.6) via OpenRouter, com o
protocolo v3, renderizando o resultado no mesmo leitor.

## Executar

```bash
cd webapp && npm install && npm run dev
```

Endereço padrão: <http://localhost:5173>

Para a análise ao vivo, coloque a chave do OpenRouter em `webapp/.env`:

```
OPENROUTER_API_KEY=sk-or-...
```

A chamada aos modelos e a extração da URL rodam no servidor do Vite (plugin em
`server/`), então a chave nunca vai para o bundle do navegador. Clique em
**"+ Analisar nova notícia"** na barra lateral.

| Script | O que faz |
|---|---|
| `npm run dev` | gera o dataset e sobe o Vite |
| `npm run build` | gera o dataset, checa tipos e compila para `dist/` |
| `npm test` | roda os testes de matching e do conjunto real |

## Dados

`scripts/build-dataset.mjs` lê `noticias/*.json` (10 notícias) e
`resultados/v3/*.json` (30 relatórios) e escreve `src/data/dataset.json`.
As duas pastas são procuradas subindo a partir do diretório do webapp.
Nada é buscado em rede; o arquivo gerado não é versionado. Um dos relatórios
(`N09-deepseek-v4-pro.json`) vem embrulhado em uma lista — o script desembrulha.

## Estrutura

```text
webapp/
├── server/analyze.mjs            # extração de URL + chamada aos 3 modelos (v3)
├── server/api-plugin.mjs         # plugin Vite: POST /api/analyze (dev e preview)
├── scripts/build-dataset.mjs     # noticias/ e resultados/ → src/data/dataset.json
├── src/
│   ├── components/NewAnalysis.tsx # formulário URL / texto colado
│   ├── lib/analyze.ts            # fetch para /api/analyze
│   ├── App.tsx                   # estado: notícia, modelo, critérios, foco
│   ├── lib/matching.ts           # localização literal dos trechos
│   ├── lib/highlight.ts          # segmentação e sobreposição dos grifos
│   ├── lib/dataset.ts            # índice e enriquecimento dos relatórios
│   ├── lib/signals.ts            # S1–S5, subcritérios, modelos, paleta
│   ├── components/Sidebar.tsx    # busca, filtros, lista, contagens X/5
│   ├── components/ReportHeader.tsx # modelo, cabeçalho, métricas, filtro de grifos
│   ├── components/Reader.tsx     # notícia com grifos no título e no corpo
│   ├── components/FindingsPanel.tsx # síntese, raciocínio, grupos e cartões
│   └── styles.css                # identidade visual
└── src/lib/matching.test.ts      # 16 testes (Vitest)
```

## Localização dos trechos

Sem busca aproximada silenciosa. A ordem é: corpo → título (invertida quando o
trecho começa com `Título:`), sobre uma normalização conservadora de caixa,
espaços, aspas e travessões; trecho com reticências vira uma sequência ordenada
de fragmentos, cada um casado depois do anterior. Sem correspondência segura, o
achado fica **sem grifo** e o cartão recebe a marca `não localizado literalmente`.

No conjunto atual: **159 achados, 148 localizados, 11 sem grifo** — verificado
pelos testes. O cabeçalho avisa quantos ficaram de fora em cada relatório.

Quando dois ou mais critérios cobrem o mesmo segmento, o fundo vira faixas
multicoloridas e o tooltip lista os subcritérios. O texto original nunca é
alterado: os grifos são recortes de índice sobre a string original.

## Segurança de renderização

Todo conteúdo dos JSONs entra na árvore como texto React (`{valor}`), nunca via
`dangerouslySetInnerHTML` — não há caminho para injeção de marcação ou script.
