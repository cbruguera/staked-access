const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const RefundableDepositVault = artifacts.require("./RefundableDepositVault.sol")

contract("RefundableDepositVault", accounts => {
  const [owner, sender, sender2, sender3, serviceProvider] = accounts.slice(0)

  const now = new Date().getTime() / 1000

  let depositVault
  let token

  before(async () => {
    // instantiation fails with invalid token address
    assertThrows(RefundableDepositVault.new("0"))

    // deploy a mock token contract and instantiate deposit vault
    token = await MockKey.new()
    depositVault = await RefundableDepositVault.new(token.address)
    assert.notEqual(depositVault, null)
    assert.notEqual(depositVault, undefined)

    // initialize senders' funds
    await token.freeMoney(sender, 10000)
    await token.freeMoney(sender2, 10000)
    await token.freeMoney(sender3, 10000)

    // approve deposit contract to spend on behalf of senders
    await token.approve(depositVault.address, 999999000000000000000000, {
      from: sender
    })
    await token.approve(depositVault.address, 999999000000000000000000, {
      from: sender2
    })
    await token.approve(depositVault.address, 999999000000000000000000, {
      from: sender3
    })
  })

  context("Mass refund", () => {
    it("Service owner can refund all depositors for a given serviceID", async () => {
      await depositVault.deposit(1000, serviceProvider, "MarketBorl", {
        from: sender
      })
      await depositVault.deposit(1000, serviceProvider, "MarketBorl", {
        from: sender2
      })
      await depositVault.deposit(1000, serviceProvider, "MarketBorl", {
        from: sender3
      })
      let balance = await token.balanceOf.call(depositVault.address)
      let count = await depositVault.depositorCount.call(
        serviceProvider,
        "MarketBorl"
      )
      assert.equal(Number(balance), 3000)
      assert.equal(Number(count), 3)

      // increasing a depositor stake does not modify the depositor list
      await depositVault.deposit(1000, serviceProvider, "MarketBorl", {
        from: sender3
      })
      assert.equal(Number(count), 3)
      const index = await depositVault.indexes.call(
        serviceProvider,
        "MarketBorl",
        sender3
      )
      assert.equal(Number(index), 2)

      // refund to all depositors at once
      await depositVault.refundAll("MarketBorl", { from: serviceProvider })
      balance = await token.balanceOf.call(depositVault.address)
      count = await depositVault.depositorCount.call(
        serviceProvider,
        "MarketBorl"
      )
      assert.equal(Number(balance), 0)
      assert.equal(Number(count), 0)
    })
  })

  context("Deposit timelock with refund", () => {
    it("cannot refund to an address that has no deposit", async () => {
      await assertThrows(
        depositVault.refund(sender, "serviceNull", { from: serviceProvider })
      )
    })

    it("Service owner can trigger refund for depositor", async () => {
      // Set lock period
      await depositVault.setLockPeriod("serviceHarrb", 432000, {
        from: serviceProvider
      })

      // Make a deposit
      await depositVault.deposit(1000, serviceProvider, "serviceHarrb", {
        from: sender
      })
      const depositBalance = await depositVault.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 1000)
      const tokenBalance1 = await token.balanceOf.call(sender)

      // depositor shouldn't be able to withdraw
      await assertThrows(
        depositVault.withdraw(serviceProvider, "serviceHarrb", {
          from: sender
        })
      )

      // trigger refund
      await depositVault.refund(sender, "serviceHarrb", {
        from: serviceProvider
      })

      // check balances
      const depositBalance2 = await depositVault.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance2), 0)
      const tokenBalance2 = await token.balanceOf.call(sender)
      assert.equal(Number(tokenBalance2), Number(tokenBalance1) + 1000)
    })
  })
})
