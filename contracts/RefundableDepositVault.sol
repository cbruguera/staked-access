pragma solidity ^0.4.23;

import './LockedDepositVault.sol';

/**
 *  Refundable version of locked deposit vault. Service owner can trigger a force-refund anytime.
 */
contract RefundableDepositVault is LockedDepositVault {
    mapping(address => mapping(bytes32 => mapping(uint256 => address))) public depositors;
    mapping(address => mapping(bytes32 => uint256)) public depositorCount;
    mapping(address => mapping(bytes32 => mapping(address => uint256))) public indexes;

    event PaymentRefunded(
        uint256 amount,
        address depositor,
        address serviceOwner,
        bytes32 serviceID
    );

    constructor(address _token) LockedDepositVault(_token) public { }

    /**
     *  Internal method for adding a depositor address to a depositor list.
     *  @param serviceOwner - serviceOwner that owns the serviceID
     *  @param serviceID - specific serviceID that keeps the depositor list
     *  @param depositor - depositor address to be included in the list
     */
    function addDepositor(address serviceOwner, bytes32 serviceID, address depositor) internal {
        uint256 index = depositorCount[serviceOwner][serviceID];
        depositors[serviceOwner][serviceID][index] = depositor;
        depositorCount[serviceOwner][serviceID] += 1;
        indexes[serviceOwner][serviceID][depositor] = index;
    }

    /**
     *  Internal method for removing a depositor address from the depositor list.
     *  @param serviceOwner - serviceOwner that owns the serviceID
     *  @param serviceID - specific serviceID that keeps the depositor list
     *  @param depositor - depositor address to be removed from the list
     */
    function removeDepositor(address serviceOwner, bytes32 serviceID, address depositor) internal {
        uint256 index = indexes[serviceOwner][serviceID][depositor];
        uint256 size = depositorCount[serviceOwner][serviceID];
        address last = depositors[serviceOwner][serviceID][size - 1];
        depositors[serviceOwner][serviceID][index] = last;
        indexes[serviceOwner][serviceID][last] = 0;
        depositorCount[serviceOwner][serviceID] -= 1;
    }

    /**
     *  Overwrites parent `deposit` method to add address to a depositor list.
     *  Depositor list is necessary for the `refundAll` method.
     */
    function deposit(uint256 amount, address serviceOwner, bytes32 serviceID)
        whenNotPaused
        public
    {
        if(balances[msg.sender][serviceOwner][serviceID] == 0) {
            addDepositor(serviceOwner, serviceID, msg.sender);
        }
        super.deposit(amount, serviceOwner, serviceID);
    }

    /**
     *  Overwrites parent `withdraw` method to delete address from depositor list.
     *  Depositor list is necessary for the `refundAll` method.
     */
    function withdraw(address serviceOwner, bytes32 serviceID)
        public
        returns(uint256)
    {
        removeDepositor(serviceOwner, serviceID, msg.sender);
        return super.withdraw(serviceOwner, serviceID);
    }

    /**
     *  Refund deposit to the original sender. Only service owner can perform it.
     *  @param depositor - The address of the deposit sender
     *  @param serviceID - Service to withdraw the deposit from
     */
    function refund(address depositor, bytes32 serviceID)
        public
        returns(uint256)
    {
        uint256 funds = balances[depositor][msg.sender][serviceID];
        require(funds > 0, "There are no funds deposited by given address to this service");
        balances[depositor][msg.sender][serviceID] = 0;
        removeDepositor(msg.sender, serviceID, depositor);
        token.safeTransfer(depositor, funds);
        emit PaymentRefunded(funds, depositor, msg.sender, serviceID);
        return funds;
    }

    /**
     *  Refund to the all depositors with stake on services under caller address as serviceOwner.
     *  Loop always refunds to first address in the array because refunded address is deleted
     *  from the array and replaced by the last on each step.
     *  @param serviceID - serviceID to refund all depositors from
     */
    function refundAll(bytes32 serviceID)
        public
        returns(uint256)
    {
        uint256 size = depositorCount[msg.sender][serviceID];
        for (uint256 i = 0; i < size; i++) {
            address depositor = depositors[msg.sender][serviceID][0];
            refund(depositor, serviceID);
        }
        return size;
    }
}
