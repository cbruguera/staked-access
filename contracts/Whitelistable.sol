pragma solidity ^0.4.19;

import 'zeppelin-solidity/contracts/ownership/Ownable.sol';


/**
 *  Contracts that are Whitelistable have an associated whitelist, and set of
 *  allowed whitelisters who can maintain that whitelist.
 */
contract Whitelistable is Ownable {

    // mapping of addresses allowed to maintain the whitelist
    mapping(address => bool) private whitelisters;

    // mapping of addresses allowed to stake key
    mapping(address => bool) private whitelist;

    /**
     *  Require that the sender is a whitelister
     */
    modifier onlyWhitelister() {
        require(whitelisters[msg.sender]);
        _;
    }

    /**
     *  Require that the sender has been whitelisted
     */
    modifier onlyWhitelisted() {
        require(whitelist[msg.sender]);
        _;
    }

    /**
     *  Don't allow Zero addresses.
     *  @param addr — the address which must not be zero.
     */
    modifier nonZeroAddress(address addr) {
        require(addr != address(0));
        _;
    }

    /**

    /**
     *  Emitted when an address has been added as a whitelister
     *  @param addr — The address added as a whitelister
     */
    event WhitelisterAdded(address addr);

    /**
     *  Emitted when an address has been removed as a whitelister
     *  @param addr — The address removed as a whitelister
     */
    event WhitelisterRemoved(address addr);

    /**
     *  Emitted when an address has been added to the whitelist
     *  @param  addr — The address added to the whitelist
     */
    event Whitelisted(address addr);

    /**
     *  Emitted when an address has been removed from the whitelist
     *  @param  addr — The address removed from the whitelist
     */
    event WhitelistedAddressRemoved(address addr);

    /**
     *  Add an address to whitelisters.
     *  If the address was already a whitelister then this function does nothing.
     *  @param addr — The address to be allowed as a whitelister
     */
    function addWhitelister(address addr)
        external
        nonZeroAddress(addr)
        onlyOwner()
    {
        if (!whitelisters[addr]) {
            whitelisters[addr] = true;
            WhitelisterAdded(addr);
        }
    }

    /**
     *  Remove an address from whitelisters.
     *  If the supplied address was not already a whitelister then this does nothing.
     *  @param addr — The address to be disallowed as a whitelister
     */
    function removeWhitelister(address addr)
        external
        onlyOwner()
    {
        if (whitelisters[addr]) {
            whitelisters[addr] = false;
            WhitelisterRemoved(addr);
        }
    }

    /**
     *  Add an address to the whitelist
     *  If the address was already whitelisted then this function does nothing.
     *  @param addr — The address to be allowed as a whitelister
     */
    function addToWhitelist(address addr)
        external
        nonZeroAddress(addr)
        onlyWhitelister()
    {
        if (!whitelist[addr]) {
            whitelist[addr] = true;
            Whitelisted(addr);
        }
    }

    /**
     *  Remove an address from whitelisters.
     *  If the supplied address was not already whitelisted then this does nothing.
     *  @param addr — The address to be disallowed as a whitelister
     */
    function removeFromWhitelist(address addr)
        external
        onlyWhitelister()
    {
        if (whitelist[addr]) {
            whitelist[addr] = false;
            WhitelistedAddressRemoved(addr);
        }
    }

    /**
     *  Tests if the given address has been whitelisted.
     *  @param addr — The address to test
     *  @return true if the address supplied is whitelisted.
     */
    function isWhitelisted(address addr)
        external
        view
        returns (bool)
    {
        return whitelist[addr];
    }
}
