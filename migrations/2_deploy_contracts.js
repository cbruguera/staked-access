const StakedAccess = artifacts.require('./StakedAccess.sol')

module.exports = deployer => {
  const now = new Date().getTime() / 1000

  const tokenAddress = '0x4cc19356f2d37338b9802aa8e8fc58b0373296e7' // Mainnet SelfKey Token
  const period = 2592000 // 30 days

  deployer.deploy(StakedAccess, tokenAddress, period)
}
