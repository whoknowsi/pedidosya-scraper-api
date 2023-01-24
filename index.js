import { firefox } from 'playwright'
import dotenv from 'dotenv'
import { saveMarketStatic } from './db/local.js'

dotenv.config()

const ScrapeData = async (browser, url) => {
  const result = []

  let page = await browser.newPage()
  page.goto(url)

  let response
  try {
    response = await page.waitForResponse('**/v3/catalogues/**', { timeout: 3000 })
  } catch {
    try {
      await page.close()
      page = await browser.newPage()
      page.goto(url)

      response = await page.waitForResponse('**/v3/catalogues/**', { timeout: 3000 })
    } catch {
      console.log('Failed to load url:', url)
      result.push(`Failed to load url: ${url}`)
      return
    }
  }

  const rawCategoriesUrl = await response.url()
  const categoriesUrl = rawCategoriesUrl.split('&')[0] + '&max=1000&maxProducts=10&offset=0'
  const partnerId = rawCategoriesUrl.split('partnerId=')[1].split('&')[0]

  await page.waitForSelector('h1')
  const h1El = await page.$('h1')
  const marketName = await h1El.textContent()

  console.log(marketName)

  const productLink = process.env.PEDIDOSYA_PRODUCT_URL.split('${}')
  const categories = await page.evaluate(
    async ({ categoriesUrl, partnerId, marketName, productLink }) => {
      const getCategoryUrl = (productId, partnerId) => (productLink[0] + productId + productLink[1] + partnerId + productLink[2])

      const response = await fetch(categoriesUrl)
      const categories = await response.json()
      const categoriesResponse = []

      for (const category of categories.data) {
        const categoryId = category.id
        const categoryName = category.name

        const response = await fetch(getCategoryUrl(categoryId, partnerId))
        const productsData = await response.json()
        const products = productsData.data.map((d) => {
          return {
            image: d.image,
            name: d.name,
            price: d.price,
            date: new Date(Date.now()),
            barcode: d.integrationCode,
            measurementUnit: d.measurementUnit,
            pricePerMeasurementUnit: d.pricePerMeasurementUnit
          }
        })

        const categories = {
          name: marketName,
          category: {
            name: categoryName,
            products
          }
        }

        categoriesResponse.push(categories)
      }

      return categoriesResponse
    },
    { categoriesUrl, partnerId, marketName, productLink }
  )

  for (let i = 0; i < categories.length; i++) {
    const category = categories[i]
    await saveMarketStatic(category, i + 1)
  }

  await page.close()
  return result.length === 0 ? [`All scraped without errors on ${marketName}`] : result
}

;(async () => {
  const browser = await firefox.launch()
  const initalTime = Date.now()

  const marketURLs = process.env.MARKET_URLS.split(' ')
  const results = []
  for (const url of marketURLs) {
    const result = await ScrapeData(browser, url)
    results.push(result)
  }

  console.log('results: ', results)

  await browser.close()

  const finalTime = Date.now()
  console.log(`Finish scraping in ${((finalTime - initalTime) / 1000).toFixed()} seconds`)
})()
