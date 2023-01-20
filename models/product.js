import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  prices: [
    {
      market: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market',
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        required: true
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
