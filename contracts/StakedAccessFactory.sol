/* solhint-disable not-rely-on-time */

pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';
import 'zeppelin-solidity/contracts/token/ERC20/ERC20.sol';

import './StakedAccess.sol';


/**
 *  The StakedAccessFactory creates new StakedAccess contracts.
 */
contract StakedAccessFactory is Ownable {
    uint private constant TIMELOCK_UPPER_LIMIT = 5 years; // five years

    // the KEY token. It's an injected variable to allow for testing with a MockKEY.
    ERC20 private token;

    /**
     *  Don't allow Zero addresses.
     *  @param anAddress — the address which must not be zero.
     */
    modifier nonZeroAddress(address anAddress) {
        require(anAddress != 0x0);
        _;
    }

    /**
     *  @param expires — must be later than now.
     */
    modifier validExpiryDate(uint expires) {
        require(expires > now);
        _;
    }

    /**
     *  @param price — must be graeter than 0.
     */
    modifier validPrice(uint price) {
        require(price > 0);
        _;
    }

    /**
     *  Emitted when the StakedAccess is created.
     *  @param escrow — The created StakedAccess
     *  @param expires — The expiry timestamp
     *  @param price — The amount of KEY required to be staked
     *  @param token — The ERC20 token being used (injected to simplify testing)
     */
    event StakedAccessCreated(StakedAccess escrow, uint expires, uint price, ERC20 token);

    /**
     *  StakedAccessFactory constructor.
     *  @param _token — The ERC20 token to use as currency. (Injected to ease testing)
     */
    function StakedAccessFactory(ERC20 _token)
        public
        nonZeroAddress(_token)
    {
        token = _token;
    }

    /**
     *  Deploy a new StakedAccess contract with the given expiry date and price.
     *  @param _expires — The datestamp of the expiry date.
     *  @param _price — The amount of KEY required to be deposited.
     */
    function createStakedAccess(uint _expires, uint _price)
        external
        onlyOwner
        validExpiryDate(_expires)
        validPrice(_price)
    {
        StakedAccess escrow = new StakedAccess(_expires, _price, token);
        StakedAccessCreated(escrow, _expires, _price, token);
    }
}
