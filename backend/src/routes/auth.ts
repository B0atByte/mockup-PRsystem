import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { authMiddleware } from '../middleware/auth.js'

const auth = new Hono()

auth.post('/login', async (c) => {
  const { username, password } = await c.req.json()

  if (!username || !password) {
    return c.json({ error: 'กรุณากรอก username และ password' }, 400)
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !user.active) {
    return c.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401)
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return c.json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401)
  }

  const token = signToken({ id: user.id, role: user.role, name: user.name })
  const { password: _, ...userData } = user

  return c.json({ token, user: userData })
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
