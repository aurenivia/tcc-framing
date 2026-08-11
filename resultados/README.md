# resultados/

Análises produzidas por cada versão do protocolo. O conjunto que sustenta o
Capítulo 4 é o `v3/`; as pastas anteriores registram a evolução do protocolo.

## Conteúdo

| Pasta | O que é |
|---|---|
| `v0/` | `sem_protocolo.json` — condição de linha de base, sem protocolo |
| `v1/` | protocolo em lista plana de 5 sinais; 13 análises em 12 notícias, só DeepSeek (`deepseek-v4-pro` e `deepseek-chat-v3-0324`), mais os consolidados `resultados.json`, `resultados_ui.json` e `test_v2.json` |
| `v2/` | protocolo com campo booleano por categoria; mesma cobertura de `v1/` |
| `v3/` | protocolo final, 5 categorias e 22 subcritérios: **30 análises**, 10 notícias × 3 modelos (`deepseek-v4-pro`, `gpt-5.4`, `claude-sonnet-4.6`) |
| `kappa.py` | concordância entre os três modelos (Fleiss' κ e Cohen par a par) sobre `v3/` |

Só o `v3/` tem os três anotadores necessários para o κ. As versões anteriores
rodaram com um modelo só e servem para comparar o efeito de cada mudança no
protocolo, não para medir concordância.

## Concordância

```powershell
cd resultados
uv run kappa.py   # uv resolve statsmodels/scikit-learn via metadados inline
```

Um item é a decisão presente/ausente de uma categoria em uma notícia: 10 notícias
× 5 categorias = 50 itens, com os 3 modelos como anotadores.

> As saídas dos modelos não são totalmente determinísticas (mesmo com `temperature=0,1`);
> reexecuções do protocolo podem gerar pequenas variações.
