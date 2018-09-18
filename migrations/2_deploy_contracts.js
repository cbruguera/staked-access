//const LockedDepositVault = artifacts.require("./LockedDepositVault.sol")
const RefundableDepositVault = artifacts.require("./RefundableDepositVault.sol")
const RefundableEscrow = artifacts.require("./RefundableEscrow.sol")

module.exports = deployer => {
  //const tokenAddress = "0x4cc19356f2d37338b9802aa8e8fc58b0373296e7" // Mainnet SelfKey Token
  const tokenAddress = "0xcfec6722f119240b97effd5afe04c8a97caa02ee" // Ropsten KI token

  //deployer.deploy(LockedDepositVault, tokenAddress)
  //deployer.deploy(RefundableDepositVault, tokenAddress)
  deployer.deploy(RefundableEscrow, tokenAddress)
}
