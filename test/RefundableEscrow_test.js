const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const RefundableEscrow = artifacts.require("./RefundableEscrow.sol")

const zeroAddress = "0x0000000000000000000000000000000000000000"

contract("RefundableEscrow", accounts => {
  const [owner, sender, sender2, sender3, serviceProvider] = accounts.slice(0)

  const now = new Date().getTime() / 1000

  let escrow
  let token

  before(async () => {
    // instantiation fails with invalid token address
    assertThrows(RefundableEscrow.new("0"))

    // deploy a mock token contract and instantiate staking manager
    token = await MockKey.new()
    escrow = await RefundableEscrow.new(token.address)
    assert.notEqual(escrow, null)
    assert.notEqual(escrow, undefined)

    // initialize senders' funds
    await token.freeMoney(sender, 4000)
    await token.freeMoney(sender2, 1000)
    await token.freeMoney(sender3, 1000)

    // approve staking manager to spend on behalf of senders
    await token.approve(escrow.address, 4000, { from: sender })
    await token.approve(escrow.address, 5000, { from: sender3 })
  })

  context("Deposits", () => {
    it("sender cannot make payment to 0x0", () => {
      assertThrows(
        escrow.deposit(1000, zeroAddress, "ExchangeFoo", {
          from: sender
        })
      )
    })

    it("sender with approved amount of KEY can deposit", async () => {
      const tx = await escrow.deposit(1000, serviceProvider, "ExchangeFoo", {
        from: sender
      })
      const depositBalance = await escrow.balances.call(
        sender,
        serviceProvider,
        "ExchangeFoo"
      )
      assert.notEqual(getLog(tx, "KEYDeposited"), null) // generated event
      assert.equal(Number(depositBalance), 1000)
    })

    it("depositor cannot withdraw if contract is unpaused", async () => {
      assertThrows(
        escrow.withdraw(serviceProvider, "ExchangeFoo", { from: sender })
      )
    })
  })

  context("Releasing payment", () => {
    it("cannot make a release without a deposit", async () => {
      assertThrows(
        escrow.release(serviceProvider, "ExchangeEmpty", { from: sender })
      )
    })

    it("depositor can release a payment when desired", async () => {
      const tokenBalance1 = await token.balanceOf.call(serviceProvider)
      await escrow.release(serviceProvider, "ExchangeFoo", { from: sender })
      const depositBalance = await escrow.balances.call(
        sender,
        serviceProvider,
        "ExchangeFoo"
      )
      const tokenBalance2 = await token.balanceOf.call(serviceProvider)
      assert.equal(Number(depositBalance), 0)
      assert.equal(Number(tokenBalance2), Number(tokenBalance1) + 1000)
    })
  })

  context("Refunding payment", () => {
    it("cannot trigger refund to an address that has not made a deposit", async () => {
      assertThrows(
        escrow.refund(sender, "ExchangeNothingHere", { from: serviceProvider })
      )
    })

    it("service owner can refund a deposit anytime", async () => {
      // make another payment first
      await escrow.deposit(1000, serviceProvider, "ExchangeFoo", {
        from: sender
      })

      const depositBalance1 = await escrow.balances.call(
        sender,
        serviceProvider,
        "ExchangeFoo"
      )
      assert.equal(Number(depositBalance1), 1000)
      const tokenBalance1 = await token.balanceOf.call(sender)

      // refund
      await escrow.refund(sender, "ExchangeFoo", { from: serviceProvider })
      const depositBalance2 = await escrow.balances.call(
        sender,
        serviceProvider,
        "ExchangeFoo"
      )
      const tokenBalance2 = await token.balanceOf.call(sender)
      assert.equal(Number(depositBalance2), 0)
      assert.equal(Number(tokenBalance2), Number(tokenBalance1) + 1000)
    })
  })

  context("Pausing the contract", () => {
    it("contract can be paused", async () => {
      // make some deposits before pausing
      await token.approve(escrow.address, 1000, { from: sender })
      await escrow.deposit(1000, serviceProvider, "serviceHarrb", {
        from: sender
      })
      const depositBalance = await escrow.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 1000)

      // sender cannot withdraw since the contract is unpaused
      await assertThrows(
        escrow.withdraw(serviceProvider, "serviceHarrb", {
          from: sender
        })
      )

      // pause contract
      await escrow.pause()
      const paused = await escrow.paused.call()
      assert.isTrue(paused)
    })

    it("new paymets cannot be made when contract is paused", async () => {
      await assertThrows(
        escrow.deposit(1000, serviceProvider, "serviceHarrb", { from: sender2 })
      )
    })

    it("locked deposits can still be withdrawn if contract is paused", async () => {
      // Check contract is paused
      const paused = await escrow.paused.call()
      assert.isTrue(paused)

      await escrow.withdraw(serviceProvider, "serviceHarrb", {
        from: sender
      })

      const depositBalance = await escrow.balances.call(
        sender,
        serviceProvider,
        "serviceHarrb"
      )
      assert.equal(Number(depositBalance), 0)
    })
  })
})
