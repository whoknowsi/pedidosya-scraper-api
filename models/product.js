import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: {
    type: String
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
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
