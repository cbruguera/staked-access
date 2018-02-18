const timeTravel = require('../utils/timeTravel')
const assertThrows = require('../utils/assertThrows')
const { getLog } = require('../utils/txHelpers')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (after time travel)', accounts => {
  const [sender, sender2] = accounts.slice(1)

  const price = 10
  const period = 2592000 // 30 days

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(price, token.address, period)

    // make sure sender has some KEY
    await token.freeMoney(sender, price * 2)
    await token.approve(escrow.address, price, { from: sender })
    await escrow.stake({ from: sender })
    assert.isTrue(await escrow.hasStake(sender))
    await timeTravel(period)
  })

  context('retrieving funds', () => {
    it('sender can not stake funds before retrieval', async () =>
      assertThrows(escrow.stake({ from: sender })))

    it('sender can retrieve their funds', async () => {
      const balance1 = await token.balanceOf(sender)
      const tx = await escrow.retrieve({ from: sender })
      const balance2 = await token.balanceOf(sender)
      assert.notEqual(getLog(tx, 'KEYRetrieved'), null)
      assert.equal(balance2.toNumber(), balance1.toNumber() + price)
      assert.isFalse(await escrow.hasStake(sender))
    })

    it('sender can stake again now', async () => {
      await token.approve(escrow.address, price, { from: sender })
      await escrow.stake({ from: sender })
      assert.isTrue(await escrow.hasStake(sender))
    })
  })
})
