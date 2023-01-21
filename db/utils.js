
const parseId = (id) => {
  return { $oid: id.toString() }
}

const parseDate = (date) => {
  return { $date: { $numberLong: date.getTime() } }
}

const sortByDate = (prices) => {
  return [...prices].sort((a, b) => a.date.getTime() > b.date.getTime())
}

export { parseId, parseDate, sortByDate }
