const { getContract } = require('../utils/txHelpers')
const assertThrows = require('../utils/assertThrows')

const StakedAccessFactory = artifacts.require('./StakedAccessFactory.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccessFactory', accounts => {
  const [superuser] = accounts

  let factory

  before(async () => {
    factory = await StakedAccessFactory.deployed()
  })

  it('is owned by superuser', async () => {
    const owner = await factory.owner.call()
    assert.equal(owner, superuser, `Expected the owner to be '${superuser}'`)
  })

  context('creating with an invalid address', () =>
    assertThrows(StakedAccessFactory.new(0x0, { from: superuser }))
  )

  context('createStakedAccess', () => {
    const period = 28 * 24 * 60 * 60 + Math.floor(new Date().getTime() / 1000)
    const price = 10
    let escrow

    before(async () => {
      const tx = await factory.createStakedAccess(period, price)
      escrow = getContract(tx, 'StakedAccessCreated', 'escrow', StakedAccess)
    })

    it('creates a StakedAccess', () => {
      assert.notEqual(escrow, null)
      assert.notEqual(escrow, undefined)
    })

    it('the StakedAccess has the correct expiry', async () => {
      const expiry = await escrow.expiry.call()
      assert.equal(expiry.toNumber(), period)
    })

    it('the StakedAccess has the correct price', async () => {
      const p = await escrow.price.call()
      assert.equal(p.toNumber(), price)
    })

    it('the StakedAccess is also owned by superuser', async () => {
      const owner = await escrow.owner.call()
      assert.equal(owner, superuser, `Expected the owner to be '${superuser}'`)
    })

    context('invalid expiry', () => {
      const earlyPeriod = new Date().getTime() / 1000 - 1000
      it('earlyPeriod throws an error', () =>
        assertThrows(factory.createStakedAccess(earlyPeriod, price)))
    })

    context('invalid price', () => {
      it('0 price throws an error', () =>
        assertThrows(factory.createStakedAccess(period, 0)))
    })
  })
})
