pragma solidity ^0.4.23;

import './SelfKeyToken.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';

/**
 *  Contract for managing general deposits and staking functionality for SelfKey
 */
contract DepositVault {
    using SafeMath for uint256;
    using SafeERC20 for SelfKeyToken;

    SelfKeyToken public token;

    mapping(address => mapping(address => mapping(bytes32 => uint256))) public balances;
    //mapping(address => mapping(bytes32 => uint256)) public totalStakeByService;

    event Deposited(uint256 amount, address from, address serviceOwner, bytes32 serviceID);
    event Withdrawn(uint256 amount, address from, address serviceOwner, bytes32 serviceID);

    constructor(address _token) public {
        require(_token != address(0), "Invalid token address");
        token = SelfKeyToken(_token);
    }

    /**
     *  Make a deposit for a given amount to certain Service ID.
     *  @param amount - token amount to stake
     *  @param serviceOwner - Service owner, sets the deposit parameters for serviceID
     *  @param serviceID - Service upon which the deposit will be made
     */
    function deposit(uint256 amount, address serviceOwner, bytes32 serviceID) public {
        require(amount > 0,
            "Deposit amount must be greater than zero");
        require(token.allowance(msg.sender, address(this)) >= amount,
            "Sender address has not allowed this contract for spending");
        require(token.balanceOf(msg.sender) >= amount,
            "Sender address has insufficient KEY funds");

        balances[msg.sender][serviceOwner][serviceID] += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(amount, msg.sender, serviceOwner, serviceID);
    }

    /**
     *  Withdraws all tokens of a deposit made. Only sender can withdraw.
     *  @param serviceOwner - The address that owns such service
     *  @param serviceID - Service to withdraw the deposit from
     */
    function withdraw(address serviceOwner, bytes32 serviceID) public returns(uint256) {
        require(balances[msg.sender][serviceOwner][serviceID] > 0,
            "There are no tokens deposited by transaction sender for this service");

        uint256 funds = balances[msg.sender][serviceOwner][serviceID];
        balances[msg.sender][serviceOwner][serviceID] = 0;
        token.safeTransfer(msg.sender, funds);
        emit Withdrawn(funds, msg.sender, serviceOwner, serviceID);
        return funds;
    }
}
