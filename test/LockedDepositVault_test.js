const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const LockedDepositVault = artifacts.require("./LockedDepositVault.sol")

contract("LockedDepositVault", accounts => {
  const [owner, sender, sender2, sender3, serviceProvider] = accounts.slice(0)

  const now = new Date().getTime() / 1000

  let depositVault
  let token

  before(async () => {
    // instantiation fails with invalid token address
    assertThrows(LockedDepositVault.new("0"))

    // deploy a mock token contract and instantiate deposit vault
    token = await MockKey.new()
    depositVault = await LockedDepositVault.new(token.address)
    assert.notEqual(depositVault, null)
    assert.notEqual(depositVault, undefined)

    // initialize senders' funds
    await token.freeMoney(sender, 4000)
    await token.freeMoney(sender2, 1000)
    await token.freeMoney(sender3, 5000)

    // approve deposit contract to spend on behalf of senders
    await token.approve(depositVault.address, 1000, { from: sender })
    await token.approve(depositVault.address, 1000, { from: sender2 })
    await token.approve(depositVault.address, 5000, { from: sender3 })
  })

  context("No timelock set", () => {
    it("deposits without timelock behave as normal, no lock period is started", async () => {
      await depositVault.deposit(1000, serviceProvider, "serviceHarrb", {
        from: sender3
      })
      const depositBalance = await depositVault.balances.call(
        sender3,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 1000)
      const releaseDate = await depositVault.releaseDates.call(
        sender3,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(releaseDate), 0)
    })
  })

  context("Deposit timelock", () => {
    it("Service owner can set timelock period for a serviceID", async () => {
      await depositVault.setLockPeriod("serviceHarrb", 432000, {
        from: serviceProvider
      })
      const period = await depositVault.lockPeriods.call(
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(period), 432000) // 5 days = 432000 seconds
    })

    it("sender can deposit on a service with custom parameters", async () => {
      await token.approve(depositVault.address, 1000, { from: sender })
      await depositVault.deposit(1000, serviceProvider, "serviceHarrb", {
        from: sender
      })
      const depositBalance = await depositVault.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 1000)
    })

    it("sender cannot withdraw her deposit (yet)", async () => {
      await assertThrows(
        depositVault.withdraw(serviceProvider, "serviceHarrb", {
          from: sender
        })
      )
    })

    it("sender can withdraw her funds after period has passed", async () => {
      await timeTravel(432000)
      await depositVault.withdraw(serviceProvider, "serviceHarrb", {
        from: sender
      })

      const depositBalance = await depositVault.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 0)
    })
  })

  context("Pausing the contract", () => {
    it("contract can be paused", async () => {
      // make some deposits before pausing
      await token.approve(depositVault.address, 1000, { from: sender })
      await depositVault.deposit(1000, serviceProvider, "serviceHarrb", {
        from: sender
      })
      const depositBalance = await depositVault.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 1000)

      // sender cannot withdraw since funds should be locked
      await assertThrows(
        depositVault.withdraw(serviceProvider, "serviceHarrb", {
          from: sender
        })
      )

      // pause contract
      await depositVault.pause()
      const paused = await depositVault.paused.call()
      assert.isTrue(paused)
    })

    it("deposits cannot be made when contract is paused", async () => {
      await assertThrows(
        depositVault.deposit(1000, serviceProvider, "serviceHarrb", {
          from: sender2
        })
      )
    })

    it("locked deposits can still be withdrawn if contract is paused", async () => {
      // Check contract is paused
      const paused = await depositVault.paused.call()
      assert.isTrue(paused)

      await depositVault.withdraw(serviceProvider, "serviceHarrb", {
        from: sender
      })

      const depositBalance = await depositVault.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 0)
    })
  })
})
