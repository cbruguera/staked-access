/* solhint-disable not-rely-on-time */

pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';
import './Whitelistable.sol';


/**
 *  An address with `KEY` staked in the `StakedAccess` has access to a given ICO.
 *  An address can only `retrieve` its `KEY` from the escrow after the allotted expiry time.
 *  Only whitelisted addresses can stake `KEY`.
 */
contract StakedAccess is Whitelistable {

    // the date after which funds can be retrieved back by their original senders.
    uint public expiry;

    // the amount of KEY that needs to be staked in order to access the associated service.
    uint public price;

    // the KEY token. It's an injected variable to allow for testing with a MockKEY.
    ERC20 private token;

    // mapping of addresses to the amounts they have staked.
    mapping(address => uint) private balances;

    /**
     *  Require that the contract has reached its expiry date.
     */
    modifier contractHasExpired() {
        require(now >= expiry);
        _;
    }

    /**
     *  Require that the contract has not yet reached its expiry date.
     */
    modifier contractHasNotExpired() {
        require(now < expiry);
        _;
    }

    /**
     *  Ensures the expiry datestamp is after the current time.
     *  @param _expiry — must be later than now.
     */
    modifier validExpiry(uint _expiry) {
        require(_expiry > now);
        _;
    }

    /**
     *  Ensures the price amount is greater than zero.
     *  @param _price — must be greater than 0.
     */
    modifier validPrice(uint _price) {
        require(_price > 0);
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
    modifier senderHasStaked() {
        require(balances[msg.sender] != 0);
        _;
    }

    /**
     *  Ensures the message sender has not yet staked `KEY`.
     */
    modifier senderHasNotStaked() {
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
     *  @param _expiry — The timestamp of the contract expiry date.
     *  @param _price — The amount of `KEY` that needs to be staked in order to access the associated service.
     *  @param _token — The `ERC20` token to use as currency. (Injected to ease testing).
     */
    function StakedAccess(uint _expiry, uint _price, address _token)
        public
        validExpiry(_expiry)
        validPrice(_price)
        nonZeroAddress(_token)
    {
        expiry = _expiry;
        price = _price;
        token = ERC20(_token);
    }

    /**
     *  Stake `price` amount of `KEY`.
     */
    function stake()
        external
        contractHasNotExpired()
        onlyWhitelisted()
        senderHasNotStaked()
        senderCanAfford()
        senderHasApprovedTransfer()
    {
        token.transferFrom(msg.sender, this, price);
        balances[msg.sender] = price;
        KEYStaked(msg.sender, price);
    }

    /**
     *  Once the contract has expired, the `KEY` owner may retrieve their `KEY`.
     */
    function retrieve()
        external
        contractHasExpired()
        senderHasStaked()
    {
        uint amount = balances[msg.sender];
        token.transfer(msg.sender, amount);
        balances[msg.sender] = 0;
        KEYRetrieved(msg.sender, amount);
    }

    /**
     *  Test to see if an arbitrary address has staked `KEY`.
     *  @param staker — The address claiming to have staked `KEY`.
     *  @return true if the staker has staked `KEY`.
     */
    function hasStaked(address staker)
        external
        view
        returns (bool)
    {
        if (staker == 0x0) {
            return false;
        }
        return balances[staker] != 0;
    }

    /**
     *  Test to see if the contract has expired.
     *  @return true if the expiry date has been reached.
     */
    function hasExpired()
        external
        view
        returns (bool)
    {
        return now >= expiry;
    }
}
