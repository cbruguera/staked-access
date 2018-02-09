const timeTravel = require('../utils/timeTravel')
const assertThrows = require('../utils/assertThrows')
const { getLog } = require('../utils/txHelpers')
const { makeTime } = require('../utils/fakes')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (after time travel)', accounts => {
  const [punter] = accounts.slice(1)

  const price = 10
  const expiry = makeTime()
  const ONE_YEAR = 365 * 24 * 60 * 60

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(expiry, price, token.address)

    // make sure punter has some KEY
    await token.freeMoney(punter, price)
    await token.approve(escrow.address, price, { from: punter })
    await escrow.stake({ from: punter })
    await timeTravel(ONE_YEAR)
  })

  context('hasExpired', () => {
    it('the escrow has expired', async () => {
      assert.isTrue(await escrow.hasExpired())
    })
  })

  context('retreiving funds', () => {
    it('punter can not stake funds', async () =>
      assertThrows(escrow.stake({ from: punter })))

    it('punter can retrieve their funds', async () => {
      const tx = await escrow.retrieve({ from: punter })
      assert.notEqual(getLog(tx, 'KEYRetrieved'), null)
    })

    it('now punter has no staked funds', async () => {
      const hasFunds = await escrow.hasFunds(punter)
      assert.isFalse(hasFunds)
    })
  })
})
