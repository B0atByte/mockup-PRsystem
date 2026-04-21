import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = new Hono()

const ensureSettings = () =>
  prisma.settings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

// GET /api/settings — ทุก role ดูได้
router.get('/', authMiddleware, async (c) => {
  const s = await ensureSettings()
  return c.json(s)
})

// PUT /api/settings — itsupport เท่านั้น
router.put('/', authMiddleware, requireRole('itsupport'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const s = await prisma.settings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      siteName: body.siteName || 'Casa Lapin',
      siteSubtitle: body.siteSubtitle || 'ระบบขอซื้อสินค้า',
      logoUrl: body.logoUrl || null,
      updatedBy: user.id,
      updatedByName: user.name,
    },
    update: {
      siteName: body.siteName || 'Casa Lapin',
      siteSubtitle: body.siteSubtitle || 'ระบบขอซื้อสินค้า',
      logoUrl: body.logoUrl ?? undefined,
      updatedBy: user.id,
      updatedByName: user.name,
    },
  })

  return c.json(s)
})

export default router
