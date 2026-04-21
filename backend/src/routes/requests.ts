import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { RequestStatus } from '@prisma/client'

const requests = new Hono()
requests.use('*', authMiddleware)

const formatRequest = (r: any) => ({
  ...r,
  categories: JSON.parse(r.categories || '[]'),
  createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString().slice(0, 10) : r.createdAt,
  updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString().slice(0, 10) : r.updatedAt,
})

// GET /api/requests — ดึงรายการตาม role
requests.get('/', async (c) => {
  const user = c.get('user')
  const where = user.role === 'employee' ? { createdBy: user.id } : {}

  const data = await prisma.purchaseRequest.findMany({
    where,
    include: { items: true },
    orderBy: { updatedAt: 'desc' },
  })

  return c.json(data.map(formatRequest))
})

// GET /api/requests/:id — ดูรายละเอียด
requests.get('/:id', async (c) => {
  const { id } = c.req.param()
  const data = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!data) return c.json({ error: 'Not found' }, 404)
  return c.json(formatRequest(data))
})

// POST /api/requests — สร้างใบขอซื้อ
requests.post('/', requireRole('employee'), async (c) => {
  const user = c.get('user')
  const body = await c.req.json()

  const count = await prisma.purchaseRequest.count()
  const year = new Date().getFullYear() + 543
  const reqNo = `PR-${year}-${String(count + 1).padStart(3, '0')}`

  const data = await prisma.purchaseRequest.create({
    data: {
      reqNo,
      title: body.title,
      reason: body.reason || '',
      category: body.category,
      categories: JSON.stringify(body.categories || []),
      totalAmount: body.totalAmount,
      supplierName: body.supplierName,
      supplierName2: body.supplierName2 || '',
      paymentMethod: body.paymentMethod,
      paymentTiming: body.paymentTiming,
      orderDate: body.orderDate,
      deliveryDate: body.deliveryDate,
      dueDate: body.dueDate,
      contactName: body.contactName,
      signedDate: body.signedDate,
      createdBy: user.id,
      createdByName: user.name,
      items: { create: body.items },
    },
    include: { items: true },
  })

  return c.json(formatRequest(data), 201)
})

// PATCH /api/requests/:id/status — อัปเดตสถานะ
requests.patch('/:id/status', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const body = await c.req.json()

  // Role guard สำหรับแต่ละ action
  const allowedActions: Record<string, string[]> = {
    purchasing: ['purchasing', 'rejected'],
    accounting: ['accounting'],
    transferred: ['accounting'],
    rejected: ['purchasing'],
  }

  const allowed = allowedActions[body.status]
  if (allowed && !allowed.includes(user.role)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const updated = await prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: body.status as RequestStatus,
      prNo: body.prNo,
      poNo: body.poNo,
      prFile: body.prFile,
      poFile: body.poFile,
      transferRef: body.transferRef,
      transferDate: body.transferDate,
      notes: body.notes,
    },
    include: { items: true },
  })

  return c.json(formatRequest(updated))
})

export default requests
