pragma solidity ^0.4.23;

import './DepositVault.sol';

/**
 *  Contract for managing deferred payment for SelfKey Marketplace
 */
contract RefundableEscrow is DepositVault{
    event PaymentMade(uint256 amount, address sender, address serviceOwner, bytes32 serviceID);
    event PaymentReleased(uint256 amount, address sender, address serviceOwner, bytes32 serviceID);
    event PaymentRefunded(uint256 amount, address sender, address serviceOwner, bytes32 serviceID);

    constructor(address _token) DepositVault(_token) public { }

    /**
     *  Withdrawals are only available if contract is paused.
     */
    function withdraw(address serviceOwner, bytes32 serviceID)
        whenPaused
        public
        returns(uint256)
    {
        super.withdraw(serviceOwner, serviceID);
    }

    /**
     *  Overwrite parent method to include emission of PaymentMade event.
     *  Also, deposits to 0x0 as serviceOwner are not allowed, contrary to DepositVault.
     */
    function deposit(uint256 amount, address serviceOwner, bytes32 serviceID)
        whenNotPaused
        public
    {
        require(serviceOwner != address(0));
        emit PaymentMade(amount, msg.sender, serviceOwner, serviceID);
        super.deposit(amount, serviceOwner, serviceID);
    }

    /**
     *  Releases deposit to the service owner. Only the deposit sender can perform it.
     *  @param serviceOwner - The address of the service owner
     *  @param serviceID - Service to withdraw the deposit from
     */
    function release(address serviceOwner, bytes32 serviceID)
        public
    {
        uint256 funds = balances[msg.sender][serviceOwner][serviceID];
        require(funds > 0, "There are no funds deposited by sender to this service");
        balances[msg.sender][serviceOwner][serviceID] = 0;
        token.safeTransfer(serviceOwner, funds);
        emit PaymentReleased(funds, msg.sender, serviceOwner, serviceID);
    }

    /**
     *  Refund deposit to the original sender. Only service owner can perform it.
     *  @param depositor - The address of the deposit sender
     *  @param serviceID - Service to withdraw the deposit from
     */
    function refund(address depositor, bytes32 serviceID)
        public
    {
        uint256 funds = balances[depositor][msg.sender][serviceID];
        require(funds > 0, "There are no funds deposited by given address to this service");
        balances[depositor][msg.sender][serviceID] = 0;
        token.safeTransfer(depositor, funds);
        emit PaymentRefunded(funds, depositor, msg.sender, serviceID);
    }
}
