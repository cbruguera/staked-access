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

    function stake(uint256 amount, bytes32 serviceID) public {
        require(token.allowance(msg.sender, address(this)) >= amount,
            "Address has not allowed spending");
        require(token.balanceOf(msg.sender) >= amount, "Address has no funds to stake");
        require(amount > 0, "Stake must be greater than zero");
        require(amount.add(balances[msg.sender][serviceID]) >= stakeMinimum[serviceID],
            "Stake amount under minimum");

        balances[msg.sender][serviceID] += amount;
        totalStakeBySender[msg.sender] += amount;
        totalStakeByServiceID[serviceID] += amount;

        if (stakePeriods[serviceID] > 0) {
            releaseDates[msg.sender][serviceID] = now.add(stakePeriods[serviceID]);
        }

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit KEYStaked(msg.sender, amount, serviceID);
    }

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

    function getCallerServiceID() public view returns(bytes32 id) {
        return keccak256(msg.sender);
    }

    function setServiceStakePeriod(uint256 period) public {
        stakePeriods[getCallerServiceID()] = period.mul(1 days);
    }

    function setServiceMinimumStake(uint256 minimum) public {
        stakeMinimum[getCallerServiceID()] = minimum;
    }
}
