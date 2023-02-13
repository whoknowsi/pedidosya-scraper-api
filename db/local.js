import Category from '../models/category.js'
import HistoricalPrice from '../models/historicalPrice.js'
import Market from '../models/market.js'
import Product from '../models/product.js'
import { read, write, IMG_PATH, getImagesNames } from './utils.js'
import fetch from 'node-fetch'
import sharp from 'sharp'
import * as fs from 'fs'
import dotenv from 'dotenv'
import { parseBarcode } from '../utils/utils.js'

dotenv.config()

const saveImage = async (id, image) => {
  if (process.env.VITEST) return null

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

const preWriteArrayOfData = (prev, arrayContent) => {
  for (const content of arrayContent) {
    prev = preWriteData(prev, content)
  }
  return prev
}

const createCategory = (category) => {
  const newMongoCategory = new Category({})
  const newCategory = { id: newMongoCategory._id, name: category.name, products: [], markets: [] }
  return newCategory
}

const createMarket = (market) => {
  const newMongoMarket = new Market({})
  const newMarket = { id: newMongoMarket._id, name: market.name, products: [], categories: [] }
  return newMarket
}

const createProduct = async (product, foundCategory, foundMarket) => {
  const newMongoProduct = new Product({})
  const image = await saveImage(newMongoProduct._id, product.image) || null

  const newProduct = {
    id: newMongoProduct._id,
    name: product.name,
    categories: [
      {
        id: foundCategory.id,
        name: foundCategory.name
      }
    ],
    image,
    barcode: parseBarcode(product.barcode),
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

const checkImgAndResetStockOnProduct = async (product, imageUrl, newStock, marketId) => {
  if (product === undefined) return undefined

  const prices = product.prices.map(({ stock, ...price }) => {
    if (price.market === marketId) return { ...price, stock: newStock }
    return { ...price, stock }
  })

  const imagesNames = getImagesNames()

  const productImageName = product?.image?.includes('/') ? product.image.split('/').at(-1) : null
  if (productImageName && imagesNames.includes(productImageName)) return { ...product, prices }

  const newImgUrl = await saveImage(product.id, imageUrl) || null
  return { ...product, prices, image: newImgUrl }
}

const resetStockOfMarket = (market, products) => {
  const productsOnMarket = market.products.map((id) => {
    const product = products.find((product) => product.id === id)
    product.prices.find((price) => price.market === market.id).stock = -1
    return product
  })

  return preWriteArrayOfData(products, productsOnMarket)
}

const saveMarketStatic = async (market) => {
  let marketsLocal = read('markets')
  let productsLocal = read('products')
  let categoriesLocal = read('categories')
  let historicalPricesLocal = read('historicalprices')

  const foundMarket = marketsLocal.find((m) => m.name === market.name) || createMarket(market)
  productsLocal = resetStockOfMarket(foundMarket, productsLocal)

  console.log(market.name)

  for (let i = 0; i < market.categories.length; i++) {
    const category = market.categories[i]
    const foundCategory = categoriesLocal.find((c) => c.name === category.name) || createCategory(category)

    console.log(` ${i + 1} - `, foundCategory.name)

    for (const product of category.products) {
      const foundProduct =
        (await checkImgAndResetStockOnProduct(
          productsLocal.find((p) => p.name === product.name && p.barcode === parseBarcode(product.barcode)),
          product.image,
          product.stock,
          foundMarket.id
        )) || (await createProduct(product, foundCategory, foundMarket))

      const foundHistoricalPrice =
        historicalPricesLocal.find(({ product }) => product === foundProduct.id) ||
        createHistoricalPrice(foundProduct, foundMarket)

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

      const existCategoryInProduct = foundProduct.categories.find((category) => category.id === foundCategory.id)
      !existCategoryInProduct &&
        foundProduct.categories.push({
          id: foundCategory.id,
          name: foundCategory.name
        })

      const existCategoryOnMarket = foundMarket.categories?.find((category) => foundCategory.id === category.id)
      if (!existCategoryOnMarket) {
        foundMarket.categories
          ? foundMarket.categories.push({
            name: foundCategory.name,
            id: foundCategory.id
          })
          : (foundMarket.markets = [
              {
                name: foundCategory.name,
                id: foundCategory.id
              }
            ])
      }

      const existMarketOnCategory = foundCategory.markets?.find((market) => market.id === foundMarket.id)
      if (!existMarketOnCategory) {
        foundCategory.markets
          ? foundCategory.markets.push({
            name: foundMarket.name,
            id: foundMarket.id
          })
          : (foundCategory.markets = [
              {
                name: foundMarket.name,
                id: foundMarket.id
              }
            ])
      }

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
  }

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
    const image = await saveImage(product.id, product.image) || null
    product.image = image
  }

  write(
    'products',
    products.map((product) => {
      const modifyProduct = productsToFillImage.find((productMod) => productMod.id === product.id)
      if (modifyProduct) return modifyProduct
      return product
    })
  )
}

export { saveMarketStatic, cleanUnusedAssets, fillImages }
