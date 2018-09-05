pragma solidity ^0.4.23;

import './LockedDepositVault.sol';

/**
 *  Contract for managing refundable deposits for SelfKey
 */
contract RefundableLockedDeposit is LockedDepositVault {

    event PaymentRefunded(uint256 amount, address sender, address serviceOwner, bytes32 serviceID);

    /**
     *  Refund deposit to the original sender. Only service owner can perform it.
     *  @param depositSender - The address of the deposit sender
     *  @param serviceID - Service to withdraw the deposit from
     */
    function refund(address depositSender, bytes32 serviceID) public {
        uint256 funds = balances[depositSender][msg.sender][serviceID];
        require(funds > 0, "There are no funds deposited by given address to this service");
        token.safeTransfer(depositSender, funds);
        emit PaymentRefunded(funds, depositSender, msg.sender, serviceID);
    }
}
