import mongoose from 'mongoose'

const historicalPrice = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  markets: [
    {
      market: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market',
        required: true
      },
      prices: [
        {
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
    }
  ]
})

historicalPrice.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

export default mongoose.model('HistoricalPrice', historicalPrice)
