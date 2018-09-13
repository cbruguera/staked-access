pragma solidity ^0.4.23;

import './LockedDepositVault.sol';

/**
 *  Refundable version of locked deposit vault. Service owner can trigger a force-refund anytime.
 */
contract RefundableDepositVault is LockedDepositVault {

    event PaymentRefunded(
        uint256 amount,
        address depositor,
        address serviceOwner,
        bytes32 serviceID
    );

    constructor(address _token) LockedDepositVault(_token) public { }

    /**
     *  Refund deposit to the original sender. Only service owner can perform it.
     *  @param depositor - The address of the deposit sender
     *  @param serviceID - Service to withdraw the deposit from
     */
    function refund(address depositor, bytes32 serviceID) public {
        uint256 funds = balances[depositor][msg.sender][serviceID];
        require(funds > 0, "There are no funds deposited by given address to this service");
        balances[depositor][msg.sender][serviceID] = 0;
        token.safeTransfer(depositor, funds);
        emit PaymentRefunded(funds, depositor, msg.sender, serviceID);
    }
}
