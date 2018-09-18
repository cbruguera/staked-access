pragma solidity ^0.4.23;

import './DepositVault.sol';

/**
 *  Deposit vault with time-lock functionality. Lock-in period can be set by service owners.
 */
contract LockedDepositVault is DepositVault{
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public releaseDates;
    mapping(address => mapping(bytes32 => uint256)) public lockPeriods;

    event LockPeriodSet(address serviceOwner, bytes32 serviceID, uint256 period);

    constructor(address _token) DepositVault(_token) public { }

    /**
     *  Service owner can change the lock period to a certain amount of SECONDS
     *  Deposits previously made are not affected.
     *  @param serviceID - Service identifier for setting the parameter
     *  @param period - New period (in seconds) for all future deposits on serviceID
     */
    function setLockPeriod(bytes32 serviceID, uint256 period)
        whenNotPaused
        public
    {
        lockPeriods[msg.sender][serviceID] = period;
        emit LockPeriodSet(msg.sender, serviceID, period);
    }

    /**
     *  Overwrite parent deposit method to include release date counter
     */
    function deposit(uint256 amount, address serviceOwner, bytes32 serviceID)
        whenNotPaused
        public
    {
        // If minimum stake period has been set for serviceID, sets a release date
        if (lockPeriods[serviceOwner][serviceID] > 0) {
            releaseDates[msg.sender][serviceOwner][serviceID] = now.add(
                lockPeriods[serviceOwner][serviceID]);
        }
        super.deposit(amount, serviceOwner, serviceID);
    }

    /**
     * Overwrite parent withdraw method to include release date check.
     * Timelock check is overriden if the contract is paused.
     */
    function withdraw(address serviceOwner, bytes32 serviceID)
        public
        returns(uint256)
    {
        require(paused || releaseDates[msg.sender][serviceOwner][serviceID] <= now,
            "Deposit is still locked for this service");
        return super.withdraw(serviceOwner, serviceID);
    }
}
