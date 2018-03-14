# staked-access

Contracts that provide access to a marketplace based on the staking of KEY by participants

[![Greenkeeper badge](https://badges.greenkeeper.io/SelfKeyFoundation/staked-access.svg)](https://greenkeeper.io/)

* `develop` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/develop/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)
* `master` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/master/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)

## Overview

The `StakedAccess` contract provides the following functionality.

1. Addresses are able to "stake" _KEY_ into a smart contract, reserving an amount of tokens to
indicate their willingness to participate in a particular Selfkey Marketplace. The tokens staked in
this manner are kept "locked" for a set amount of time defined by the `period` attribute in the `StakedAccess` contract.

2. Staked tokens can only be retrieved by the owner once the staking period has passed.

3. For the staking functionality to work, owner (or ID-Wallet in our specific case) has to invoke `approve(stakingContractAddress, stakingPrice)` against on the **token contract**, passing the
staking contract address and the corresponding staking price (including all decimal places). This is
to allow the staking contract to spend funds (up to the limit set) on behalf of its owner.

### StakedAccess Contract Interface

All staking functionality is implemented by the `StakedAccess` contract, which includes the
following attributes:

#### Public State Variables

`releaseDates`: A mapping from addresses to a datetime in Unix format, stating the moment at which
the staking can be released.

`price`: The token amount to be staked. This number should include all 18 decimals (e.g. for a
  staking price of 30 _KEY_, `price`  should be set to 30000000000000000000).

`period`: The minimum amount of _seconds_ that each stake should be locked for before allowing
token retrieval.

#### Public Functions

`stake()`: On invoking the `stake()` function, an mount of tokens defined by `price` will be
deducted from the sender address balance, and be kept locked in the staking contract until the
due staking period has been fulfilled. For the contract to be able to deduct tokens on behalf of
the user, the user **must previously call the approve method of the token contract.**

`retrieve()`: If the corresponding release date for the sender has already been reached, the sender
can invoke the `retrieve()` function, in which case the staked amount is sent back to the owner
wallet.

`hasStake(address)`: returns true if the given address has a stake above zero on the contract, otherwise it returns false.

`setPrice(uint)` (**only owner**): Staking price can be changed anytime by the contract
owner.

`setPeriod(uint)` (**only owner**): Staking period can be changed anytime by the contract
owner. This won't affect the release date of stakes already in place.

#### Events

`KEYStaked(address by, uint amount)`: Emitted when an address has successfully staked an amount of
_KEY_.

`KEYRetrieved(address to, uint amount)`: Emitted when a _KEY_ owner has released the tokens
previously staked.

## Development

The smart contracts are being implemented in Solidity `0.4.19`.

### Prerequisites

* [NodeJS](htps://nodejs.org), version 9.5+ (I use [`nvm`](https://github.com/creationix/nvm) to manage Node versions — `brew install nvm`.)
* [truffle](http://truffleframework.com/), which is a comprehensive framework for Ethereum development. `npm install -g truffle` — this should install Truffle v4+.  Check that with `truffle version`.
* [Access to the KYC_Chain Jira](https://kyc-chain.atlassian.net)

### Initialization

    npm install

### Testing

#### Standalone

    npm test

or with code coverage

    npm run test:cov

#### From within Truffle

Run the `truffle` development environment

    truffle develop

then from the prompt you can run

    compile
    migrate
    test

as well as other Truffle commands. See [truffleframework.com](http://truffleframework.com) for more.

### Linting

We provide the following linting options

* `npm run lint:sol` — to lint the Solidity files, and
* `npm run lint:js` — to lint the Javascript.

## Deployment

Deploy the contracts as follows

**(TO DO)**

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
