const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const DepositVault = artifacts.require("./DepositVault.sol")

const zeroAddress = "0x0000000000000000000000000000000000000000"

contract("DepositVault", accounts => {
  const [owner, sender, sender2, sender3, serviceProvider] = accounts.slice(0)

  const now = new Date().getTime() / 1000

  let depositVault
  let token

  before(async () => {
    // instantiation fails with invalid token address
    await assertThrows(DepositVault.new("0"))

    // deploy a mock token contract and instantiate staking manager
    token = await MockKey.new()
    depositVault = await DepositVault.new(token.address)
    assert.notEqual(depositVault, null)
    assert.notEqual(depositVault, undefined)

    // initialize senders' funds
    await token.freeMoney(sender, 4000)
    await token.freeMoney(sender2, 1000)
    await token.freeMoney(sender3, 1000)

    // approve staking manager to spend on behalf of senders
    await token.approve(depositVault.address, 1000, { from: sender })
    await token.approve(depositVault.address, 5000, { from: sender3 })
  })

  context("Deposits", () => {
    it("sender that has not approved can't deposit KEY", async () => {
      await assertThrows(
        depositVault.deposit(1000, zeroAddress, "ExchangeFoo", {
          from: sender2
        })
      )
    })

    it("sender without funds can't deposit KEY", async () => {
      await assertThrows(
        depositVault.deposit(2000, zeroAddress, "ExchangeFoo", {
          from: sender3
        })
      )
    })

    it("sender cannot attempt to deposit zero KEY", async () => {
      await assertThrows(
        depositVault.deposit(0, zeroAddress, "ExchangeFoo", { from: sender })
      )
    })

    it("sender with approved amount of KEY can deposit", async () => {
      const tx = await depositVault.deposit(1000, zeroAddress, "ExchangeFoo", {
        from: sender
      })
      const depositBalance = await depositVault.balances.call(
        sender,
        zeroAddress,
        "ExchangeFoo"
      )
      assert.notEqual(getLog(tx, "KEYDeposited"), null) // generated event
      assert.equal(Number(depositBalance), 1000)
    })

    it("sender can deposit on another public service", async () => {
      await token.approve(depositVault.address, 1000, { from: sender })
      await depositVault.deposit(1000, zeroAddress, "ExchangeBar", {
        from: sender
      })
      const depositBalance = await depositVault.balances.call(
        sender,
        zeroAddress,
        "ExchangeBar"
      )
      assert.equal(Number(depositBalance), 1000)
    })
  })

  context("Withdrawal", () => {
    it("sender cannot withdraw if deposit is zero", async () => {
      await assertThrows(
        depositVault.withdraw(
          zeroAddress,
          "ServiceWhereNOONEhasAnydepositEver",
          {
            from: sender
          }
        )
      )
    })

    it("sender is able to withdraw her deposit", async () => {
      await depositVault.withdraw(zeroAddress, "ExchangeFoo", {
        from: sender
      })
      const depositBalance = await depositVault.balances.call(
        sender,
        zeroAddress,
        "ExchangeFoo"
      )
      assert.equal(Number(depositBalance), 0)
    })

    it("can be paused and unpaused", async () => {
      await depositVault.pause()
      let paused = await depositVault.paused.call()
      assert.isTrue(paused, true)

      await depositVault.unpause()
      paused = await depositVault.paused.call()
      assert.isFalse(paused, false)
    })

    it("can be paused and upgraded", async () => {
      await depositVault.pauseAndUpgrade(999999)
      const paused = await depositVault.paused.call()
      const newContract = await depositVault.newContract.call()
      assert.equal(paused, true)
      assert.equal(Number(newContract), 999999)
    })

    it("cannot be unpaused if newContract is set", async () => {
      await assertThrows(depositVault.unpause())
    })
  })
})
