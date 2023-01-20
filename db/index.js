import Category from '../models/category.js'
import HistoricalPrice from '../models/historicalPrice.js'
import Market from '../models/market.js'
import Product from '../models/product.js'
import mongoose from 'mongoose'

const addMarketToProduct = async (foundProduct, product, foundMarket) => {
  foundProduct.prices.push({
    market: mongoose.Types.ObjectId(foundMarket.id.toString()),
    price: product.price,
    date: product.date
  })

  foundMarket.products ? foundMarket.products.push(foundProduct.id) : (foundMarket.products = [foundProduct.id])

  const foundHistoricalPrice = await HistoricalPrice.findOne({ product: foundProduct.id })
  foundHistoricalPrice.markets.push({
    market: mongoose.Types.ObjectId(foundMarket.id.toString()),
    prices: [
      {
        price: product.price,
        date: product.date
      }
    ]
  })

  await Product.findByIdAndUpdate(foundProduct.id, foundProduct)
  await Market.findByIdAndUpdate(foundMarket.id, foundMarket)
  await HistoricalPrice.findByIdAndUpdate(foundHistoricalPrice.id, foundHistoricalPrice)
}

const checkIfPriceNeedsToBeUpdated = async (product, foundProduct, foundMarket) => {
  const marketPriceForProduct = foundProduct.prices.find(({ market }) => market.toString() === foundMarket.id)
  if (marketPriceForProduct.price === product.price) return

  foundProduct.prices = foundProduct.prices.map((price) => {
    if (price.market.toString() === foundMarket.id) {
      price = { market: mongoose.Types.ObjectId(foundMarket.id.toString()), price: product.price, date: product.date }
    }
    return price
  })

  const foundHistoricalPrice = await HistoricalPrice.findOne({ product: foundProduct.id })
  foundHistoricalPrice.markets = foundHistoricalPrice.markets.map((market) => {
    if (market.market.toString() === foundMarket.id) market.prices.push({ price: product.price, date: product.date })
    return market
  })

  console.log(foundProduct)
  console.log(foundHistoricalPrice)
  console.log(foundHistoricalPrice.markets)

  await Product.findByIdAndUpdate(foundProduct.id, foundProduct)
  await HistoricalPrice.findByIdAndUpdate(foundHistoricalPrice.id, foundHistoricalPrice)
}

const createProduct = async (product, category, foundMarket) => {
  let foundCategory = await Category.findOne({ name: category.name })
  if (!foundCategory) foundCategory = await new Category({ name: category.name }).save()

  const newProduct = await new Product({
    name: product.name,
    category: mongoose.Types.ObjectId(foundCategory.id.toString()),
    prices: [
      {
        market: mongoose.Types.ObjectId(foundMarket.id.toString()),
        price: product.price,
        date: product.date
      }
    ]
  }).save()

  foundMarket.products ? foundMarket.products.push(newProduct.id) : (foundMarket.products = [newProduct.id])
  foundCategory.products ? foundCategory.products.push(newProduct.id) : (foundCategory.products = [newProduct.id])

  await Market.findByIdAndUpdate(foundMarket.id, foundMarket)
  await Category.findByIdAndUpdate(foundCategory.id, foundCategory)
  await HistoricalPrice.create(
    new HistoricalPrice({
      product: newProduct.id,
      markets: {
        market: mongoose.Types.ObjectId(foundMarket.id.toString()),
        prices: [
          {
            price: product.price,
            date: product.date
          }
        ]
      }
    })
  )
}

const saveMarket = async (market) => {
  let foundMarket = await Market.findOne({ name: market.name })
  if (!foundMarket) {
    foundMarket = await new Market({
      name: market.name
    }).save()
  }

  console.log('market id', foundMarket.id)

  for (const category of market.categories) {
    for (const product of category.products) {
      console.log(`${market.name}: ${product.name} from ${category.name}`)
      const foundProduct = await Product.findOne({ name: product.name })
      if (foundProduct) {
        console.log('found product', foundProduct.id)
        const marketIsSetted = foundProduct.prices.find(({ market }) => market.toString() === foundMarket.id)
        if (!marketIsSetted) await addMarketToProduct(foundProduct, product, foundMarket)
        else await checkIfPriceNeedsToBeUpdated(product, foundProduct, foundMarket)
      } else await createProduct(product, category, foundMarket)
    }
  }
}

export { saveMarket }
