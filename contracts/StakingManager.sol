pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';

/**
 *  An address with `KEY` staked in the `StakedAccess` has access to a given ICO.
 *  An address can only `retrieve` its `KEY` from the escrow after the allotted expiry time.
 */
contract StakingManager is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    mapping(address => mapping(bytes32 => uint256)) public balances;
    mapping(address => mapping(bytes32 => uint256)) public releaseDates;

    mapping(bytes32 => uint256) public stakePeriods;
    mapping(bytes32 => uint256) public stakeMinimum;

    mapping(bytes32 => uint256) public totalStakeByServiceID;
    mapping(address => uint256) public totalStakeBySender;

    ERC20 public token;

    event KEYStaked(address from, uint256 amount, bytes32 serviceID);
    event KEYStakeWithdrawn(address from, uint256 amount, bytes32 serviceID);

    constructor(address _token)
        public
    {
        require(_token != address(0), "Invalid token address");

        token = ERC20(_token);
    }

    /**
     *  Make a stake for a given amount to certain Service ID.
     *  @param amount - token amount to stake
     *  @param serviceID - Service ID upon which the stake will be made
     */
    function stake(uint256 amount, bytes32 serviceID) public {
        require(amount > 0, "Stake must be greater than zero");
        require(token.allowance(msg.sender, address(this)) >= amount,
            "Address has not allowed spending");
        require(token.balanceOf(msg.sender) >= amount, "Address has no funds to stake");
        require(amount.add(balances[msg.sender][serviceID]) >= stakeMinimum[serviceID],
            "Stake amount under minimum");

        balances[msg.sender][serviceID] += amount;
        totalStakeBySender[msg.sender] += amount;
        totalStakeByServiceID[serviceID] += amount;

        // If minimum stake period has been set for serviceID, sets a release date
        if (stakePeriods[serviceID] > 0) {
            releaseDates[msg.sender][serviceID] = now.add(stakePeriods[serviceID]);
        }

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit KEYStaked(msg.sender, amount, serviceID);
    }

    /**
     *  Withdraws a given amount from a stake made for a certain service ID.
     *  Only staker can withdraw.
     *  @param amount - token quantity to be withdrawn
     *  @param serviceID - Service to withdraw stake from
     */
    function withdraw(uint256 amount, bytes32 serviceID) public {
        require(releaseDates[msg.sender][serviceID] <= now, "Stake is still locked");
        require(balances[msg.sender][serviceID] >= amount, "Not enough funds to withdraw");
        require(amount > 0, "Withdrawal amount must be above zero");

        balances[msg.sender][serviceID] -= amount;
        totalStakeBySender[msg.sender] -= amount;
        totalStakeByServiceID[serviceID] -= amount;

        token.safeTransfer(msg.sender, amount);

        emit KEYStakeWithdrawn(msg.sender, amount, serviceID);
    }

    /**
     *  Returns the serviceID 32 byte string corresponding to the caller service ID
     *  Currently there's only one service ID per caller,
     *  and it's the keccak256 hash of the caller address.
     */
    function getCallerServiceID() public view returns(bytes32 id) {
        return keccak256(msg.sender);
    }

    /**
     *  Service owner can change the minimum staking period to a certain amount of DAYS
     *  Stakes previously made are not affected.
     *  @param period - New period for all future stakes on caller serviceID
     */
    function setServiceStakePeriod(uint256 period) public {
        stakePeriods[getCallerServiceID()] = period.mul(1 days);
    }

    /**
     *  Service owner can change the minimum stake amount to a certain number of tokens
     *  Stakes previously made are not affected.
     *  @param minimum - New lower cap for all future stakes on caller serviceID
     */
    function setServiceMinimumStake(uint256 minimum) public {
        stakeMinimum[getCallerServiceID()] = minimum;
    }

    /**
     *  Returns whether there's a stake done by a staker for a certain serviceID
     *  @param staker - stake sender address
     *  @param serviceID - Service ID upon which the stake would be done
     */
    function hasStake(address staker, bytes32 serviceID) public view returns(bool) {
        uint256 balance = balances[staker][serviceID];

        return balance > 0; // && balance >= stakeMinimum[serviceID];
    }

    /**
     *  Returns whether there's a stake done by a staker for a certain serviceID above a set minimum
     *  @param staker - stake sender address
     *  @param serviceID - Service ID upon which the stake would be done
     */
    function hasStakeAboveMinimum(address staker, bytes32 serviceID) public view returns(bool) {
        uint256 balance = balances[staker][serviceID];

        return balance > 0 && balance >= stakeMinimum[serviceID];
    }
}
