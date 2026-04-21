import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { Role } from '@prisma/client'

const users = new Hono()
users.use('*', authMiddleware)
users.use('*', requireRole('itsupport'))

const safeUser = (u: any) => {
  const { password: _, ...rest } = u
  return rest
}

users.get('/', async (c) => {
  const data = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return c.json(data.map(safeUser))
})

users.post('/', async (c) => {
  const body = await c.req.json()
  const hashed = await bcrypt.hash(body.password || '1234', 10)
  const user = await prisma.user.create({
    data: {
      username: body.username,
      password: hashed,
      name: body.name,
      email: body.email,
      role: body.role as Role,
      active: body.active ?? true,
    },
  })
  return c.json(safeUser(user), 201)
})

users.put('/:id', async (c) => {
  const { id } = c.req.param()
  const body = await c.req.json()

  const data: any = {
    name: body.name,
    username: body.username,
    email: body.email,
    role: body.role as Role,
    active: body.active ?? true,
  }
  if (body.password) data.password = await bcrypt.hash(body.password, 10)

  try {
    const user = await prisma.user.update({ where: { id }, data })
    return c.json(safeUser(user))
  } catch (err: any) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('email') ? 'Email' : 'Username'
      return c.json({ error: `${field} นี้ถูกใช้งานแล้ว` }, 400)
    }
    throw err
  }
})

users.delete('/:id', async (c) => {
  const { id } = c.req.param()
  await prisma.user.delete({ where: { id } })
  return c.json({ ok: true })
})

// Reset password → '1234'
users.post('/:id/reset-password', async (c) => {
  const { id } = c.req.param()
  const hashed = await bcrypt.hash('1234', 10)
  await prisma.user.update({ where: { id }, data: { password: hashed } })
  return c.json({ ok: true })
})

export default users
