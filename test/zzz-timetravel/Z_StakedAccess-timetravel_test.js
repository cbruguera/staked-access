const timeTravel = require("../utils/timeTravel")
const { getLog } = require("../utils/txHelpers")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const StakedAccess = artifacts.require("./StakedAccess.sol")

contract("StakedAccess (after time travel)", accounts => {
  const [sender] = accounts.slice(1)

  const price = 10
  const period = 2592000 // 30 days

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(token.address, period)

    // make sure sender has some KEY
    await token.freeMoney(sender, price * 2)
    await token.approve(escrow.address, price, { from: sender })
    await escrow.stake(price, { from: sender })
    assert.isTrue(await escrow.hasStake(sender))
    await timeTravel(period)
  })

  context("retrieving funds", () => {
    it("sender can retrieve their funds", async () => {
      const amount = 2
      const balance1 = await token.balanceOf.call(sender)
      let tx = await escrow.retrieve(amount, { from: sender })
      const balance2 = await token.balanceOf.call(sender)
      assert.notEqual(getLog(tx, "KEYRetrieved"), null)
      assert.equal(Number(balance2), Number(balance1) + amount)

      // sender still has some stake left
      assert.isTrue(await escrow.hasStake(sender))

      // now retrieve all
      tx = await escrow.retrieveAll({ from: sender })
      assert.isFalse(await escrow.hasStake(sender))
    })
  })
})
