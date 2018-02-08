const timeTravel = require('../utils/timeTravel')
const { getContract, getLog } = require('../utils/txHelpers')

const MockKey = artifacts.require('./MockKEY.sol')
const StakedAccessFactory = artifacts.require('./StakedAccessFactory.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (after time travel)', accounts => {
  const [punter, serviceProvider] = accounts.slice(1)

  const price = 10
  const expiry = 20 * 24 * 60 * 60 + Math.floor(new Date().getTime() / 1000)
  const ONE_YEAR = 365 * 24 * 60 * 60

  let escrow
  let token

  before(async () => {
    const manager = await StakedAccessFactory.deployed()
    token = await MockKey.deployed()
    // create an escrow
    const tx = await manager.createStakedAccess(expiry, price)
    escrow = getContract(tx, 'StakedAccessCreated', 'escrow', StakedAccess)
    // make sure punter has some KEY
    await token.freeMoney(punter, price)
    await token.approve(escrow.address, price, { from: punter })
    await escrow.deposit({ from: punter })
    await timeTravel(ONE_YEAR)
  })

  context('hasExpired', () => {
    it('the escrow has expired', async () => {
      assert.isTrue(await escrow.hasExpired())
    })
  })

  context('retreiving funds', () => {
    it('punter can retrieve their funds', async () => {
      const tx = await escrow.retrieve({ from: punter })
      assert.notEqual(getLog(tx, 'KEYRetrieved'), null)
    })

    it('now punter has no funds on deposit', async () => {
      const hasFunds = await escrow.hasFunds(punter)
      assert.isFalse(hasFunds)
    })
  })
})
