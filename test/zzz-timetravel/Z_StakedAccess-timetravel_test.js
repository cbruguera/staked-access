const timeTravel = require('../utils/timeTravel')
const assertThrows = require('../utils/assertThrows')
const { getLog } = require('../utils/txHelpers')
const { makeTime } = require('../utils/fakes')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (after time travel)', accounts => {
  const [punter, anotherPunter] = accounts.slice(1)

  const price = 10
  const expiry = makeTime()
  const ONE_YEAR = 365 * 24 * 60 * 60
  const fromPunter = { from: punter }

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(expiry, price, token.address)

    // make sure punter has some KEY
    await token.freeMoney(punter, price)
    await token.approve(escrow.address, price, fromPunter)
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
      assertThrows(escrow.stake(fromPunter)))

    it('punter can retrieve their funds', async () => {
      const tx = await escrow.retrieve(fromPunter)
      assert.notEqual(getLog(tx, 'KEYRetrieved'), null)
    })

    it('now punter has no staked funds', async () => {
      const hasStaked = await escrow.hasStaked(punter)
      assert.isFalse(hasStaked)
    })
  })

  context('punter who has not yet staked', () => {
    const fromAnotherPunter = { from: anotherPunter }
    before(async () => {
      // make sure punter has some KEY
      await token.freeMoney(anotherPunter, price)
      await token.approve(escrow.address, price, fromAnotherPunter)
    })

    it('can not stake once the contract has expired', async () =>
      assertThrows(escrow.stake(fromAnotherPunter)))

    it('can not retrieve if they have not staked', async () =>
      assertThrows(escrow.retrieve(fromAnotherPunter)))
  })
})
