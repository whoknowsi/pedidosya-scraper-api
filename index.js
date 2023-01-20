import { firefox } from 'playwright'
import { writeDBFile } from './db/index.js'
import dotenv from 'dotenv'
dotenv.config()

const randomIntFromInterval = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)

const scrollToBottom = async (page) => {
  const quantityOfScroll = 200
  const rangeOfScroll = 100
  for (let i = 0; i < quantityOfScroll; i++) {
    await page.waitForTimeout(randomIntFromInterval(10, 60))
    await page.mouse.wheel(0, rangeOfScroll)
  }
}

;(async () => {
  const browser = await firefox.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto(process.env.PLACE_URL)

  const data = []
  await page.waitForSelector('h1')
  const h1El = await page.$('h1')
  const name = await h1El.textContent()

  await scrollToBottom(page)

  await page.waitForSelector('[role=listitem]')
  let categories = await page.$$('[role=listitem]')

  for (let i = 0; i < categories.length; i++) {
    await page.waitForSelector('[role=listitem]')
    categories = await page.$$('[role=listitem]')
    const category = categories[i]
    await category.click({ delay: randomIntFromInterval(300, 600) })

    await scrollToBottom(page)

    await page.waitForSelector('#infocard')
    const products = await page.$$('#infocard')

    for (const product of products) {
      const text = await product.textContent()
      const [name, price] = text.split('$')

      data.push({
        name,
        price: '$' + price
      })
    }
  }

  console.log(name, data)
  writeDBFile(name, data)
  await browser.close()
})()
