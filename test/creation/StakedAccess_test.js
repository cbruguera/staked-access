// ref https://medium.com/level-k/testing-smart-contracts-with-truffle-7849b3d9961

const assertThrows = require('../utils/assertThrows')
const { makeTime } = require('../utils/fakes')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (creation)', ([owner]) => {
  const price = 10
  const expiry = makeTime()

  let token

  before(async () => {
    token = await MockKey.new()
  })

  context('given valid parameters', () => {
    let escrow

    before(async () => {
      escrow = await StakedAccess.new(expiry, price, token.address)
    })

    it('created the contract', () => {
      assert.notEqual(escrow, null)
      assert.notEqual(escrow, undefined)
    })

    it('has the correct owner', async () => {
      assert.equal(await escrow.owner(), owner)
    })
  })

  context('given invalid parameters', () => {
    it('will not create a contract with an invalid date', async () =>
      assertThrows(StakedAccess.new(makeTime(-100), price, token.address)))

    it('will not create a contract with an invalid price', async () =>
      assertThrows(StakedAccess.new(expiry, 0, token.address)))

    it('will not create a contract with an invalid token address', async () =>
      assertThrows(StakedAccess.new(expiry, price, '0x0')))
  })
})
