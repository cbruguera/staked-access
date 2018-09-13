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
    await token.freeMoney(sender, 4000)
    await token.freeMoney(sender2, 1000)
    await token.freeMoney(sender3, 5000)

    // approve deposit contract to spend on behalf of senders
    await token.approve(depositVault.address, 1000, { from: sender })
    await token.approve(depositVault.address, 1000, { from: sender2 })
    await token.approve(depositVault.address, 5000, { from: sender3 })
  })

  context("Deposit timelock with refund", () => {
    it("cannot refund to an address that has no deposit for serviceID", async () => {
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
