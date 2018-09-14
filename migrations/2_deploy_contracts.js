const LockedDepositVault = artifacts.require("./LockedDepositVault.sol")

module.exports = deployer => {
  const tokenAddress = "0x4cc19356f2d37338b9802aa8e8fc58b0373296e7" // Mainnet SelfKey Token
  //const tokenAddress = "0xcfec6722f119240b97effd5afe04c8a97caa02ee" // Ropsten KI token
  deployer.deploy(LockedDepositVault, tokenAddress)
}
