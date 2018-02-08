// ref https://medium.com/level-k/testing-smart-contracts-with-truffle-7849b3d9961

const assertThrows = require('../utils/assertThrows')
const { getContract, getLog } = require('../utils/txHelpers')

const MockKey = artifacts.require('./MockKEY.sol')
const StakedAccessFactory = artifacts.require('./StakedAccessFactory.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (core functionality)', accounts => {
  const [punter, serviceProvider, lazyPunter, deadbeatPunter] = accounts.slice(
    1
  )

  const price = 10
  const expiry = 20 * 24 * 60 * 60 + Math.floor(new Date().getTime() / 1000)

  let escrow
  let token

  before(async () => {
    const factory = await StakedAccessFactory.deployed()
    token = await MockKey.deployed()
    // create an escrow
    const tx = await factory.createStakedAccess(expiry, price)
    escrow = getContract(tx, 'StakedAccessCreated', 'escrow', StakedAccess)
    // make sure punter has some KEY
    await token.freeMoney(punter, price)
    await token.freeMoney(lazyPunter, price)
    await token.approve(escrow.address, price, { from: punter })
  })

  context('hasExpired', () => {
    it('the escrow has not expired', async () => {
      assert.isFalse(await escrow.hasExpired())
    })
  })

  context('deposit', () => {
    // deadbeat punter has has no money
    context('deadbeat punter', () => {
      it("can't deposit KEY", () =>
        assertThrows(escrow.deposit({ from: deadbeatPunter })))
    })

    // lazy punter has has money but has not approved transfer
    context('lazy punter', () => {
      it("can't deposit KEY", () =>
        assertThrows(escrow.deposit({ from: lazyPunter })))
    })

    it('punter with approved amount of KEY can deposit', async () => {
      const tx = await escrow.deposit({ from: punter })
      assert.notEqual(getLog(tx, 'KEYDeposited'), null)
    })
  })

  context('after successful deposit', () => {
    it("punter's balance is 0", async () => {
      const balance = await token.balanceOf(punter)
      assert.equal(balance.toNumber(), 0)
    })

    context('hasFunds', () => {
      it('escrow has funds for the punter', async () => {
        const hasFunds = await escrow.hasFunds(punter)
        assert.isTrue(hasFunds)
      })

      it('zero address returns false', async () => {
        assert.isFalse(await escrow.hasFunds(0x0))
      })

      it('punter with no funds on deposit returns false', async () => {
        assert.isFalse(await escrow.hasFunds(deadbeatPunter))
      })
    })
  })
})
