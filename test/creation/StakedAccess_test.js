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

    it('the contract is successfully deployed', async () => {
      assert.notEqual(escrow, null)
      assert.notEqual(escrow, undefined)
      const contractOwner = await escrow.owner()
      assert.equal(contractOwner, owner)
    })
  })

  context('given invalid parameters', () => {
    it('contract deployment fails', async () => {
      // invalid token address
      assertThrows(StakedAccess.new('0x0', period))

      // invalid staking period
      assertThrows(StakedAccess.new(token.address, 0))
    })
  })
})
