export const randomBetween = (min, max) => Math.floor(Math.random() * (max - min) + min)

const parseBarcode = (string) => {
  const length = string.length
  if (length >= 13) {
    let i = 0
    while (string[i] === '0' && length - i > 13) {
      i++
    }
    return string.slice(i)
  } else {
    const zeros = '0'.repeat(13 - length)
    return zeros + string
  }
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
