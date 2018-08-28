pragma solidity ^0.4.23;

import './LockedDepositVault.sol';

/**
 *  Contract for managing general deposits and staking functionality for SelfKey
 */
contract CollaborativeDepositVault  is LockedDepositVault{

    event DepositedFor(
        address from,
        uint256 amount,
        address beneficiary,
        address serviceOwner,
        bytes32 serviceID);

    /**
     *  depositFor allows third parties to deposit on behalf of a service beneficiary
     */
    function depositFor(
        uint256 amount,
        address beneficiary,
        address serviceOwner,
        bytes32 serviceID)
        public
    {
        require(amount > 0,
            "Deposit amount must be greater than zero");
        require(token.allowance(msg.sender, address(this)) >= amount,
            "Sender address has not allowed this contract for spending");
        require(token.balanceOf(msg.sender) >= amount,
            "Sender address has insufficient KEY funds");

        balances[beneficiary][serviceOwner][serviceID] += amount;
        totalStakeByServiceID[serviceOwner][serviceID] += amount;

        // token transferFrom requires prior approval on the token contract
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositedFor(msg.sender, amount, beneficiary, serviceOwner, serviceID);
    }

}
