pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/lifecycle/Pausable.sol';

/**
 *  Pausable contract that allows setting a reference to a new contract for migration purposes.
 */
contract Upgradable is Pausable {
    address public newContract;

    event NewContract(address _newContract);

    /**
     * Pauses the contract while allowing a newContract address to be defined.
     * @param _newContract - Reference to a more recently deployed contract.
     */
    function pauseAndUpgrade(address _newContract)
        onlyOwner
        whenNotPaused
        public
    {
        newContract = _newContract;
        emit NewContract(_newContract);
        super.pause();
    }

    /**
     * Overrides pause method to disallow in case newContract is set.
     * Cannot unpause a deprecated contract
     */
    function unpause() onlyOwner whenPaused public {
        // cannot unpause if newContract is set
        require(newContract == address(0));
        super.unpause();
    }
}
