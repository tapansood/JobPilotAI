import { beforeEach, expect, it, vi } from 'vitest';
const service = vi.hoisted(() => ({
  requestLogin: vi.fn(),
  verifyLogin: vi.fn(),
}));
vi.mock('@/lib/auth/service', () => ({
  ...service,
  AuthError: class extends Error {
    status = 400;
  },
}));
import { POST as requestLogin } from './request/route';
import { POST as verifyLogin } from './verify/route';
beforeEach(() => vi.clearAllMocks());
function request(body: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin },
    body: JSON.stringify(body),
  });
}
it('accepts normalized requests and verification', async () => {
  expect(
    (
      await requestLogin(
        request({ type: 'EMAIL', identifier: 'A@Example.com' }),
      )
    ).status,
  ).toBe(200);
  expect(service.requestLogin).toHaveBeenCalledWith('EMAIL', 'a@example.com');
  expect(
    (
      await verifyLogin(
        request({ type: 'SMS', identifier: '+14155552671', token: '123456' }),
      )
    ).status,
  ).toBe(200);
});
it('rejects empty, malformed and cross-origin requests', async () => {
  expect((await requestLogin(request({}))).status).toBe(400);
  expect((await verifyLogin(request(null))).status).toBe(400);
  expect(
    (
      await verifyLogin(
        request({ type: 'EMAIL', identifier: 'a@example.com', token: '' }),
      )
    ).status,
  ).toBe(400);
  expect(
    (await requestLogin(request({}, 'https://other.example'))).status,
  ).toBe(400);
  expect(service.requestLogin).not.toHaveBeenCalled();
});
