const assertThrows = require('../utils/assertThrows')

const MockKey = artifacts.require('./mocks/MockKEY.sol')
const StakedAccess = artifacts.require('./StakedAccess.sol')

contract('StakedAccess (creation)', ([owner]) => {
  const period = 2592000 // 30 days

  let token

  before(async () => {
    token = await MockKey.new()
  })

  context('given valid parameters', () => {
    let escrow

    before(async () => {
      escrow = await StakedAccess.new(token.address, period)
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
    it('will not create a contract with an invalid token address', async () =>
      assertThrows(StakedAccess.new('0x0', period)))

    it('will not create a contract with an invalid staking period', async () =>
      assertThrows(StakedAccess.new(token.address, 0)))
  })
})
