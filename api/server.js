import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/serve-static.module'
import productsData from '../assets/static/db/products.json'
import categoriesData from '../assets/static/db/categories.json'
import marketsData from '../assets/static/db/markets.json'
const app = new Hono()

app.use('/*', cors())

app.get('/products', (c) => {
  let { offset, limit, marketId } = c.req.query()
  offset = offset ? Number(offset) : 0
  limit = limit ? Number(limit) : 10

  let max = productsData.length
  let productsToSend = productsData

  if (marketId) {
    const productsIdByMarket = marketsData.find((market) => market.id === marketId)?.products || []
    max = productsIdByMarket.length
    productsToSend = productsToSend
      .filter((product) => productsIdByMarket.includes(product.id))
      .map((product) => {
        const { prices, ...prod } = product
        return { ...prod, price: prices.find((price) => price.market === marketId)?.price || null }
      })
  }

  productsToSend = productsToSend.slice(offset, offset + limit)

  const prev = max > offset && offset > 0
    ? `/products?limit=${limit}&offset=${Math.max(0, offset - limit)}${marketId ? `&marketId=${marketId}` : ''}`
    : null

  const next = max > offset + limit
    ? `/products?limit=${limit}&offset=${offset + limit}${marketId ? `&marketId=${marketId}` : ''}`
    : null

  console.log(next)

  return c.json({
    products: productsToSend,
    offset,
    limit,
    count: productsToSend.length,
    max,
    prev,
    next
  })
})

app.get('/products/:id', (c) => {
  const { id } = c.req.param()
  const foundProduct = productsData.find((product) => product.id === id)
  console.log(id)

  return foundProduct ? c.json(foundProduct) : c.status(400).json({ message: 'Product not found' })
})

app.get('/markets', (c) => {
  return c.json(marketsData.map(({ id, name }) => { return { id, name } }))
})

app.get('/markets/:id', (c) => {
  const { id } = c.req.param()

  let { name, categories } = marketsData.find((market) => market.id === id)
  categories ??= []

  const filledCategories = categories.map((currCategory) => {
    const { id, name } = categoriesData.find((category) => category.id === currCategory.id)
    return { id, name }
  })

  return c.json({ id, name, categories: filledCategories })
})

app.get('/categories', (c) => {
  return c.json(categoriesData.map(({ id, name }) => { return { id, name } }))
})

app.get('/static/*', serveStatic({ root: './' }))

export default app
