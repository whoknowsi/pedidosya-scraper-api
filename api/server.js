import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static.module'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))
app.get('/static/*', serveStatic({ root: './' }))

export default app
