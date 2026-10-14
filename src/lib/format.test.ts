import { describe, expect, it } from 'vitest'
import { formatINR, formatLakh } from './format'

describe('formatINR', () => {
  it('uses Indian grouping', () => {
    expect(formatINR(162000)).toBe('₹1,62,000')
    expect(formatINR(30000)).toBe('₹30,000')
  })
})

describe('formatLakh', () => {
  it('formats lakhs', () => {
    expect(formatLakh(162000)).toBe('₹1.62 lakh')
    expect(formatLakh(240000)).toBe('₹2.4 lakh')
  })
  it('keeps small amounts in rupees', () => {
    expect(formatLakh(30000)).toBe('₹30,000')
  })
  it('formats crores', () => {
    expect(formatLakh(25_000_000)).toBe('₹2.5 crore')
  })
})
