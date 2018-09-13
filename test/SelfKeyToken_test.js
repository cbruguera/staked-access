const assertThrows = require("./utils/assertThrows")
const { getLog } = require("./utils/txHelpers")
const timeTravel = require("./utils/timeTravel")

const MockKey = artifacts.require("../test/mock/MockKey.sol")
const SelfKeyToken = artifacts.require("./SelfKeyToken.sol")

contract("SelfKeyToken", accounts => {
  const [owner, sender, sender2, sender3] = accounts.slice(0)

  const now = new Date().getTime() / 1000
  const cap = 999999
  let token

  before(async () => {
    // deploy a mock token contract and instantiate staking manager
    token = await SelfKeyToken.new(cap)
    assert.notEqual(token, null)
    assert.notEqual(token, undefined)
  })

  context("Minting", () => {
    it("non-owner cannot mint tokens", async () => {
      assertThrows(token.mint(sender, 500, { from: sender }))
    })

    it("contract owner can mint new tokens", async () => {
      await token.mint(sender, 1000, { from: owner })
      const balance = await token.balanceOf.call(sender)
      assert.equal(Number(balance), 1000)

      // mint tokens to be burned later
      await token.mint(owner, 999, { from: owner })
    })

    it("tokens cannot be minted above cap", async () => {
      assertThrows(token.mint(sender2, cap + 100, { from: owner }))
    })

    it("cannot transfer until transfers are enabled", async () => {
      assertThrows(token.transfer(sender2, 1, { from: sender }))
    })
  })

  context("Transfers", () => {
    it("contract can be enabled for transfer", async () => {
      await token.enableTransfers()
    })

    it("tokens can be transferred directly", async () => {
      const senderBalance = await token.balanceOf.call(sender)
      await token.transfer(sender2, 200, { from: sender })
      const balance = await token.balanceOf.call(sender2)
      assert.equal(Number(balance), 200)
      assert.equal(
        Number(await token.balanceOf.call(sender)),
        Number(senderBalance) - 200
      )
    })

    it("tokens can be approved for delegate transfer", async () => {
      await token.approve(sender3, 500, { from: sender })
      const allowance = await token.allowance.call(sender, sender3)
      assert.equal(Number(allowance), 500)
      await token.transferFrom(sender, sender2, 500, { from: sender3 })
      const balance = await token.balanceOf(sender2)
      assert.equal(Number(balance), 700)
    })
  })

  context("Burning", () => {
    it("cannot burn zero tokens", async () => {
      assertThrows(token.burn(0))
    })
    it("contract owner can burn tokens", async () => {
      const beforeSupply = await token.totalSupply.call()
      await token.burn(111)
      const afterSupply = await token.totalSupply.call()
      const balance = await token.balanceOf.call(owner)
      assert.equal(Number(balance), 888)
      assert.equal(Number(afterSupply), Number(beforeSupply) - 111)
    })
  })
})
