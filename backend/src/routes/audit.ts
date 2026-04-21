import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.js'

const audit = new Hono()
audit.use('*', authMiddleware)

// GET — ดู log (itsupport, owner เท่านั้น)
audit.get('/', async (c) => {
  const user = c.get('user')
  if (!['itsupport', 'owner'].includes(user.role)) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 500,
  })
  return c.json(logs)
})

// POST — บันทึก log (ทุก role)
audit.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json()
  const log = await prisma.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: body.action,
      module: body.module,
      detail: body.detail,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '127.0.0.1',
    },
  })
  return c.json(log, 201)
})

export default audit
