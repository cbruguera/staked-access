pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';

/**
 *  DEPRECATED
 */
contract StakingManager {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    // balances and lock-in periods for each stake
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public balances;
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public releaseDates;

    // staking parameters
    mapping(address => mapping(bytes32 => uint256)) public stakePeriods;
    mapping(address => mapping(bytes32 => uint256)) public stakeMinimum;

    // counters
    mapping(address => mapping(bytes32 => uint256)) public totalStakeByServiceID;
    mapping(address => uint256) public totalStakeByServiceOwner;
    mapping(address => uint256) public totalStakeBySender;

    ERC20 public token;

    event KEYStaked(uint256 amount, address from, address serviceOwner, bytes32 serviceID);
    event KEYStakeWithdrawn(uint256 amount, address from, address serviceOwner, bytes32 serviceID);
    event MinimumStakeSet(address serviceOwner, bytes32 serviceID, uint256 amount);
    event StakePeriodSet(address serviceOwner, bytes32 serviceID, uint256 period);

    constructor(address _token) public {
        require(_token != address(0), "Invalid token address");
        token = ERC20(_token);
    }

    /**
     *  Make a stake for a given amount to certain Service ID.
     *  @param amount - token amount to stake
     *  @param serviceID - Service ID upon which the stake will be made
     */
    function stake(uint256 amount, address serviceOwner, bytes32 serviceID) public {
        require(amount > 0, "Stake must be greater than zero");
        require(token.allowance(msg.sender, address(this)) >= amount,
            "Address has not allowed spending");
        require(token.balanceOf(msg.sender) >= amount, "Address has no funds to stake");
        require(amount.add(balances[msg.sender][serviceOwner][serviceID]) >= stakeMinimum[serviceOwner][serviceID],
            "Stake amount under minimum");

        balances[msg.sender][serviceOwner][serviceID] += amount;
        totalStakeBySender[msg.sender] += amount;
        totalStakeByServiceOwner[serviceOwner] += amount;
        totalStakeByServiceID[serviceOwner][serviceID] += amount;

        // If minimum stake period has been set for serviceID, sets a release date
        if (stakePeriods[serviceOwner][serviceID] > 0) {
            releaseDates[msg.sender][serviceOwner][serviceID] = now.add(
                stakePeriods[serviceOwner][serviceID]);
        }

        // token transferFrom requires prior approval on the token contract
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit KEYStaked(amount, msg.sender, serviceOwner, serviceID);
    }

    /**
     *  Withdraws a given amount from a stake made for a certain service ID.
     *  Only staker can withdraw.
     *  @param serviceOwner - The address that owns such service
     *  @param serviceID - Service to withdraw stake from
     */
    function withdraw(address serviceOwner, bytes32 serviceID) public returns(uint256) {
        require(balances[msg.sender][serviceOwner][serviceID] > 0, "There is no stake");
        require(releaseDates[msg.sender][serviceOwner][serviceID] <= now, "Stake is still locked");

        uint256 funds = balances[msg.sender][serviceOwner][serviceID];
        balances[msg.sender][serviceOwner][serviceID] = 0;
        totalStakeBySender[msg.sender] -= funds;
        totalStakeByServiceOwner[serviceOwner] -= funds;
        totalStakeByServiceID[serviceOwner][serviceID] -= funds;

        token.safeTransfer(msg.sender, funds);

        emit KEYStakeWithdrawn(funds, msg.sender, serviceOwner, serviceID);
        return funds;
    }

    /**
     *  Service owner can change the minimum staking period to a certain amount of SECONDS
     *  Stakes previously made are not affected.
     *  @param serviceID - Service identifier for setting the parameter
     *  @param period - New period (in seconds) for all future stakes on caller serviceID
     */
    function setStakePeriod(bytes32 serviceID, uint256 period) public {
        stakePeriods[msg.sender][serviceID] = period;
        emit StakePeriodSet(msg.sender, serviceID, period);
    }

    /**
     *  Service owner can change the minimum stake amount to a certain number of tokens
     *  Stakes previously made are not affected.
     *  @param serviceID - Service identifier for setting the parameter
     *  @param minimum - New lower cap for all future stakes on caller serviceID
     */
    function setMinimumStake(bytes32 serviceID, uint256 minimum) public {
        stakeMinimum[msg.sender][serviceID] = minimum;
        emit MinimumStakeSet(msg.sender, serviceID, minimum);
    }

    /**
     *  Returns whether there's a stake done by a staker for a certain serviceID under a
     *  @param staker - stake sender address
     *  @param serviceOwner - The address that owns such service
     *  @param serviceID - Service ID upon which the stake would be done
     */
    function hasStake(address staker, address serviceOwner, bytes32 serviceID) public view returns(bool) {
        uint256 balance = balances[staker][serviceOwner][serviceID];
        return balance > 0;
    }

    /**
     *  Returns whether there's a stake done by a staker for a certain serviceID above a set minimum
     *  @param staker - stake sender address
     *  @param serviceOwner - The address that owns such service
     *  @param serviceID - Service ID upon which the stake would be done
     */
    function hasStakeAboveMinimum(address staker, address serviceOwner, bytes32 serviceID) public view returns(bool) {
        uint256 balance = balances[staker][serviceOwner][serviceID];
        return balance > 0 && balance >= stakeMinimum[serviceOwner][serviceID];
    }
}
