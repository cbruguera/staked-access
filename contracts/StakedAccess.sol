/* solhint-disable not-rely-on-time */

pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';

/**
 *  An address with `KEY` staked in the `StakedAccess` has access to a given ICO.
 *  An address can only `retrieve` its `KEY` from the escrow after the allotted expiry time.
 */
contract StakedAccess is Ownable {
    using SafeERC20 for ERC20;
    using SafeMath for uint256;

    // the dates after which funds can be retrieved back by their original senders
    mapping(address => uint256) public releaseDates;

    // the MINIMUM time a staking should be done before allowing release by sender
    uint256 public period;

    // the ERC20 token this contract will receive as stake
    ERC20 public token;

    // mapping of addresses to the amounts they have staked
    mapping(address => uint) public balances;

    // events
    event KEYStaked(address by, uint amount);
    event KEYRetrieved(address to, uint amount);

    /**
     *  Require that the release date has been reached for the given sender.
     */
    modifier senderCanRetrieve() {
        require(now >= releaseDates[msg.sender], "Cannot retrieve before release date");
        _;
    }

    /**
     *  Ensures the message sender has staked `KEY`.
     */
    modifier senderHasStake() {
        require(balances[msg.sender] > 0, "Address has no stake balance");
        _;
    }

    /**
     *  StakedAccess constructor.
     *  @param _token — The `ERC20` token to use as currency. (Injected to ease testing).
     *  @param _period — The minimum time period each sender has to stake their tokens
     */
    constructor(address _token, uint256 _period)
        public
    {
        require(_token != address(0), "Invalid token address");
        require(_period > 0, "Staking period must be above zero");

        token = ERC20(_token);
        period = _period;
    }


    /**
     *  Owner can change the minimum staking period. Time should be in UNIX format.
     *  Stakes previously made are not affected.
     *  @param _period - New period to set for all future stakes
     */
    function setPeriod(uint256 _period) onlyOwner public {
        require(_period > 0);

        period = _period;
    }

    /**
     *  Stake a certain amount of tokens.
     */
    function stake(uint256 amount)
        external
    {
        require(token.balanceOf(msg.sender) >= amount, "Address has no funds to stake");
        require(token.allowance(msg.sender, this) >= amount, "Address has not allowed spending");

        balances[msg.sender] += amount;
        releaseDates[msg.sender] = now.add(period);
        token.safeTransferFrom(msg.sender, this, amount);

        emit KEYStaked(msg.sender, amount);
    }

    /**
     *  Once the contract has expired, the stake owner may retrieve any amount of tokens.
     */
    function retrieve(uint256 amount)
        public
        senderHasStake()
        senderCanRetrieve()
    {
        balances[msg.sender] -= amount;
        token.safeTransfer(msg.sender, amount);

        emit KEYRetrieved(msg.sender, amount);
    }

    /**
     *  Once the contract has expired, the stake owner may retrieve their total balance of tokens.
     */
    function retrieveAll()
        public
        senderHasStake()
        senderCanRetrieve()
    {
        uint256 amount = balances[msg.sender];
        retrieve(amount);
    }

    /**
     *  Test to see if an address has staked tokens.
     *  @param staker — The address to be checked for stake amount.
     *  @return true if the staker has staked tokens.
     */
    function hasStake(address staker)
        external
        view
        returns (bool)
    {
        return balances[staker] > 0;
    }

    /**
     *  Get the date in which funds corresponding to an address can be retrieved.
     *  @param staker — The address to be checked for release date.
     *  @return the Unix timestamp of the release date.
     */
    function getReleaseDate(address staker)
        external
        view
        returns (uint256)
    {
        return releaseDates[staker];
    }
}
