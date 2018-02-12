const Whitelistable = artifacts.require('./Whitelistable.sol')

contract('Whitelistable (creation)', ([owner]) => {
  let whitelistable

  before(async () => {
    whitelistable = await Whitelistable.new()
  })

  it('created the contract', () => {
    assert.notEqual(whitelistable, null)
    assert.notEqual(whitelistable, undefined)
  })

  it('has the correct owner', async () => {
    assert.equal(await whitelistable.owner(), owner)
  })
})
