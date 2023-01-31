export const randomBetween = (min, max) => Math.floor(Math.random() * (max - min) + min)

const parseBarcode = (barcode) => {
  if (barcode.length > 13) return barcode.replace(/^0/, '')
  return barcode
}

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

export { parseProducts, parseBarcode }
