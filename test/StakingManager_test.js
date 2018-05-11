const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const StakingManager = artifacts.require("./StakingManager.sol")

contract("StakingManager", accounts => {
  const [
    owner,
    sender, // a regular sender
    sender2, // a sender who has failed to approve a transfer of KEY
    sender3, // a sender with no KEY
    serviceProvider
  ] = accounts.slice(0)

  const now = new Date().getTime() / 1000

  let stakingManager
  let token
  let serviceID

  before(async () => {
    // instantiation fails with invalid token address
    assertThrows(StakingManager.new("0"))

    // deploy a mock token contract and instantiate staking manager
    token = await MockKey.new()
    stakingManager = await StakingManager.new(token.address)
    assert.notEqual(stakingManager, null)
    assert.notEqual(stakingManager, undefined)
    const contractOwner = await stakingManager.owner()
    assert.equal(contractOwner, owner)

    // initialize senders' funds
    await token.freeMoney(sender, 4000)
    await token.freeMoney(sender2, 1000)
    await token.freeMoney(sender3, 1000)

    // approve staking manager to spend on behalf of senders
    await token.approve(stakingManager.address, 1000, { from: sender })
    await token.approve(stakingManager.address, 5000, { from: sender3 })

    // get service ID from serviceProvider account
    serviceID = await stakingManager.getCallerServiceID({
      from: serviceProvider
    })
  })

  context("Staking", () => {
    it("sender that has not approved can't stake KEY", () => {
      assertThrows(stakingManager.stake(1000, "ExchangeFoo", { from: sender2 }))
    })

    it("sender without funds can't stake KEY", () => {
      assertThrows(stakingManager.stake(2000, "ExchangeFoo", { from: sender3 }))
    })

    it("sender cannot attempt to stake zero KEY", () => {
      assertThrows(stakingManager.stake(0, "ExchangeFoo", { from: sender }))
    })

    it("sender with approved amount of KEY can stake", async () => {
      const tx = await stakingManager.stake(1000, "ExchangeFoo", {
        from: sender
      })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        "ExchangeFoo"
      )
      assert.notEqual(getLog(tx, "KEYStaked"), null) // generated event
      assert.equal(Number(stakeBalance), 1000)
    })

    it("sender can stake on another service", async () => {
      await token.approve(stakingManager.address, 1000, { from: sender })
      await stakingManager.stake(1000, "ExchangeBar", { from: sender })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        "ExchangeBar"
      )
      assert.equal(Number(stakeBalance), 1000)
    })
  })

  context("Withdrawal", () => {
    it("sender is able to withdraw part of her stake", async () => {
      await stakingManager.withdraw(500, "ExchangeFoo", { from: sender })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        "ExchangeFoo"
      )
      assert.equal(Number(stakeBalance), 500)
    })

    it("sender cannot attempt to withdraw 0 tokens", async () => {
      assertThrows(stakingManager.withdraw(0, "ExchangeFoo", { from: sender })) //????????????????
    })

    it("sender cannot attempt to withdraw more than her actual balance", async () => {
      assertThrows(
        stakingManager.withdraw(9999, "ExchangeFoo", { from: sender })
      )
    })
  })

  context("Custom service parameters", () => {
    it("address can set staking period for serviceID = hash(address)", async () => {
      await stakingManager.setServiceStakePeriod(5, { from: serviceProvider })
      const period = await stakingManager.stakePeriods.call(serviceID)
      assert.equal(Number(period), 432000) // 5 days = 432000 seconds
    })

    it("address can set staking minimum for serviceID = hash(address)", async () => {
      await stakingManager.setServiceMinimumStake(1000, {
        from: serviceProvider
      })
      const minimum = await stakingManager.stakeMinimum.call(serviceID)
      assert.equal(Number(minimum), 1000)
    })

    it("sender cannot stake below minimum", async () => {
      await token.approve(stakingManager.address, 999, { from: sender })
      assertThrows(stakingManager.stake(999, serviceID, { from: sender }))
    })

    it("sender can stake on a service with custom parameters", async () => {
      await token.approve(stakingManager.address, 1000, { from: sender })
      await stakingManager.stake(1000, serviceID, { from: sender })
      const stakeBalance = await stakingManager.balances.call(sender, serviceID)
      assert.equal(Number(stakeBalance), 1000)
    })

    it("sender cannot withdraw her stake (yet)", async () => {
      assertThrows(stakingManager.withdraw(500, serviceID, { from: sender }))
    })

    it("sender can withdraw her funds after period has passed", async () => {
      await timeTravel(432000)
      await stakingManager.withdraw(500, serviceID, { from: sender })
      const stakeBalance = await stakingManager.balances.call(sender, serviceID)
      assert.equal(Number(stakeBalance), 500)
    })
  })
})
