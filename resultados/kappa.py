# /// script
# requires-python = ">=3.11"
# dependencies = ["statsmodels", "scikit-learn"]
# ///
"""Concordância entre anotadores sobre o conjunto canônico (subpasta v3).

Fleiss' kappa via statsmodels; Cohen's kappa (par a par) via scikit-learn.
Os 3 modelos são tratados como anotadores. Cada item é a decisão binária
presente/ausente de uma categoria Sx em uma notícia (10 notícias × 5 = 50 itens).

Uso:  uv run kappa.py      (uv instala statsmodels/sklearn num env efêmero)
"""
import json
import itertools
from pathlib import Path

from statsmodels.stats.inter_rater import fleiss_kappa
from sklearn.metrics import cohen_kappa_score

HERE = Path(__file__).resolve().parent / "v3"  # conjunto canônico (3 anotadores)
models = ["deepseek-v4-pro", "gpt-5.4", "claude-sonnet-4.6"]
news = [f"N{n:02d}" for n in range(1, 11)]
cats = ["S1", "S2", "S3", "S4", "S5"]


def load(n, m):
    j = json.loads((HERE / f"{n}-{m}.json").read_text(encoding="utf-8"))
    if isinstance(j, list):
        j = j[0]
    return j


present = {}
for n in news:
    for m in models:
        j = load(n, m)
        for s in j["analise"]["sinais"]:
            present[(n, s["sinal"], m)] = bool(s["presente"])


def tabela(counts):
    """Matriz Fleiss: cada linha é um item = [n_presente, n_ausente]."""
    return [[p, len(models) - p] for p in counts]


# --- Fleiss global (50 itens) ---
counts_glob = [sum(present[(n, c, m)] for m in models) for n in news for c in cats]
up = sum(1 for p in counts_glob if p == len(models))
ua = sum(1 for p in counts_glob if p == 0)
dv = len(counts_glob) - up - ua
prop = sum(counts_glob) / (len(counts_glob) * len(models))
k = fleiss_kappa(tabela(counts_glob), method="fleiss")

print(f"Itens: {len(counts_glob)} | unan_pres={up} unan_aus={ua} "
      f"unanim={up+ua} ({100*(up+ua)/len(counts_glob):.0f}%) diverg={dv}")
print(f"Prop. presente: {prop:.3f}")
print(f"Fleiss kappa (global, {len(counts_glob)} itens): {k:.3f}")

# --- Fleiss por categoria (10 itens cada) ---
print("Por categoria:")
for c in cats:
    counts = [sum(present[(n, c, m)] for m in models) for n in news]
    kc = fleiss_kappa(tabela(counts), method="fleiss")
    pc = sum(counts) / (len(counts) * len(models))
    print(f"  {c}: kappa={kc:.3f} (prop pres={pc:.2f})")

# --- Par a par: Cohen kappa (corrigido por acaso) + % concordância bruta ---
print("Par a par (Cohen kappa / % concordancia):")
for a, b in itertools.combinations(models, 2):
    ya = [present[(n, c, a)] for n in news for c in cats]
    yb = [present[(n, c, b)] for n in news for c in cats]
    ck = cohen_kappa_score(ya, yb)
    agree = sum(1 for x, y in zip(ya, yb) if x == y)
    print(f"  {a} vs {b}: cohen={ck:.3f}  ({agree}/50 = {100*agree/50:.0f}%)")
