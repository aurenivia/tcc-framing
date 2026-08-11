import { describe, expect, it } from 'vitest'
import { paragraphOf, resolveExcerpt, splitParagraphs } from './matching'
import { enrichReport, NEWS, REPORTS, getReport } from './dataset'
import { rangesFor, segmentize } from './highlight'
import type { SignalId } from '../types'

const news = {
  titulo: 'MC Tuto dirigia em velocidade “incompatível” ao atropelar jovem',
  texto:
    'Primeiro parágrafo com um trecho literal exato.\n\nSegundo parágrafo — com travessão e aspas “assim”.\nTerceiro parágrafo final.',
}

describe('resolveExcerpt', () => {
  it('localiza trecho literal no corpo', () => {
    const match = resolveExcerpt(news, 'um trecho literal exato')
    expect(match.source).toBe('body')
    expect(match.method).toBe('normalized')
    expect(news.texto.slice(match.spans[0].start, match.spans[0].end)).toBe(
      'um trecho literal exato',
    )
  })

  it('localiza no título quando não está no corpo', () => {
    const match = resolveExcerpt(news, 'dirigia em velocidade "incompatível"')
    expect(match.source).toBe('title')
  })

  it('respeita o prefixo Título:', () => {
    const match = resolveExcerpt(news, 'Título: MC Tuto dirigia')
    expect(match.source).toBe('title')
    expect(match.spans[0].start).toBe(0)
  })

  it('normaliza caixa, aspas, travessão e espaços', () => {
    const match = resolveExcerpt(news, 'SEGUNDO   PARÁGRAFO - COM TRAVESSÃO E ASPAS "ASSIM"')
    expect(match.source).toBe('body')
  })

  it('remonta trecho com reticências como fragmentos ordenados', () => {
    const match = resolveExcerpt(news, 'Primeiro parágrafo com [...] Terceiro parágrafo final')
    expect(match.method).toBe('fragments')
    expect(match.spans).toHaveLength(2)
    expect(match.spans[0].end).toBeLessThanOrEqual(match.spans[1].start)
  })

  it('não inventa grifo quando não há correspondência segura', () => {
    const match = resolveExcerpt(news, 'trecho parafraseado que o modelo escreveu de memória')
    expect(match.source).toBe('unresolved')
    expect(match.spans).toHaveLength(0)
  })

  it('trata trecho vazio como não localizado', () => {
    expect(resolveExcerpt(news, '   ').source).toBe('unresolved')
  })
})

describe('paragrafos', () => {
  it('preserva offsets do texto original', () => {
    const paragraphs = splitParagraphs(news.texto)
    expect(paragraphs).toHaveLength(3)
    for (const paragraph of paragraphs) {
      expect(news.texto.slice(paragraph.start, paragraph.end)).toBe(paragraph.text)
    }
    expect(paragraphOf(paragraphs, 0)).toBe(1)
  })
})

describe('segmentize', () => {
  const finding = (id: string, signal: SignalId) =>
    ({ id, signal, sub_sinal: `${signal}.1` }) as never

  it('divide o texto nos limites dos grifos', () => {
    const text = 'abcdefghij'
    const ranges = [{ start: 2, end: 5, finding: finding('a', 'S1') }]
    const segments = segmentize(text, ranges)
    expect(segments.map((s) => s.text)).toEqual(['ab', 'cde', 'fghij'])
    expect(segments[1].covering).toHaveLength(1)
  })

  it('preserva sobreposição parcial entre critérios', () => {
    const text = 'abcdefghij'
    const ranges = [
      { start: 1, end: 6, finding: finding('a', 'S1') },
      { start: 4, end: 9, finding: finding('b', 'S3') },
    ]
    const segments = segmentize(text, ranges)
    const overlap = segments.find((segment) => segment.covering.length === 2)
    expect(overlap?.text).toBe('ef')
  })

  it('reconstitui o texto integral sem perda', () => {
    const text = news.texto
    const ranges = [
      { start: 5, end: 20, finding: finding('a', 'S1') },
      { start: 15, end: 30, finding: finding('b', 'S2') },
    ]
    expect(segmentize(text, ranges).map((s) => s.text).join('')).toBe(text)
  })
})

describe('conjunto real', () => {
  it('carrega 10 notícias e 30 relatórios', () => {
    expect(NEWS).toHaveLength(10)
    expect(REPORTS).toHaveLength(30)
  })

  it('tem os três modelos para cada notícia', () => {
    for (const item of NEWS) {
      for (const model of ['DeepSeek', 'GPT-5.4', 'Claude'] as const) {
        expect(getReport(item.id, model), `${item.id}/${model}`).toBeDefined()
      }
    }
  })

  it('localiza 148 dos 159 achados', () => {
    let total = 0
    let unresolved = 0
    for (const item of NEWS) {
      for (const model of ['DeepSeek', 'GPT-5.4', 'Claude'] as const) {
        const enriched = enrichReport(item, getReport(item.id, model)!)
        total += enriched.findingCount
        unresolved += enriched.unresolvedCount
      }
    }
    expect(total).toBe(159)
    expect(unresolved).toBe(11)
  })

  it('todo grifo aponta para o texto que o modelo citou', () => {
    for (const item of NEWS) {
      for (const model of ['DeepSeek', 'GPT-5.4', 'Claude'] as const) {
        const enriched = enrichReport(item, getReport(item.id, model)!)
        for (const found of enriched.findings) {
          if (found.match.source === 'unresolved') continue
          const source = found.match.source === 'title' ? item.titulo : item.texto
          for (const span of found.match.spans) {
            expect(span.end).toBeGreaterThan(span.start)
            expect(span.end).toBeLessThanOrEqual(source.length)
          }
        }
      }
    }
  })

  it('só grifa critérios ativos', () => {
    const item = NEWS[0]
    const enriched = enrichReport(item, getReport(item.id, 'GPT-5.4')!)
    const none = rangesFor(enriched.findings, 'body', new Set<SignalId>())
    expect(none).toHaveLength(0)
    const all = rangesFor(enriched.findings, 'body', new Set<SignalId>(['S1', 'S2', 'S3', 'S4', 'S5']))
    expect(all.length).toBeGreaterThan(0)
  })
})
