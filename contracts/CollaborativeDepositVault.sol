pragma solidity ^0.4.23;

import './LockedDepositVault.sol';

/**
 *  Contract for managing general deposits and staking functionality for SelfKey
 */
contract CollaborativeDepositVault  is LockedDepositVault{

    mapping(address => mapping(address => mapping(address => mapping(bytes32 => uint256)))) public
        collaborationBalances;
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public
        totalCollaborationForBeneficiary;

    event DepositedFor(
        address from,
        uint256 amount,
        address beneficiary,
        address serviceOwner,
        bytes32 serviceID);

    event WithdrawnFor(
      address sender,
      uint256 amount,
      address beneficiary,
      address serviceOwner,
      bytes32 serviceID);

    /**
     *  depositFor allows third parties to deposit on behalf of a service beneficiary
     *  @param amount - amount of tokens to deposit
     *  @param beneficiary - the address that is participating of the service
     *  @param serviceOwner - Service owner, sets the deposit parameters for serviceID
     *  @param serviceID - Service upon which the deposit will be made
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

        collaborationBalances[msg.sender][beneficiary][serviceOwner][serviceID] += amount;
        balances[beneficiary][serviceOwner][serviceID] += amount;
        totalCollaborationForBeneficiary[beneficiary][serviceOwner][serviceID] += amount;

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit DepositedFor(msg.sender, amount, beneficiary, serviceOwner, serviceID);
    }

    /**
     *  Withdraws all tokens deposited by a third party collaborator on behalf of a beneficiary
     *  @param beneficiary - The address of the service participant
     *  @param serviceOwner - The address that owns such service
     *  @param serviceID - Service to withdraw the deposit from
     */
    function withdrawFor(address beneficiary, address serviceOwner, bytes32 serviceID)
        public
        returns(uint256)
    {
        uint256 funds = collaborationBalances[msg.sender][beneficiary][serviceOwner][serviceID];
        require(funds > 0, "There are no tokens deposited by transaction sender for this service");

        collaborationBalances[msg.sender][beneficiary][serviceOwner][serviceID] = 0;
        balances[beneficiary][serviceOwner][serviceID] -= funds;
        totalCollaborationForBeneficiary[beneficiary][serviceOwner][serviceID] -= funds;

        token.safeTransfer(msg.sender, funds);
        emit WithdrawnFor(msg.sender, funds, beneficiary, serviceOwner, serviceID);
        return funds;
    }

    /**
     *  Withdraws all tokens of a deposit made minus all collaborations made by others.
     *  @param serviceOwner - The address that owns such service
     *  @param serviceID - Service to withdraw the deposit from
     */
    function withdraw(address serviceOwner, bytes32 serviceID) public returns(uint256) {
        uint256 funds = balances[msg.sender][serviceOwner][serviceID].sub(
            totalCollaborationForBeneficiary[msg.sender][serviceOwner][serviceID]);

        require(funds > 0, "There are no tokens deposited by transaction sender for this service");
        require(releaseDates[msg.sender][serviceOwner][serviceID] <= now,
            "Deposit is still locked for this service");

        balances[msg.sender][serviceOwner][serviceID] -= funds;
        token.safeTransfer(msg.sender, funds);
        emit Withdrawn(funds, msg.sender, serviceOwner, serviceID);
        return funds;
    }
}
