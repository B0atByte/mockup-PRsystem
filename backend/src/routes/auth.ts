import { Hono } from 'hono'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { parseBody } from '../lib/validate.js'
import { getClientIp, isLocked, recordFailure, recordSuccess, unlockIp, getLockedIps } from '../lib/rateLimiter.js'
import { addToBlacklist } from '../lib/tokenBlacklist.js'

const auth = new Hono()

const loginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอก username'),
  password: z.string().min(1, 'กรุณากรอก password'),
})

auth.post('/login', async (c) => {
  const ip = getClientIp(c)

  const result = await parseBody(c, loginSchema)
  if (!(result as any).data) return result as unknown as Response
  const { username, password } = (result as any).data

  const user = await prisma.user.findUnique({ where: { username } })

  // itsupport ข้าม IP lock ได้ — เพื่อให้ปลดล็อก IP ที่ถูกบล็อกได้เสมอ
  const isItsupport = user?.role === 'itsupport' && user?.active

  if (!isItsupport && isLocked(ip)) {
    return c.json({ error: 'IP นี้ถูกล็อกชั่วคราว เนื่องจากพยายาม login ผิดเกินกำหนด กรุณาติดต่อ IT Support' }, 429)
  }

  if (!user || !user.active) {
    const { locked, remaining } = recordFailure(ip)
    const msg = locked
      ? 'IP ถูกล็อกแล้ว เนื่องจากพยายาม login ผิดเกินกำหนด กรุณาติดต่อ IT Support'
      : `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`
    return c.json({ error: msg }, locked ? 429 : 401)
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    if (!isItsupport) {
      const { locked, remaining } = recordFailure(ip)
      const msg = locked
        ? 'IP ถูกล็อกแล้ว เนื่องจากพยายาม login ผิดเกินกำหนด กรุณาติดต่อ IT Support'
        : `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลืออีก ${remaining} ครั้ง)`
      return c.json({ error: msg }, locked ? 429 : 401)
    }
    return c.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401)
  }

  // itsupport ไม่ clear lock — เพื่อให้เห็น IP ที่ถูกล็อกอยู่และปลดล็อกเองได้
  if (!isItsupport) recordSuccess(ip)
  const token = signToken({ id: user.id, role: user.role, name: user.name })
  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      active: user.active,
    },
  })
})

// POST /api/auth/logout — เพิ่ม token เข้า blacklist ทันที
auth.post('/logout', authMiddleware, (c) => {
  const token = c.req.header('Authorization')?.slice(7) || ''
  const payload = c.get('user') as any
  const exp = payload?.exp || Math.floor(Date.now() / 1000) + 8 * 3600
  if (token) addToBlacklist(token, exp)
  return c.json({ ok: true })
})

// GET /api/auth/locked-ips — itsupport ดู IP ที่ถูกล็อก
auth.get('/locked-ips', authMiddleware, requireRole('itsupport'), (c) => {
  return c.json(getLockedIps())
})

// DELETE /api/auth/locked-ips/:ip — itsupport ปลดล็อก IP
auth.delete('/locked-ips/:ip', authMiddleware, requireRole('itsupport'), (c) => {
  const ip = decodeURIComponent(c.req.param('ip'))
  const ok = unlockIp(ip)
  if (!ok) return c.json({ error: 'ไม่พบ IP นี้ในรายการล็อก' }, 404)
  return c.json({ ok: true, message: `ปลดล็อก ${ip} แล้ว` })
})

auth.get('/me', authMiddleware, async (c) => {
  const { id } = c.get('user')
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, name: true, email: true, role: true, active: true, createdAt: true },
  })
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json(user)
})

export default auth
