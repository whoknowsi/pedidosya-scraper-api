import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const DB_PATH = path.join(process.cwd(), './assets/static/db')
const IMG_PATH = path.join(process.cwd(), './assets/static/products')

const parseId = (id) => {
  return { $oid: id.toString() }
}

const parseDate = (date) => {
  return { $date: { $numberLong: date.getTime() } }
}

const sortByDate = (prices) => {
  return [...prices].sort((a, b) => a.date.getTime() > b.date.getTime())
}

const write = (fileName, content) => writeFileSync(path.join(DB_PATH, `${fileName}.json`), JSON.stringify(content, null, 2), 'utf-8')
const read = (fileName) => {
  const file = readFileSync(path.join(DB_PATH, `${fileName}.json`), 'utf-8')
  return JSON.parse(file)
}

const getImagesNames = () => {
  const imagesIds = []
  readdirSync(IMG_PATH).forEach((file) => imagesIds.push(file))
  return imagesIds
}

export { parseId, parseDate, sortByDate, write, read, IMG_PATH, getImagesNames }
