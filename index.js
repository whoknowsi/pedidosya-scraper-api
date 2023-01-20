import { chromium } from 'playwright'

const places = [
  'https://www.pedidosya.com.ar/restaurantes/vicente-lopez/carrefour-market-carapachay-201-menu/seccion/4317966'
]

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  for (const url of places) {
    await page.goto(url)
    await browser.close()
  }
})()
