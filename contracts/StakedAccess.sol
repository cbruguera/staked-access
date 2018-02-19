/* solhint-disable not-rely-on-time */

pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol';


/**
 *  An address with `KEY` staked in the `StakedAccess` has access to a given ICO.
 *  An address can only `retrieve` its `KEY` from the escrow after the allotted expiry time.
 */
contract StakedAccess is Ownable {
    using SafeERC20 for ERC20;

    // the dates after which funds can be retrieved back by their original senders
    mapping(address => uint256) public releaseDates;

    // the amount of KEY that needs to be staked in order to access the associated service
    uint256 public price;

    // the MINIMUM time a staking should be done before allowing release by sender
    uint256 public period;

    // the ERC20 token this contract will receive as stake
    ERC20 private token;

    // mapping of addresses to the amounts they have staked
    mapping(address => uint) private balances;

    /**
     *  Require that the release date has been reached for the given sender.
     */
    modifier senderCanRetrieve() {
        require(now >= releaseDates[msg.sender]);
        _;
    }

    /**
     *  Ensures the message sender has the appropriate balance of `KEY`.
     */
    modifier senderCanAfford() {
        require(token.balanceOf(msg.sender) >= price);
        _;
    }

    /**
     *  Ensures the message sender has staked `KEY`.
     */
    modifier senderHasStake() {
        require(balances[msg.sender] > 0);
        _;
    }

    /**
     *  Ensures the message sender has not yet staked `KEY`.
     */
    modifier senderHasNoStake() {
        require(balances[msg.sender] == 0);
        _;
    }

    /**
     *  Ensures the message sender has the approved the transfer of enough `KEY`.
     */
    modifier senderHasApprovedTransfer() {
        require(token.allowance(msg.sender, this) >= price);
        _;
    }

    /**
     *  Emitted when an amount of `KEY` has been staked.
     *  @param by — The address that staked the `KEY`.
     *  @param amount — The amount of `KEY` staked.
     */
    event KEYStaked(address by, uint amount);

    /**
     *  Emitted when an amount of `KEY` has been retrieved by its owner.
     *  @param to — The address retrieving the `KEY`.
     *  @param amount — The amount of `KEY` retrieved.
     */
    event KEYRetrieved(address to, uint amount);

    /**
     *  StakedAccess constructor.
     *  @param _price — The amount of `KEY` that needs to be staked in order to access the associated service.
     *  @param _token — The `ERC20` token to use as currency. (Injected to ease testing).
     *  @param _period — The minimum time period each sender has to stake their tokens
     */
    function StakedAccess(uint256 _price, address _token, uint256 _period)
        public
    {
        require(_price > 0);
        require(_token != address(0));
        require(_period > 0);

        price = _price;
        token = ERC20(_token);
        period = _period;
    }

    /**
     *  Owner can change the price anytime. Note: price should include all decimal places.
     *  Stakes previously made are not affected.
     *  @param _price - New price to set for all future stakes
     */
    function setPrice(uint256 _price) onlyOwner public {
        require(_price > 0);

        price = _price;
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
     *  Stake `price` amount of `KEY`.
     */
    function stake()
        external
        senderHasNoStake()
        senderCanAfford()
        senderHasApprovedTransfer()
    {
        balances[msg.sender] = price;
        releaseDates[msg.sender] = now + period;
        token.safeTransferFrom(msg.sender, this, price);

        KEYStaked(msg.sender, price);
    }

    /**
     *  Once the contract has expired, the `KEY` owner may retrieve their `KEY`.
     */
    function retrieve()
        external
        senderHasStake()
        senderCanRetrieve()
    {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);

        KEYRetrieved(msg.sender, amount);
    }

    /**
     *  Test to see if an arbitrary address has staked `KEY`.
     *  @param staker — The address claiming to have staked `KEY`.
     *  @return true if the staker has staked `KEY`.
     */
    function hasStake(address staker)
        external
        view
        returns (bool)
    {
        return balances[staker] > 0;
    }
}
