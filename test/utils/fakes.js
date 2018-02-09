const TWENTY_DAYS = 20 * 24 * 60 * 60

const makeTime = (days = TWENTY_DAYS) =>
  Math.floor(new Date().getTime() / 1000) + days

module.exports = {
  makeTime
}
