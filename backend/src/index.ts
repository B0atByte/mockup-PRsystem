import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import auth from './routes/auth.js'
import requests from './routes/requests.js'
import users from './routes/users.js'
import audit from './routes/audit.js'
import files from './routes/files.js'
import settings from './routes/settings.js'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3456'],
  credentials: true,
}))
app.use('*', logger())

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

app.route('/api/auth', auth)
app.route('/api/requests', requests)
app.route('/api/users', users)
app.route('/api/audit', audit)
app.route('/api/files', files)
app.route('/api/settings', settings)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = parseInt(process.env.PORT || '3000')
serve({ fetch: app.fetch, port }, () => {
  console.log(`✅ Backend running → http://localhost:${port}`)
  console.log(`📋 Health check  → http://localhost:${port}/health`)
})
