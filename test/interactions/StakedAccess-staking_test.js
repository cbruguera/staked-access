const assertThrows = require('../utils/assertThrows')
const { getLog } = require('../utils/txHelpers')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (interactions)', accounts => {
  const [
    owner,
    sender, // a regular sender
    sender2, // a sender who has failed to approve a transfer of KEY
    sender3 // a sender with no KEY
  ] = accounts.slice(0)

  const price = 10
  const period = 2592000 // 30 days

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(price, token.address, period)

    // make sure sender and sender2 have some KEY
    await token.freeMoney(sender, price)
    await token.freeMoney(sender2, price)
    await token.approve(escrow.address, price, { from: sender })
  })

  context('stake', () => {
    // deadbeat sender has has no money
    context('sender without funds', () => {
      it("can't stake KEY", () => assertThrows(escrow.stake({ from: sender3 })))
    })

    // lazy sender has has money but has not approved transfer
    context('sender that has not approved', () => {
      it("can't stake KEY", () => assertThrows(escrow.stake({ from: sender2 })))
    })

    it('sender with approved amount of KEY can stake', async () => {
      const balance1 = await token.balanceOf(sender)
      const tx = await escrow.stake({ from: sender })
      const balance2 = await token.balanceOf(sender)
      const staked = await escrow.hasStake(sender)
      assert.isTrue(staked)
      assert.notEqual(getLog(tx, 'KEYStaked'), null) // generated event
      assert.equal(balance2.toNumber(), balance1.toNumber() - price)
    })

    it('sender who has staked can not stake again', async () =>
      assertThrows(escrow.stake({ from: sender })))
  })

  context('after successful stake', () => {
    it('sender can not retreive their stake yet', async () =>
      assertThrows(escrow.retrieve({ from: sender })))

    context('hasStake', () => {
      it('escrow has funds for the sender', async () => {
        const hasStake = await escrow.hasStake(sender)
        assert.isTrue(hasStake)
      })

      it('sender with no staked funds returns false', async () => {
        assert.isFalse(await escrow.hasStake(sender3))
      })
    })
  })

  context('owner', () => {
    it('can change the price', async () => {
      const newPrice = 234234999
      await escrow.setPrice(newPrice, { from: owner })
      let contractPrice = await escrow.price.call()
      assert.equal(contractPrice.toNumber(), newPrice)

      // Revert to old price
      await escrow.setPrice(price, { from: owner })
      contractPrice = await escrow.price.call()
      assert.equal(contractPrice.toNumber(), price)
    })

    it('can change the staking period', async () => {
      const newPeriod = 999999
      await escrow.setPeriod(newPeriod, { from: owner })
      let contractPeriod = await escrow.period.call()
      assert.equal(contractPeriod.toNumber(), newPeriod)

      // Revert to old price
      await escrow.setPeriod(period, { from: owner })
      contractPeriod = await escrow.period.call()
      assert.equal(contractPeriod.toNumber(), period)
    })
  })

  context('not owner', () => {
    it('cannot change the price', () =>
      assertThrows(escrow.setPrice(999999, { from: sender })))

    it('cannot change the staking period', () =>
      assertThrows(escrow.setPeriod(7, { from: sender })))
  })
})
