const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const StakingManager = artifacts.require("./StakingManager.sol")

const zeroAddress = "0x0000000000000000000000000000000000000000"

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

  before(async () => {
    // instantiation fails with invalid token address
    assertThrows(StakingManager.new("0"))

    // deploy a mock token contract and instantiate staking manager
    token = await MockKey.new()
    stakingManager = await StakingManager.new(token.address)
    assert.notEqual(stakingManager, null)
    assert.notEqual(stakingManager, undefined)

    // initialize senders' funds
    await token.freeMoney(sender, 4000)
    await token.freeMoney(sender2, 1000)
    await token.freeMoney(sender3, 1000)

    // approve staking manager to spend on behalf of senders
    await token.approve(stakingManager.address, 1000, { from: sender })
    await token.approve(stakingManager.address, 5000, { from: sender3 })
  })

  context("Staking", () => {
    it("sender that has not approved can't stake KEY", () => {
      assertThrows(
        stakingManager.stake(1000, zeroAddress, "ExchangeFoo", {
          from: sender2
        })
      )
    })

    it("sender without funds can't stake KEY", () => {
      assertThrows(
        stakingManager.stake(2000, zeroAddress, "ExchangeFoo", {
          from: sender3
        })
      )
    })

    it("sender cannot attempt to stake zero KEY", () => {
      assertThrows(
        stakingManager.stake(0, zeroAddress, "ExchangeFoo", { from: sender })
      )
    })

    it("sender with approved amount of KEY can stake", async () => {
      const tx = await stakingManager.stake(1000, zeroAddress, "ExchangeFoo", {
        from: sender
      })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        zeroAddress,
        "ExchangeFoo"
      )
      assert.notEqual(getLog(tx, "KEYStaked"), null) // generated event
      assert.equal(Number(stakeBalance), 1000)
    })

    it("sender can stake on another public service", async () => {
      await token.approve(stakingManager.address, 1000, { from: sender })
      await stakingManager.stake(1000, zeroAddress, "ExchangeBar", {
        from: sender
      })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        zeroAddress,
        "ExchangeBar"
      )
      assert.equal(Number(stakeBalance), 1000)
    })

    it("can check whether a stake has been done or not", async () => {
      let has = await stakingManager.hasStake(
        sender,
        zeroAddress,
        "ExchangeBar"
      )
      assert.isTrue(has)

      has = await stakingManager.hasStake(sender, zeroAddress, "ExchangeHarrb")
      assert.isFalse(has)
    })
  })

  context("Withdrawal", () => {
    it("sender cannot withdraw if stake is zero", async () => {
      await assertThrows(
        stakingManager.withdraw(
          zeroAddress,
          "ServiceWhereNOONEhasAnyStakeEver",
          {
            from: sender
          }
        )
      )
    })

    it("sender is able to withdraw her stake", async () => {
      await stakingManager.withdraw(zeroAddress, "ExchangeFoo", {
        from: sender
      })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        zeroAddress,
        "ExchangeFoo"
      )
      assert.equal(Number(stakeBalance), 0)
    })
  })

  context("Custom service parameters", () => {
    it("address can set staking period for a serviceID", async () => {
      await stakingManager.setStakePeriod("serviceHarrb", 5, {
        from: serviceProvider
      })
      const period = await stakingManager.stakePeriods.call(
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(period), 432000) // 5 days = 432000 seconds
    })

    it("address can set staking minimum for a serviceID", async () => {
      const minimum = 1000
      await stakingManager.setMinimumStake("serviceHarrb", minimum, {
        from: serviceProvider
      })
      const setMinimum = await stakingManager.stakeMinimum.call(
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(setMinimum), minimum)
    })

    it("sender cannot stake below minimum", async () => {
      await token.approve(stakingManager.address, 999, { from: sender })
      assertThrows(
        stakingManager.stake(999, serviceProvider, "serviceHarrb", {
          from: sender
        })
      )
    })

    it("sender can stake on a service with custom parameters", async () => {
      await token.approve(stakingManager.address, 1000, { from: sender })
      await stakingManager.stake(1000, serviceProvider, "serviceHarrb", {
        from: sender
      })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(stakeBalance), 1000)

      const isAbove = await stakingManager.hasStakeAboveMinimum.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.isTrue(isAbove)
    })

    it("sender cannot withdraw her stake (yet)", async () => {
      assertThrows(
        stakingManager.withdraw(serviceProvider, "serviceHarrb", {
          from: sender
        })
      )
    })

    it("sender can withdraw her funds after period has passed", async () => {
      await timeTravel(432000)
      await stakingManager.withdraw(serviceProvider, "serviceHarrb", {
        from: sender
      })
      const stakeBalance = await stakingManager.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(stakeBalance), 0)

      // stake is now below minimum
      const isAbove = await stakingManager.hasStakeAboveMinimum.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.isFalse(isAbove)
    })
  })
})
