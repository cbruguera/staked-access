// ref https://medium.com/level-k/testing-smart-contracts-with-truffle-7849b3d9961

const assertThrows = require('../utils/assertThrows')
const { getLog } = require('../utils/txHelpers')
const { makeTime } = require('../utils/fakes')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (core functionality)', accounts => {
  const [
    punter, // a regular punter
    lazyPunter, // a punter who has failed to approve a transfer of KEY
    deadbeatPunter // a punter with no KEY
  ] = accounts.slice(1)

  const price = 10
  const expiry = makeTime()

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(expiry, price, token.address)

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

  context('stake', () => {
    // deadbeat punter has has no money
    context('deadbeat punter', () => {
      it("can't stake KEY", () =>
        assertThrows(escrow.stake({ from: deadbeatPunter })))
    })

    // lazy punter has has money but has not approved transfer
    context('lazy punter', () => {
      it("can't stake KEY", () =>
        assertThrows(escrow.stake({ from: lazyPunter })))
    })

    it('punter with approved amount of KEY can stake', async () => {
      const tx = await escrow.stake({ from: punter })
      assert.notEqual(getLog(tx, 'KEYStaked'), null)
    })
  })

  context('after successful stake', () => {
    it("punter's balance is 0", async () => {
      const balance = await token.balanceOf(punter)
      assert.equal(balance.toNumber(), 0)
    })

    it('punter can not retreive their stake yet however', async () =>
      assertThrows(escrow.retrieve({ from: punter })))

    context('hasFunds', () => {
      it('escrow has funds for the punter', async () => {
        const hasFunds = await escrow.hasFunds(punter)
        assert.isTrue(hasFunds)
      })

      it('zero address returns false', async () => {
        assert.isFalse(await escrow.hasFunds(0x0))
      })

      it('punter with no staked funds returns false', async () => {
        assert.isFalse(await escrow.hasFunds(deadbeatPunter))
      })
    })
  })
})
