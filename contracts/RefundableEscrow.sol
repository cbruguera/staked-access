pragma solidity ^0.4.23;

import './DepositVault.sol';

/**
 *  Contract for managing payment deposits for SelfKey
 */
contract RefundableEscrow is DepositVault{

    event PaymentReleased(uint256 amount, address sender, address receiver, bytes32 serviceID);
    event PaymentMade(uint256 amount, address sender, address receiver, bytes32 serviceID);
    event PaymentRefunded(uint256 amount, address sender, address serviceOwner, bytes32 serviceID);

    /**
     *  Overwrite parent method to disable withdrawals.
     */
    function withdraw(address sender, bytes32 serviceID) public returns(uint256) {
        revert("Method not supported");
    }

    /**
     *  Overwrite parent method to include emission of PaymentMade event.
     */
    function deposit(uint256 amount, address serviceOwner, bytes32 serviceID) public {
        emit PaymentMade(amount, msg.sender, serviceOwner, serviceID);
        super.deposit(amount, serviceOwner, serviceID);
    }

    /**
     *  Releases deposit to the service owner. Only the deposit sender can perform it.
     *  @param serviceOwner - The address of the service owner
     *  @param serviceID - Service to withdraw the deposit from
     */
    function release(address serviceOwner, bytes32 serviceID) public {
        uint256 funds = balances[msg.sender][serviceOwner][serviceID];
        require(funds > 0);
        token.safeTransfer(serviceOwner, funds);
        emit PaymentReleased(funds, msg.sender, serviceOwner, serviceID);
    }

    /**
     *  Refund deposit to the original sender. Only service owner can perform it.
     *  @param depositSender - The address of the deposit sender
     *  @param serviceID - Service to withdraw the deposit from
     */
    function refund(address depositSender, bytes32 serviceID) public {
        uint256 funds = balances[depositSender][msg.sender][serviceID];
        require(funds > 0);
        token.safeTransfer(depositSender, funds);
        emit PaymentRefunded(funds, depositSender, msg.sender, serviceID);
    }
}
