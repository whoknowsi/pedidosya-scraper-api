import { writeFile, readFile } from 'node:fs/promises'
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

const write = async (fileName, content) => await writeFile(`${DB_PATH}/${fileName}.json`, JSON.stringify(content, null, 2), 'utf-8')
const read = async (fileName) => await readFile(`${DB_PATH}/${fileName}.json`, 'utf-8').then(JSON.parse)

export { parseId, parseDate, sortByDate, write, read, IMG_PATH }
