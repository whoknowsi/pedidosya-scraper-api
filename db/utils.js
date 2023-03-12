import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const DB_PATH = process.env.VITEST ? path.join(process.cwd(), './tests/assets/static/db') : path.join(process.cwd(), './assets/static/db')
const IMG_PATH = process.env.VITEST ? path.join(process.cwd(), './tests/assets/static/products') : path.join(process.cwd(), './assets/static/products')
const IMG_PATH_MARKETS = process.env.VITEST ? path.join(process.cwd(), './tests/assets/static/markets') : path.join(process.cwd(), './assets/static/markets')

const parseId = (id) => {
  return { $oid: id.toString() }
}

const parseDate = (date) => {
  return { $date: { $numberLong: date.getTime() } }
}

const sortByDate = (prices) => {
  return [...prices].sort((a, b) => a.date.getTime() > b.date.getTime())
}

const write = (fileName, content, backup = false) => writeFileSync(backup ? path.join('backup', `${fileName}.json`) : path.join(DB_PATH, `${fileName}.json`), JSON.stringify(content), 'utf-8')
const read = (fileName, backup = false) => {
  const file = readFileSync(backup ? path.join('backup', `${fileName}.json`) : path.join(DB_PATH, `${fileName}.json`), 'utf-8')
  return JSON.parse(file)
}

const getImagesNames = () => {
  const imagesIds = []
  readdirSync(IMG_PATH).forEach((file) => imagesIds.push(file))
  return imagesIds
}

export { parseId, parseDate, sortByDate, write, read, IMG_PATH, DB_PATH, IMG_PATH_MARKETS, getImagesNames }
