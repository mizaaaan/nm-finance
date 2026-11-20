import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { accessLevel, authorize, verifyJwt } from '../netlify/functions/_shared/auth.js'
import { JWT_SECRET, setEnv, signJwt } from './helpers.js'

let restore
beforeEach(() => {
  restore = setEnv({
    JWT_SECRET,
    ADMIN_EMAILS: 'Admin@Example.com, second@example.com',
    MEMBER_EMAILS: 'member@example.com',
    ALLOW_ANY_SIGNED_IN_USER: undefined,
    URL: undefined,
    DEPLOY_URL: undefined
  })
})
afterEach(() => restore())

describe('verifyJwt', () => {
  test('accepts a valid token', () => {
    assert.equal(verifyJwt(signJwt({ email: 'a@b.co' }))?.email, 'a@b.co')
  })
  test('rejects a token signed with another secret', () => {
    assert.equal(verifyJwt(signJwt({}, { secret: 'something-else' })), null)
  })
  test('rejects a tampered payload', () => {
    const [h, , s] = signJwt({ email: 'a@b.co' }).split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 'x', email: 'admin@example.com', exp: 9999999999 })).toString('base64url')
    assert.equal(verifyJwt(`${h}.${forged}.${s}`), null)
  })
  test('rejects an expired token', () => {
    assert.equal(verifyJwt(signJwt({}, { expiresIn: -10 })), null)
  })
  test('rejects a token with no expiry', () => {
    assert.equal(verifyJwt(signJwt({ exp: null })), null)
  })
  test('rejects alg "none" and other algorithms', () => {
    assert.equal(verifyJwt(signJwt({}, { header: { alg: 'none', typ: 'JWT' } })), null)
    assert.equal(verifyJwt(signJwt({}, { header: { alg: 'HS512', typ: 'JWT' } })), null)
  })
  test('rejects garbage', () => {
    for (const bad of ['', 'abc', 'a.b', 'a.b.c', '...', null, undefined]) assert.equal(verifyJwt(bad), null)
  })
  test('rejects everything when no secret is configured', () => {
    assert.equal(verifyJwt(signJwt({}), ''), null)
  })
})

describe('accessLevel', () => {
  test('there is no hard-coded admin: an unknown email has no access', () => {
    assert.equal(accessLevel({ email: 'former.admin@example.com' }), 'none')
  })
  test('admin by ADMIN_EMAILS (case-insensitive, trimmed)', () => {
    assert.equal(accessLevel({ email: 'admin@example.com' }), 'admin')
    assert.equal(accessLevel({ email: 'SECOND@example.com' }), 'admin')
  })
  test('admin by Identity role', () => {
    assert.equal(accessLevel({ email: 'x@y.z', app_metadata: { roles: ['admin'] } }), 'admin')
    assert.equal(accessLevel({ email: 'x@y.z', app_metadata: { roles: ['Admin'] } }), 'admin')
  })
  test('member by MEMBER_EMAILS or role', () => {
    assert.equal(accessLevel({ email: 'member@example.com' }), 'member')
    assert.equal(accessLevel({ email: 'x@y.z', app_metadata: { roles: ['member'] } }), 'member')
  })
  test('a signed-in stranger has no access', () => {
    assert.equal(accessLevel({ email: 'stranger@example.com' }), 'none')
    assert.equal(accessLevel({ email: 'stranger@example.com', app_metadata: { roles: ['other'] } }), 'none')
    assert.equal(accessLevel(null), 'none')
    assert.equal(accessLevel({}), 'none')
  })
  test('ALLOW_ANY_SIGNED_IN_USER=true lets strangers read but never write', () => {
    process.env.ALLOW_ANY_SIGNED_IN_USER = 'true'
    assert.equal(accessLevel({ email: 'stranger@example.com' }), 'member')
  })
  test('an empty email never matches an empty list entry', () => {
    process.env.ADMIN_EMAILS = ''
    assert.equal(accessLevel({ email: '' }), 'none')
  })
})

describe('authorize', () => {
  const req = (token) => new Request('http://localhost/api/x', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

  test('401 without a token', async () => {
    const { response } = await authorize(req(), {}, 'read')
    assert.equal(response.status, 401)
  })
  test('401 with an invalid token', async () => {
    const { response } = await authorize(req('nope'), {}, 'read')
    assert.equal(response.status, 401)
  })
  test('403 ACCESS_PENDING for a signed-in stranger', async () => {
    const { response } = await authorize(req(signJwt({ email: 'stranger@example.com' })), {}, 'read')
    assert.equal(response.status, 403)
    assert.equal((await response.json()).code, 'ACCESS_PENDING')
  })
  test('members may read but not write', async () => {
    const token = signJwt({ email: 'member@example.com' })
    assert.ok((await authorize(req(token), {}, 'read')).user)
    const { response } = await authorize(req(token), {}, 'admin')
    assert.equal(response.status, 403)
    assert.equal((await response.json()).code, 'ADMIN_REQUIRED')
  })
  test('admins may do both', async () => {
    const token = signJwt({ email: 'admin@example.com' })
    assert.ok((await authorize(req(token), {}, 'read')).user)
    assert.ok((await authorize(req(token), {}, 'admin')).user)
  })
})
