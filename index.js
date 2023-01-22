import { firefox } from 'playwright'
import dotenv from 'dotenv'

import mongoose from 'mongoose'
import { saveMarketStatic, cleanUnusedAssets } from './db/local.js'

dotenv.config()

// mongoose
//   .connect(process.env.DB_URL)
//   .then(() => console.log('connected to MongoDB'))
//   .catch((error) => console.error('error connecting to MongoDB: ', error.message))

const fromCommaToDot = (numero) => parseFloat(numero.replace('.', '').replace(',', '.'))

const randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

const scrollToBottom = async (page, quantity) => {
  const quantityOfScroll = quantity
  const rangeOfScroll = 300
  for (let i = 0; i < quantityOfScroll; i++) {
    await page.waitForTimeout(randomIntFromInterval(10, 60))
    await page.mouse.wheel(0, rangeOfScroll)
  }
}

const startCatchingCategoriesNames = async (page, url) => {
  await page.goto(url)
  await page.evaluate(() => sessionStorage.setItem('user', '{"value":{"isOfAge":true},"expirationTime":0}'))

  await page.waitForSelector('h1')
  const h1El = await page.$('h1')
  const marketName = await h1El.textContent()

  console.log(`Scraping ${marketName}`)

  await scrollToBottom(page, 200)
  return marketName
}

const ScrapeData = async (browser, url) => {
  let page = await browser.newPage()
  let marketName = await startCatchingCategoriesNames(page, url)

  try {
    await page.waitForSelector('[role=listitem]', { timeout: 3000 })
  } catch (error) {
    try {
      await page.close()
      page = await browser.newPage()

      marketName = await startCatchingCategoriesNames(page, url)
      await page.waitForSelector('[role=listitem]', { timeout: 3000 })
    } catch (error) {
      console.log('Error loading page...')
      return
    }
  }

  let categories = await page.$$('[role=listitem]', { timeout: 3000 })

  for (let i = 0; i < categories.length; i++) {
    await page.waitForSelector('[role=listitem]')
    categories = await page.$$('[role=listitem]')
    const category = categories[i]
    const categoryName = await category.textContent()
    await category.click({ delay: randomIntFromInterval(300, 600) })

    const categoryScraped = {
      name: categoryName,
      products: []
    }

    console.log(`Scraping ${categoryName} category from ${marketName}`)

    await scrollToBottom(page, 100)

    await page.waitForSelector('#infocard')
    const products = await page.$$('#infocard')

    for (const product of products) {
      const text = await product.textContent()
      const [productName, productPrice] = text.split('$')
      const date = new Date(Date.now())
      if (!productName || !productPrice) continue

      const imageEl = await product.$('img')
      const image = await imageEl.getAttribute('src')

      const productData = {
        name: productName,
        price: fromCommaToDot(productPrice),
        date,
        image
      }
      categoryScraped.products.push(productData)
    }

    const data = {
      name: marketName,
      category: categoryScraped
    }
    await saveMarketStatic(data)
  }

  await page.close()
}

;(async () => {
  await cleanUnusedAssets()
  const browser = await firefox.launch()
  const initalTime = Date.now()

  const marketURLs = process.env.MARKET_URLS.split(' ')
  console.log(marketURLs)
  for (const url of marketURLs) {
    await ScrapeData(browser, url)
  }
  await browser.close()
  mongoose.connection.close()

  const finalTime = Date.now()
  console.log(`Finish scraping in ${((finalTime - initalTime) / 1000).toFixed()} seconds`)
})()
