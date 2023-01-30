import mongoose from 'mongoose'

const marketSchema = new mongoose.Schema({
  name: {
    type: String
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  categories: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      },
      name: { type: String }
    }
  ]
})

marketSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

export default mongoose.model('Market', marketSchema)
