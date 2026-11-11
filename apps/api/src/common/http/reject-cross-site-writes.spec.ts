import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { rejectCrossSiteWrites } from './reject-cross-site-writes.js';

const APP = 'http://localhost:5173';

function run(method: string, headers: Record<string, string>) {
  const request = {
    method,
    get: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
  const json = vi.fn();
  const response = { status: vi.fn(() => ({ json })) } as unknown as Response;
  const next = vi.fn() as NextFunction;
  rejectCrossSiteWrites(APP)(request, response, next);
  return vi.mocked(next).mock.calls.length === 1 ? 'allowed' : 'refused';
}

describe('rejectCrossSiteWrites', () => {
  it.each([
    [
      'GET from anywhere',
      'GET',
      { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' },
    ],
    ['POST from our own page', 'POST', { 'sec-fetch-site': 'same-origin', origin: APP }],
    ['POST without browser headers (curl, tests, mobile)', 'POST', {}],
    ['POST from our origin, older browser', 'POST', { origin: APP }],
  ])('allows: %s', (_case, method, headers) => {
    expect(run(method, headers)).toBe('allowed');
  });

  it.each([
    [
      'POST from another site',
      'POST',
      { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' },
    ],
    ['DELETE from another site, older browser', 'DELETE', { origin: 'https://evil.example' }],
    [
      'PATCH from a sibling subdomain',
      'PATCH',
      { 'sec-fetch-site': 'same-site', origin: 'https://x.localhost' },
    ],
  ])('refuses: %s', (_case, method, headers) => {
    expect(run(method, headers)).toBe('refused');
  });
});
