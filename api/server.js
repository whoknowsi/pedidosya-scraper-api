import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/serve-static.module'
import productsData from '../assets/static/db/products.json'
import categoriesData from '../assets/static/db/categories.json'
import marketsData from '../assets/static/db/markets.json'
import { checkFilter } from '../utils/utils'
const app = new Hono()

app.use('/*', cors())

app.get('/products', (c) => {
  let { offset, limit, search, marketId, categoryId, outOfStock } = c.req.query()
  offset = offset ? Number(offset) : 0
  limit = limit ? Number(limit) : 10
  console.log(outOfStock)

  if (outOfStock === undefined) outOfStock = false
  if (outOfStock === 'true') outOfStock = true
  if (outOfStock === 'false') outOfStock = false

  let productsToSend = productsData
  const productsByCategory = categoryId ? categoriesData.find((category) => category.id === categoryId)?.products || [] : []
  const productsIdByMarket = marketId ? marketsData.find((market) => market.id === marketId)?.products || [] : []

  console.log(outOfStock)
  productsToSend = productsToSend.filter((product) => {
    return (
      checkFilter(search, product, (x) => x.name.toLowerCase().includes(search)) &&
      checkFilter(categoryId, product, (x) => productsByCategory.includes(x.id)) &&
      checkFilter(marketId, product, (x) => productsIdByMarket.includes(x.id)) &&
      checkFilter(!outOfStock, product, (x) => x.prices.filter((price) => price.stock !== -1).length !== 0)
    )
  })

  if (!outOfStock) {
    productsToSend = productsToSend.map(({ prices, ...product }) => {
      return {
        ...product,
        prices: prices.filter((price) => price.stock !== -1)
      }
    })
  }

  const max = productsToSend.length

  productsToSend = productsToSend.slice(offset, offset + limit).map((product) => {
    product.prices = product.prices.map(({ market, ...price }) => {
      return {
        ...price,
        market: market.name
          ? market
          : {
              id: market,
              name: marketsData.find(({ id }) => id === market)?.name || null,
              image: marketsData.find(({ id }) => id === market)?.image || null
            }
      }
    })

    if (marketId) {
      const market = marketsData.find((market) => market.id === marketId)
      const { prices, categories, ...prod } = product
      const category = categoriesData.find((category) => JSON.stringify(category.markets).includes(marketId))
      return {
        ...prod,
        price: prices.find((price) => price.market === marketId)?.price || null,
        category: {
          id: category.id,
          name: category.name
        },
        market: {
          id: market.id,
          name: market.name,
          image: market.image
        },
        product: { ...prod, prices, categories }
      }
    }

    return product
  })

  const prev =
    max > offset && offset > 0
      ? `/products?limit=${limit}&offset=${Math.max(0, offset - limit)}${
          marketId ? `&marketId=${marketId}` : ''}${
          categoryId ? `&categoryId=${categoryId}` : ''}${
          outOfStock ? '&outOfStock=true' : ''}`
      : null

  const next =
    max > offset + limit
      ? `/products?limit=${limit}&offset=${offset + limit}${
          marketId ? `&marketId=${marketId}` : ''}${
          categoryId ? `&categoryId=${categoryId}` : ''}${
          outOfStock ? '&outOfStock=true' : ''}`
      : null

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
  return c.json({
    markets: marketsData.map(({ id, name, image }) => {
      return { id, name, image }
    })
  })
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
  const { marketId } = c.req.query()

  let categoriesToSend
  if (marketId) {
    categoriesToSend = categoriesData.filter((category) => JSON.stringify(category.markets).includes(marketId))
  } else {
    categoriesToSend = categoriesData
  }

  return c.json({
    categories: categoriesToSend.map(({ id, name }) => {
      return { id, name }
    })
  })
})

app.get('/static/*', serveStatic({ root: './' }))

export default app
