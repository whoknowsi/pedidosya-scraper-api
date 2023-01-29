import { test, expect, beforeAll, afterAll } from 'vitest'
import { saveMarketStatic } from '../db/local'
import { read, DB_PATH } from '../db/utils'
import { getProductsOfCategoryData } from './test-utils'
import * as fs from 'node:fs'
import path from 'node:path'
let data

beforeAll(() => {
  try {
    fs.unlinkSync(path.join(DB_PATH, 'products.json'))
    fs.unlinkSync(path.join(DB_PATH, 'markets.json'))
    fs.unlinkSync(path.join(DB_PATH, 'categories.json'))
    fs.unlinkSync(path.join(DB_PATH, 'historicalprices.json'))
  } catch (err) {}

  fs.writeFileSync(path.join(DB_PATH, 'products.json'), '[]')
  fs.writeFileSync(path.join(DB_PATH, 'markets.json'), '[]')
  fs.writeFileSync(path.join(DB_PATH, 'categories.json'), '[]')
  fs.writeFileSync(path.join(DB_PATH, 'historicalprices.json'), '[]')

  data = getProductsOfCategoryData()
})

test('has to fill a products.json file with the correct products', async () => {
  await saveMarketStatic(data, 1)
  const savedProducts = read('products')

  expect(savedProducts.map((p) => p.name)).toEqual(data.category.products.map((p) => p.name))
})

test('if a product does not show and its presaved then his stock is -1', async () => {
  const dataSliced = JSON.parse(JSON.stringify(data))
  dataSliced.category.products = data.category.products.slice(0, 1)
  await saveMarketStatic(dataSliced, 1)

  const savedProducts = read('products')
  const expectedResponse = Array(data.category.products.length)
  expectedResponse.fill(-1)
  expectedResponse[0] = data.category.products[0].stock

  expect(savedProducts.map((p) => p.prices[0].stock)).toEqual(expectedResponse)
})

test('if a product again is shown then his stock is the correct', async () => {
  await saveMarketStatic(data, 1)
  const savedProducts = read('products')

  expect(savedProducts.map((p) => p.name)).toEqual(data.category.products.map((p) => p.name))
})

afterAll(() => {
  try {
    fs.unlinkSync(path.join(DB_PATH, 'products.json'))
    fs.unlinkSync(path.join(DB_PATH, 'markets.json'))
    fs.unlinkSync(path.join(DB_PATH, 'categories.json'))
    fs.unlinkSync(path.join(DB_PATH, 'historicalprices.json'))
  } catch (err) {}
})
