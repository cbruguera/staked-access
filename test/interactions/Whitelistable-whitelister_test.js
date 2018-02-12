const Whitelistable = artifacts.require('./Whitelistable.sol')
const { getLog } = require('../utils/txHelpers')
const assertThrows = require('../utils/assertThrows')

contract('Whitelistable (whitelister)', ([owner, whitelister]) => {
  let whitelistable
  let tx

  before(async () => {
    whitelistable = await Whitelistable.new()
  })

  describe('whitelisters', () => {
    context('given valid address', () => {
      describe('addWhitelister', () => {
        before(async () => {
          tx = await whitelistable.addWhitelister(whitelister)
        })

        it('added the whitelister', () => {
          assert.notEqual(getLog(tx, 'WhitelisterAdded'), null)
        })

        describe('addWhitelister again', () => {
          before(async () => {
            tx = await whitelistable.addWhitelister(whitelister)
          })

          it('does nothing', () => {
            assert.throws(() => getLog(tx, 'WhitelisterAdded'))
          })
        })

        describe('removeWhitelister', () => {
          before(async () => {
            tx = await whitelistable.removeWhitelister(whitelister)
          })

          it('removed the whitelister', () => {
            assert.notEqual(getLog(tx, 'WhitelisterRemoved'), null)
          })

          describe('removeWhitelister again', () => {
            before(async () => {
              tx = await whitelistable.removeWhitelister(whitelister)
            })

            it('does nothing', () => {
              assert.throws(() => getLog(tx, 'WhitelisterRemoved'))
            })
          })
        })
      })
    })

    context('given invalid address', () => {
      const invalid = '0x0'

      it('will not add a whitelister', () =>
        assertThrows(whitelistable.addWhitelister(invalid)))

      it('will not remove a whitelister', () =>
        assertThrows(whitelistable.removeWhitelister(invalid)))
    })
  })
})
