import Category from '../models/category.js'
import HistoricalPrice from '../models/historicalPrice.js'
import Market from '../models/market.js'
import Product from '../models/product.js'
import { read, write, IMG_PATH, getImagesNames } from './utils.js'
import fetch from 'node-fetch'
import sharp from 'sharp'
import * as fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const saveImage = async (id, image) => {
  const baseUrl = process.env.PEDIDOSYA_IMG_BASE_URL
  if (!image) return
  const imageUrl = `${baseUrl}/${image}`

  console.log('Saving image:', image)
  try {
    const responseImage = await fetch(imageUrl)
    const arrayBuffer = await responseImage.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const imageFileName = `${id}.webp`

    await sharp(buffer).webp({ effort: 6 }).toFile(`${IMG_PATH}/${imageFileName}`)
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
    category: [foundCategory.id],
    image,
    barcode: product.barcode,
    measurementUnit: product.measurementUnit,
    pricePerMeasurementUnit: product.pricePerMeasurementUnit,
    prices: [
      {
        market: foundMarket.id,
        price: product.price,
        date: product.date,
        stock: product.stock
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

const checkImgAndResetStockOnProduct = async (product, imageUrl, stock, marketId) => {
  if (product === undefined) return undefined

  const imagesNames = getImagesNames()

  const productImageName = product?.image?.includes('/') ? product.image.split('/').at(-1) : null
  if (productImageName && imagesNames.includes(productImageName)) return product

  const newImgUrl = await saveImage(product.id, imageUrl)

  const prices = product.prices.map((price) => {
    if (price.market === marketId) return { ...price, stock }
    return price
  })

  return { ...product, prices, image: newImgUrl }
}

const saveMarketStatic = async (market, index) => {
  let marketsLocal = read('markets')
  let productsLocal = read('products')
  let categoriesLocal = read('categories')
  let historicalPricesLocal = read('historicalprices')

  const foundMarket = marketsLocal.find((m) => m.name === market.name) || createMarket(market)

  const foundCategory = categoriesLocal.find((c) => c.name === market.category.name) || createCategory(market.category)
  console.log(` ${index} - `, foundCategory.name)

  const productsOnMarketAndCategory = foundMarket.products.filter((p) => foundCategory.products.includes(p))
  const productsToResetStock = productsLocal.filter((p) => productsOnMarketAndCategory.includes(p.id))
  productsLocal = preWriteData(productsLocal,
    productsToResetStock.map((product) => {
      const prices = product.prices.map((price) => {
        if (price.market === foundMarket.id) return { ...price, stock: 0 }
        return price
      })
      return { ...product, prices }
    })
  )

  for (const product of market.category.products) {
    const foundProduct =
      (await checkImgAndResetStockOnProduct(
        productsLocal.find((p) => p.name === product.name),
        product.image,
        product.stock,
        foundMarket.id
      )) || (await createProduct(product, foundCategory, foundMarket))

    console.log(foundProduct.prices)

    const foundHistoricalPrice =
      historicalPricesLocal.find(({ product }) => product === foundProduct.id) || createHistoricalPrice(foundProduct, foundMarket)

    const existMarketInProduct = foundProduct.prices.find((m) => m.market === foundMarket.id)
    !existMarketInProduct &&
      foundProduct.prices.push({
        market: foundMarket.id,
        price: product.price,
        date: product.date,
        stock: product.stock
      })

    const existMarketInHistorical = foundHistoricalPrice.markets.find((m) => m.market === foundMarket.id)
    !existMarketInHistorical &&
      foundHistoricalPrice.markets.push({
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

const cleanUnusedAssets = async () => {
  const products = read('products')
  const productsIds = products.map((p) => p.id)
  const imagesIds = []
  let fileExtension
  fs.readdirSync(IMG_PATH).forEach((file) => {
    imagesIds.push(file.split('.')[0])
    fileExtension ??= file.split('.')[1]
  })

  const toRemove = imagesIds.filter((id) => !productsIds.includes(id)).map((id) => `${IMG_PATH}/${id}.${fileExtension}`)

  console.log(toRemove.length === 0 ? 'No unnused files.' : `Deleting ${toRemove.length} unnused files`)

  toRemove.forEach((path) => {
    try {
      fs.unlinkSync(path)
      console.log('Removing: ', path)
    } catch (err) {
      console.error(err)
    }
  })
}

const fillImages = async () => {
  const products = read('products')

  const productsToFillImage = products.filter((product) => !product.image?.includes('/static/products/'))
  for (const product of productsToFillImage) {
    const image = await saveImage(product.id, product.image)
    product.image = image
  }

  write('products', products.map((product) => {
    const modifyProduct = productsToFillImage.find((productMod) => productMod.id === product.id)
    if (modifyProduct) return modifyProduct
    return product
  }))
}

export { saveMarketStatic, cleanUnusedAssets, fillImages }
