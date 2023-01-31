import { firefox } from 'playwright'
import dotenv from 'dotenv'
import { saveMarketStatic } from './db/local.js'
import { randomBetween } from './utils/utils.js'

dotenv.config()

const ScrapeData = async (page, { marketName, partnerId }) => {
  const categoryUrlSplit = process.env.PEDIDOSYA_CATEGORY_URL.split('{}')
  const categoriesUrl =
    categoryUrlSplit[0] + randomBetween(100000, 999999) + categoryUrlSplit[1] + partnerId + categoryUrlSplit[2]

  console.log(marketName)

  const productLink = process.env.PEDIDOSYA_PRODUCT_URL.split('{}')

  const { categories, error, fetchCount } = await page.evaluate(
    async ({ categoriesUrl, partnerId, marketName, productLink }) => {
      const parseProducts = (products) => {
        return products.map((p) => {
          return {
            image: p.image,
            name: p.name,
            price: p.price,
            stock: p.stock,
            date: new Date(Date.now()),
            barcode: p.integrationCode,
            measurementUnit: p.measurementUnit,
            pricePerMeasurementUnit: p.pricePerMeasurementUnit
          }
        })
      }

      let fetchCount = 0

      try {
        const getCategoryUrl = (productId, partnerId, offset) =>
          productLink[0] + productId + productLink[1] + partnerId + productLink[2] + offset
        const response = await fetch(categoriesUrl)
        fetchCount++
        const categories = await response.json()
        const categoriesResponse = []

        for (const category of categories.data) {
          const categoryId = category.id
          const categoryName = category.name

          let productsData = category.products
          if (productsData.length === 100) {
            let offset = 100
            let totalProducts = 101
            const panicButton = 1000
            while (productsData.length < totalProducts && offset < panicButton) {
              const response = await fetch(getCategoryUrl(categoryId, partnerId, offset))
              fetchCount++
              const productsRaw = await response.json()
              totalProducts = productsRaw.total
              offset += 100
              productsData = [...productsData, ...productsRaw.data]
            }
          }

          const products = parseProducts(productsData)

          const categories = {
            name: marketName,
            category: {
              name: categoryName,
              products
            }
          }

          categoriesResponse.push(categories)
        }

        return {
          categories: categoriesResponse,
          error: null,
          fetchCount
        }
      } catch (error) {
        return {
          categories: [],
          error,
          fetchCount
        }
      }
    },
    { categoriesUrl, partnerId, marketName, productLink }
  )

  const result = error
    ? `${marketName} - error fetching with total of ${fetchCount} fetchs - error: ${error.message}`
    : `${marketName} - all fetched with total of ${fetchCount} fetchs`

  return { result, categories }
}

;(async () => {
  const browser = await firefox.launch()
  const initalTime = Date.now()

  const page = await browser.newPage()
  const baseUrl = process.env.BASE_URL
  await page.goto(baseUrl)

  const dataMarkets = JSON.parse(process.env.DATA_MARKETS)
  const results = []
  const marketCategories = []

  for (const data of dataMarkets) {
    const { result, categories } = await ScrapeData(page, data)
    results.push(result)
    marketCategories.push(categories)
  }

  console.log('results:', results)

  for (const categories of marketCategories) {
    console.log(categories[0]?.name)
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i]
      await saveMarketStatic(category, i + 1)
    }
  }

  await browser.close()

  const finalTime = Date.now()
  console.log(`Finish scraping in ${((finalTime - initalTime) / 1000).toFixed()} seconds`)
})()
