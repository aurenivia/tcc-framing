# tcc-framing

Corpus, protocolo e resultados do TCC **"LLMs como Anotadores de Enquadramento
Jornalístico: Desenvolvimento e Avaliação de um Protocolo Estruturado para Notícias
Brasileiras"** (CI/UFPB).

Um protocolo de análise discursiva (5 categorias S1–S5, 22 subcritérios) é aplicado
por três modelos de linguagem — GPT-5.4, DeepSeek V4 Pro e Claude Sonnet 4.6 — às
mesmas 10 notícias brasileiras. Resultado: 30 relatórios com saída estruturada, em
que cada achado é ancorado num trecho literal do texto.

## Estrutura

```
noticias/       10 notícias (N01–N10), uma por arquivo JSON
prompts/        system prompt de cada versão do protocolo
├── v0-sem-protocolo.txt   condição de linha de base
├── v1.txt                 5 sinais em lista plana
├── v2.txt                 campo booleano por categoria
└── v3.txt                 versão final, 22 subcritérios
resultados/     análises por versão do protocolo
├── v0/         1 arquivo (linha de base)
├── v1/         16 arquivos
├── v2/         16 arquivos
├── v3/         30 arquivos — 3 modelos × 10 notícias, conjunto do Capítulo 4
├── kappa.py    concordância entre modelos
└── README.md   procedência e valores
codigo/
└── processamento.ipynb    pipeline completo, célula a célula
webapp/         leitor dos relatórios (React + Vite)
```

## O que roda

### `resultados/kappa.py` — recalcula a concordância

```bash
cd resultados
uv run kappa.py
```

`uv` resolve `statsmodels` e `scikit-learn` pelos metadados inline do script.

### `codigo/processamento.ipynb` — o pipeline inteiro

Carrega o corpus e o protocolo, aplica os três modelos, valida a saída contra um
schema, verifica se cada trecho citado existe literalmente na notícia e calcula o κ.
Os caminhos são resolvidos a partir da raiz do repositório, então funciona num clone
sem configuração.

```bash
python -m pip install litellm pydantic
jupyter lab codigo/processamento.ipynb
```

Roda offline por padrão, lendo `resultados/v3/`. Para chamar os modelos de verdade é
preciso `OPENROUTER_API_KEY` no ambiente.

### `webapp/` — leitor dos relatórios

Mostra o texto da notícia com os trechos grifados por categoria, lado a lado com o
relatório do modelo selecionado.

```bash
cd webapp
npm install
npm run dev
```

`npm run dev` inclui a análise ao vivo de uma notícia nova (precisa de
`OPENROUTER_API_KEY` num arquivo `.env`; a chave fica no servidor e nunca vai para o
navegador). `npm run build:pages` gera a versão estática, sem essa parte.

## Licença

Código sob MIT; prompts e resultados sob CC BY 4.0. As notícias em `noticias/`
pertencem aos veículos originais, identificados no campo `url` de cada arquivo, e
estão aqui apenas para permitir a verificação das análises. Ver `LICENSE`.
