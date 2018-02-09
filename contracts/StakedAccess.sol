/* solhint-disable not-rely-on-time */

pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';

import './StakedAccessFactory.sol';


/**
 *  An address with `KEY` deposited in the `StakedAccess` has access to a given ICO.
 *
 *  An address can only `retrieve` its `KEY` from the escrow after the allotted expiry time.
 */
contract StakedAccess is Ownable {

    // the number of days during which a deposit can only be spent on a whitelisted address.
    uint public expiry;

    // the amount of KEY that needs to be staked in order to access the associated service
    // users shouldn't arbitrarily deposit less or more than it
    uint public price;

    // the KEY token. It's an injected variable to allow for testing with a MockKEY.
    ERC20 private token;

    // mapping of addresses to the amounts they have on deposit.
    mapping(address => uint) private balances;

    /**
     *  Don't allow Zero addresses.
     *  @param serviceProvider — the address which must not be zero.
     */
    modifier nonZeroAddress(address serviceProvider) {
        require(serviceProvider != 0x0);
        _;
    }

    /**
     *  Require numbers that are not zero.
     *  Note: Negative value sent from a wallet become massive positive numbers so it
     *        is not actually possible to check against negative inputs.
     *        This modifier must be used in combination with other checks against the user's balance.
     *  @param number — the number which must not be zero.
     */
    modifier nonZeroNumber(uint number) {
        require(number > 0);
        _;
    }

    /**
     *  Ensures the message sender has the appropriate balance of KEY
     *  @param amount — the amount of KEY the message sender must have.
     */
    modifier senderCanAfford(uint amount) {
        require(token.balanceOf(msg.sender) >= amount);
        _;
    }

    /**
     *  Ensures the message sender has deposited KEY.
     */
    modifier senderHasStaked() {
        require(balances[msg.sender] == price);
        _;
    }

    /**
     *  Ensures the message sender has not deposited KEY.
     */
    modifier senderHasNotStaked() {
        require(balances[msg.sender] == 0);
        _;
    }

    /**
     *  Ensures the message sender has the approved the transfer of enough KEY by the escrow.
     *  @param amount — the amount of KEY the message sender must have approved the escrow to transfer.
     */
    modifier senderHasApprovedTransfer(uint amount) {
        require(token.allowance(msg.sender, this) >= amount);
        _;
    }

    /**
     *  Emitted when a an amount of KEY has been deposited.
     *  @param by — The address that deposited the KEY.
     *  @param amount — The amount of KEY deposited.
     */
    event KEYStaked(address by, uint amount);

    /**
     *  Emitted when a an amount of KEY has been retrieved by its owner.
     *  @param to — The address receiving the KEY.
     *  @param amount — The amount of KEY being sent.
     */
    event KEYRetrieved(address to, uint amount);

    /**
     *  StakedAccess constructor. Can only be invoked by a `StakedAccessFactory`.
     *  @param _expiry — The timestamp of the contract expiry date.
     *  @param _token — The ERC20 token to use as currency. (Injected to ease testing)
     *  @param _price — The amount of KEY that need to be staked in order to access the associated service
     */
    function StakedAccess(uint _expiry, uint _price, ERC20 _token) public {
        expiry = _expiry;
        token = _token;
        price = _price;
        StakedAccessFactory factory = StakedAccessFactory(msg.sender);
        owner = factory.owner();
    }

    /**
     *  Stake `price` amount of KEY.
     */
    function stake()
        external
        senderHasNotStaked()
        senderCanAfford(price)
        senderHasApprovedTransfer(price)
    {
        token.transferFrom(msg.sender, this, price);
        balances[msg.sender] = price;
        KEYStaked(msg.sender, price);
    }

    /**
     *  Once a timelock has expired the KEY owner may retrieve their KEY from the Escrow.
     */
    function retrieve()
        external
        senderHasStaked()
    {
        uint amount = balances[msg.sender];
        token.transfer(msg.sender, amount);
        balances[msg.sender] = 0;
        KEYRetrieved(msg.sender, amount);
    }

    /**
     *  Test to see if an arbitrary address has KEY on deposit.
     *  @param depositor — The address claiming to have KEY deposited.
     *  @return true if the depositor has KEY deposited.
     */
    function hasFunds(address depositor)
        external
        view
        returns (bool)
    {
        if (depositor == 0x0) {
            return false;
        }
        return balances[depositor] == price;
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
        return now > expiry;
    }
}
