import mongoose from 'mongoose'

const historicalPrice = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  markets: [
    {
      market: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Market'
      },
      prices: [
        {
          price: { type: Number },
          date: { type: Date }
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
