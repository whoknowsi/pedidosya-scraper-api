import { Hono } from 'hono'
import { serveStatic } from 'hono/serve-static.module'
import products from '../assets/static/db/products.json'
const app = new Hono()

app.get('/', (c) => c.text('Hono!!'))

app.get('/products', (c) => {
  const { offset = 0, limit = 10 } = c.req.queries
  const productsToSend = products.slice(offset, offset + limit)

  c.json({
    products: productsToSend,
    offset,
    limit,
    count: productsToSend.length,
    max: products.length,
    prev: offset ? `/products?limit=${limit}&offset${Math.max(0, offset - limit)}` : null,
    next: products.length > (offset + 1) ? `/products?limit=${limit}&offset${offset + limit}` : null
  })
})

app.get('/products/:id', (c) => {
  const { id } = c.req.param
  const foundProduct = products.find((product) => product.id === id)

  foundProduct ? c.json(foundProduct) : c.status(400).json({ message: 'Product not found' })
})

app.get('/static/*', serveStatic({ root: './' }))

export default app
