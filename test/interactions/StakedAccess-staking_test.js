const assertThrows = require("../utils/assertThrows")
const { getLog } = require("../utils/txHelpers")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const StakedAccess = artifacts.require("./StakedAccess.sol")

contract("StakedAccess (interactions)", accounts => {
  const [
    owner,
    sender, // a regular sender
    sender2, // a sender who has failed to approve a transfer of KEY
    sender3 // a sender with no KEY
  ] = accounts.slice(0)

  const price = 10
  const period = 2592000 // 30 days
  const now = new Date().getTime() / 1000

  let escrow
  let token

  before(async () => {
    token = await MockKey.new()
    // create an escrow
    escrow = await StakedAccess.new(token.address, period)

    // make sure sender and sender2 have some KEY
    await token.freeMoney(sender, price * 2)
    await token.freeMoney(sender2, price)
    await token.approve(escrow.address, price, { from: sender })
  })

  context("stake", () => {
    // sender has has no money
    it("sender without funds can't stake KEY", () => {
      assertThrows(escrow.stake(price, { from: sender3 }))
    })

    // sender has has money but has not approved transfer
    it("sender that has not approved can't stake KEY", () => {
      assertThrows(escrow.stake(price, { from: sender2 }))
    })

    it("sender with approved amount of KEY can stake", async () => {
      const balance1 = await token.balanceOf(sender)
      const tx = await escrow.stake(price, { from: sender })
      const balance2 = await token.balanceOf(sender)
      const staked = await escrow.hasStake(sender)
      assert.isTrue(staked)
      assert.notEqual(getLog(tx, "KEYStaked"), null) // generated event
      assert.equal(balance2.toNumber(), balance1.toNumber() - price)
    })

    it("sender who has staked can stake again", async () => {
      await token.approve(escrow.address, price, { from: sender })
      await escrow.stake(price, { from: sender })
      const stakeBalance = await escrow.balances.call(sender)
      assert.equal(Number(stakeBalance), price * 2)
    })
  })

  context("after successful stake", () => {
    it("sender can not retrieve their stake yet", async () => {
      assertThrows(escrow.retrieveAll({ from: sender }))
    })

    it("contract has funds for the sender", async () => {
      const hasStake = await escrow.hasStake(sender)
      assert.isTrue(hasStake)
    })

    it("sender with no staked funds returns false on call to `hasStake()`", async () => {
      assert.isFalse(await escrow.hasStake(sender3))
    })

    it("release date for sender is updated", async () => {
      const releaseDate = await escrow.getReleaseDate(sender)
      assert.isAbove(Number(releaseDate), now)
    })
  })

  context("contract owner", () => {
    it("can change the staking period", async () => {
      const newPeriod = 999999
      await escrow.setPeriod(newPeriod, { from: owner })
      let contractPeriod = await escrow.period.call()
      assert.equal(contractPeriod.toNumber(), newPeriod)

      // Revert to old period (for timetravel to work later)
      await escrow.setPeriod(period, { from: owner })
      contractPeriod = await escrow.period.call()
      assert.equal(contractPeriod.toNumber(), period)
    })
  })

  context("not-owner address", () => {
    it("cannot change the staking period", () => {
      assertThrows(escrow.setPeriod(7, { from: sender }))
    })
  })
})
