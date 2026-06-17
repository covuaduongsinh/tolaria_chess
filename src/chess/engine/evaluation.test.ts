import { describe, expect, it } from 'vitest'
import { evalBarWhiteFraction, formatScore, normalizeScoreToWhite } from './evaluation'

describe('normalizeScoreToWhite', () => {
  it('passes white-to-move scores through unchanged', () => {
    expect(normalizeScoreToWhite({ type: 'cp', value: 50 }, 'white')).toEqual({ type: 'cp', value: 50 })
  })

  it('flips black-to-move scores to White perspective', () => {
    expect(normalizeScoreToWhite({ type: 'cp', value: 50 }, 'black')).toEqual({ type: 'cp', value: -50 })
    expect(normalizeScoreToWhite({ type: 'mate', value: 2 }, 'black')).toEqual({ type: 'mate', value: -2 })
  })
})

describe('formatScore', () => {
  it('formats centipawns as signed pawns', () => {
    expect(formatScore({ type: 'cp', value: 24 })).toBe('+0.24')
    expect(formatScore({ type: 'cp', value: -150 })).toBe('-1.50')
    expect(formatScore({ type: 'cp', value: 0 })).toBe('+0.00')
  })

  it('formats mate scores', () => {
    expect(formatScore({ type: 'mate', value: 3 })).toBe('M3')
    expect(formatScore({ type: 'mate', value: -2 })).toBe('-M2')
  })
})

describe('evalBarWhiteFraction', () => {
  it('puts an equal position near the middle', () => {
    expect(evalBarWhiteFraction({ type: 'cp', value: 0 })).toBeCloseTo(0.5, 5)
  })

  it('grows toward White as the advantage grows', () => {
    const small = evalBarWhiteFraction({ type: 'cp', value: 100 })
    const large = evalBarWhiteFraction({ type: 'cp', value: 600 })
    expect(small).toBeGreaterThan(0.5)
    expect(large).toBeGreaterThan(small)
    expect(large).toBeLessThanOrEqual(0.98)
  })

  it('pins the bar to the mating side', () => {
    expect(evalBarWhiteFraction({ type: 'mate', value: 2 })).toBeCloseTo(0.98, 5)
    expect(evalBarWhiteFraction({ type: 'mate', value: -2 })).toBeCloseTo(0.02, 5)
  })
})
