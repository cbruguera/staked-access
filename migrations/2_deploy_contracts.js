const StakedAccess = artifacts.require('./StakedAccess.sol')

module.exports = deployer => {
  const now = new Date().getTime() / 1000

  const expiry = now + 2592000 // 30 days after start
  const price = 10000000000000000000 // 10 KEY
  const tokenAddress = '0x29dc722b24a08ba7ed602219574a8b041fde92fc' // ropsten test

  deployer.deploy(StakedAccess, expiry, price, tokenAddress)
}
