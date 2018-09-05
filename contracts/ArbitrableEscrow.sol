pragma solidity ^0.4.23;

import './RefundableEscrow.sol';

/**
 *  Contract for managing payment deposits for SelfKey
 */
contract ArbitrableEscrow is RefundableEscrow{

    event ArbiterSet(address arbiter, address depositor, address serviceOwner, bytes32 serviceID);
    event TransactionSettled(
        address arbiter,
        address depositor,
        address serviceOwner,
        bytes32 serviceID,
        uint256 depositorFees,
        uint256 ownerFees,
        uint256 arbitrationFees);

    // An arbiter address can be assigned to arbiters[depositor][serviceOwner][serviceID]
    mapping(address => mapping(address => mapping(bytes32 => address))) public arbiters;

    /**
     *  Allows a service owner to set an arbiter for a given serviceID and depositor.
     *  It requires the balance to be equal zero, to not interfere with ongoing transactions.
     *  @param depositor - The address of the deposit sender
     *  @param serviceID - Service to which the deposit is made
     *  @param arbiter - Address of the trusted third party
     */
    function setArbiter(address depositor, bytes32 serviceID, address arbiter) public {
        require(balances[depositor][msg.sender][serviceID] == 0,
            "Cannot set an arbiter if a deposit is in place");

        arbiters[depositor][msg.sender][serviceID] = arbiter;
        emit ArbiterSet(arbiter, depositor, msg.sender, serviceID);
    }

    /**
     *  Allows a previously set arbiter to make a split of a given deposit
     *  @param depositor - The address of the deposit sender
     *  @param serviceOwner - Manager of the provided service
     *  @param serviceID - Service to which the deposit is made
     *  @param depositorFees - Number of tokens to allocate to depositor
     *  @param ownerFees - Number of tokens to allocate to Owner
     *  @param arbitrationFees - Number of tokens to allocate to transaction arbiter
     */
    function settleTransaction(
        address depositor,
        address serviceOwner,
        bytes32 serviceID,
        uint256 depositorFees,
        uint256 ownerFees,
        uint256 arbitrationFees) public
    {
        uint256 funds = balances[depositor][serviceOwner][serviceID];
        require(funds > 0,
            "There are no funds deposited by given address to this service");
        require(arbiters[depositor][serviceOwner][serviceID] == msg.sender,
            "Caller address is not set as an arbiter for this deposit");
        require(funds.add(depositorFees).add(ownerFees).add(arbitrationFees) == funds,
            "Sum of allocation fees should be equal to deposited funds");

        token.safeTransfer(depositor, depositorFees);
        token.safeTransfer(serviceOwner, ownerFees);
        token.safeTransfer(msg.sender, arbitrationFees);

        emit TransactionSettled(
            msg.sender,
            depositor,
            serviceOwner,
            serviceID,
            depositorFees,
            ownerFees,
            arbitrationFees);
    }
}
