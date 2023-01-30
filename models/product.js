import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: {
    type: String
  },
  categories: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      },
      name: { type: String }
    }
  ],
  barcode: {
    type: String
  },
  measurementUnit: {
    id: { type: Number },
    plural: { type: String },
    singular: { type: String },
    shortName: { type: String }
  },
  pricePerMeasurementUnit: {
    type: Number
  },
  prices: [
    {
      market: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market'
      },
      price: {
        type: Number
      },
      date: {
        type: Date
      },
      stock: {
        type: Number
      }
    }
  ]
})

productSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

export default mongoose.model('Product', productSchema)
