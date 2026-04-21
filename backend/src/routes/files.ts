import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth.js'
import { writeFile, readFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const router = new Hono()

const UPLOAD_DIR = path.resolve('./uploads')
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true })

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
}

// POST /api/files — อัปโหลดไฟล์
router.post('/', authMiddleware, async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || typeof file === 'string') {
    return c.json({ error: 'ไม่พบไฟล์' }, 400)
  }

  const ext = path.extname(file.name).toLowerCase()
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  await writeFile(path.join(UPLOAD_DIR, safeName), Buffer.from(await file.arrayBuffer()))

  return c.json({ url: `/api/files/${safeName}`, name: file.name })
})

// GET /api/files/:filename — เสิร์ฟไฟล์ (public — filename เป็น random UUID)
router.get('/:filename', async (c) => {
  const { filename } = c.req.param()

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return c.json({ error: 'Invalid filename' }, 400)
  }

  const filePath = path.join(UPLOAD_DIR, filename)
  try {
    const data = await readFile(filePath)
    const ext = path.extname(filename).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch {
    return c.json({ error: 'File not found' }, 404)
  }
})

export default router
