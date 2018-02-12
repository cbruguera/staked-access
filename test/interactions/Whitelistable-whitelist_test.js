const Whitelistable = artifacts.require('./Whitelistable.sol')
const { getLog } = require('../utils/txHelpers')
const assertThrows = require('../utils/assertThrows')

contract('Whitelistable (whitelister)', ([owner, whitelister, punter]) => {
  let whitelistable
  let tx

  before(async () => {
    whitelistable = await Whitelistable.new()
    await whitelistable.addWhitelister(whitelister)
  })

  it('isWhitelisted is false before address is whitelisted', async () => {
    assert.isFalse(await whitelistable.isWhitelisted(punter))
  })

  it('isWhitelisted is false if supplied 0x0 address', async () => {
    assert.isFalse(await whitelistable.isWhitelisted('0x0'))
  })

  context('sender is whitelister', () => {
    const fromWhitelister = { from: whitelister }

    context('given valid address', () => {
      describe('addToWhitelist', () => {
        before(async () => {
          tx = await whitelistable.addToWhitelist(punter, fromWhitelister)
        })

        it('added the address to the whitelist', () => {
          assert.notEqual(getLog(tx, 'Whitelisted'), null)
        })

        describe('addToWhitelist again', () => {
          before(async () => {
            tx = await whitelistable.addToWhitelist(punter, fromWhitelister)
          })

          it('does nothing', () => {
            assert.throws(() => getLog(tx, 'Whitelisted'))
          })
        })

        it('isWhitelisted is true', async () => {
          assert.isTrue(await whitelistable.isWhitelisted(punter))
        })

        describe('removeFromWhitelist', () => {
          before(async () => {
            tx = await whitelistable.removeFromWhitelist(
              punter,
              fromWhitelister
            )
          })

          it('removed the whitelister', () => {
            assert.notEqual(getLog(tx, 'WhitelistedAddressRemoved'), null)
          })

          describe('removeWhitelister again', () => {
            before(async () => {
              tx = await whitelistable.removeFromWhitelist(
                punter,
                fromWhitelister
              )
            })

            it('does nothing', () => {
              assert.throws(() => getLog(tx, 'WhitelistedAddressRemoved'))
            })
          })

          it('isWhitelisted is false', async () => {
            assert.isFalse(await whitelistable.isWhitelisted(punter))
          })
        })
      })
    })

    context('given invalid address', () => {
      const invalid = '0x0'

      it('will not add to the whitelist', () =>
        assertThrows(whitelistable.addToWhitelist(invalid, fromWhitelister)))

      it('will not remove a whitelister', () =>
        assertThrows(
          whitelistable.removeFromWhitelist(invalid, fromWhitelister)
        ))
    })
  })

  context('sender is not whitelister', () => {
    it('will not add to the whitelist', () =>
      assertThrows(whitelistable.addToWhitelist(punter)))

    it('will not remove a whitelister', () =>
      assertThrows(whitelistable.removeFromWhitelist(punter)))
  })
})
