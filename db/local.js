import Category from '../models/category.js'
import HistoricalPrice from '../models/historicalPrice.js'
import Market from '../models/market.js'
import Product from '../models/product.js'
import { writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import fetch from 'node-fetch'
import sharp from 'sharp'

const DB_PATH = path.join(process.cwd(), './assets/static/db')
const IMG_PATH = path.join(process.cwd(), './assets/static/products')

const write = async (fileName, content) => {
  await writeFile(`${DB_PATH}/${fileName}.json`, JSON.stringify(content, null, 2), 'utf-8')
}

const saveImage = async (id, src) => {
  if (!src) return
  const imageUrl = src.includes('?') ? src.split('?')[0] : src

  console.log('Saving image...')
  try {
    const responseImage = await fetch(imageUrl)
    const arrayBuffer = await responseImage.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const imageFileName = `${id}.webp`

    await sharp(buffer).webp({ effort: 6 }).toFile(`${IMG_PATH}/${imageFileName}`)
    console.log('Image saved.')
    return `/static/products/${imageFileName}`
  } catch (err) {
    console.log('error:', err.message)
    return null
  }
}

const preWriteData = (prev, content) => {
  const foundContent = prev.find((value) => value.id === content.id)
  foundContent
    ? (prev = prev.map((value) => {
        if (value.id === content.id) return content
        return value
      }))
    : prev.push(content)

  return prev
}

const createCategory = (category) => {
  const newMongoCategory = new Category({})
  const newCategory = { id: newMongoCategory._id, name: category.name, products: [] }
  return newCategory
}

const createMarket = (market) => {
  const newMongoMarket = new Market({})
  const newMarket = { id: newMongoMarket._id, name: market.name, products: [] }
  return newMarket
}

const createProduct = async (product, foundCategory, foundMarket) => {
  const newMongoProduct = new Product({})
  const image = await saveImage(newMongoProduct._id, product.image)

  const newProduct = {
    id: newMongoProduct._id,
    name: product.name,
    category: foundCategory.id,
    image,
    prices: [
      {
        market: foundMarket.id,
        price: product.price,
        date: product.date
      }
    ]
  }

  return newProduct
}

const createHistoricalPrice = (foundProduct, foundMarket) => {
  const newMongoHistoricalPrice = new HistoricalPrice({})

  const newHistoricalPrice = {
    id: newMongoHistoricalPrice._id,
    name: foundProduct.name,
    product: foundProduct.id,
    markets: [
      {
        market: foundMarket.id,
        prices: [
          {
            price: foundProduct.prices.find((x) => x.market === foundMarket.id).price,
            date: foundProduct.prices.find((x) => x.market === foundMarket.id).date
          }
        ]
      }
    ]
  }

  return newHistoricalPrice
}

const saveMarketStatic = async (market) => {
  let marketsLocal = await readFile(`${DB_PATH}/markets.json`, 'utf-8').then(JSON.parse)
  let productsLocal = await readFile(`${DB_PATH}/products.json`, 'utf-8').then(JSON.parse)
  let categoriesLocal = await readFile(`${DB_PATH}/categories.json`, 'utf-8').then(JSON.parse)
  let historicalPricesLocal = await readFile(`${DB_PATH}/historicalprices.json`, 'utf-8').then(JSON.parse)

  const foundMarket = marketsLocal.find((m) => m.name === market.name) || createMarket(market)
  console.log('Market name:', foundMarket.name)

  const foundCategory = categoriesLocal.find((c) => c.name === market.category.name) || createCategory(market.category)
  console.log('Category name:', foundCategory.name)

  for (const product of market.category.products) {
    const foundProduct =
      productsLocal.find((p) => p.name === product.name) || (await createProduct(product, foundCategory, foundMarket))
    const foundHistoricalPrice =
      historicalPricesLocal.find(({ product }) => product === foundProduct.id) ||
      createHistoricalPrice(foundProduct, foundMarket)
    console.log(`${foundMarket.name} - ${foundCategory.name} - ${foundProduct.name}`)

    const existMarketInProduct = foundProduct.prices.find((m) => m.market === foundMarket.id)
    !existMarketInProduct && foundProduct.prices.push(
      {
        market: foundMarket.id,
        price: product.price,
        date: product.date
      }
    )

    const existMarketInHistorical = foundHistoricalPrice.markets.find((m) => m.market === foundMarket.id)
    !existMarketInHistorical && foundHistoricalPrice.markets.push({
      market: foundMarket.id,
      prices: [
        {
          price: product.price,
          date: product.date
        }
      ]
    })

    const existProductInMarket = foundMarket.products.find((productId) => productId === foundProduct.id)
    !existProductInMarket && foundMarket.products.push(foundProduct.id)

    const existProductInCategory = foundCategory.products.find((productId) => productId === foundProduct.id)
    !existProductInCategory && foundCategory.products.push(foundProduct.id)

    const priceHasChanged = foundProduct.prices.find((m) => m.market === foundMarket.id).price !== product.price
    if (priceHasChanged) {
      foundProduct.prices.find((m) => m.market === foundMarket.id).price = product.price
      foundProduct.prices.find((m) => m.market === foundMarket.id).date = product.date

      foundHistoricalPrice.markets
        .find((m) => m.market === foundMarket.id)
        .prices.push({ price: product.price, date: product.date })
    }
    productsLocal = preWriteData(productsLocal, foundProduct)
    historicalPricesLocal = preWriteData(historicalPricesLocal, foundHistoricalPrice)
  }
  categoriesLocal = preWriteData(categoriesLocal, foundCategory)
  marketsLocal = preWriteData(marketsLocal, foundMarket)

  write('categories', categoriesLocal)
  write('historicalprices', historicalPricesLocal)
  write('markets', marketsLocal)
  write('products', productsLocal)
}

export { saveMarketStatic }
