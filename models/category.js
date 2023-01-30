import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name: {
    type: String
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }
  ],
  markets: [
    {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market'
      },
      name: { type: String }
    }
  ]
})

categorySchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

export default mongoose.model('Category', categorySchema)
