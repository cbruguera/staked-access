# selfkey-staking

Contracts that provide access to a marketplace based on the staking of KEY by participants

* `develop` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/develop/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)
* `master` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/master/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)

## Overview

The `StakingManager` contract provides the following functionality.

1. Addresses are able to "stake" _KEY_ linked to a given _Service Owner_ address and a _serviceID_ 32-byte string. This allows to reserve different amount of tokens simultaneously in relation to different services .

2. Staked tokens can only be retrieved by the original sender.

3. Any Ethereum address is able to associate itself with multiple "serviceIDs" through setting up custom parameters such as **minimum stake** and **lock-in period** per serviceID. This is done through the methods `setServiceMinimumStake` and `setServiceStakePeriod` respectively.

3. For the staking functionality to work, sender has to invoke `approve(stakingContractAddress, stakingAmount)` against on the **token contract** first, passing the staking contract address and
the corresponding staking amount (including all decimal places). This is to allow the staking contract to spend funds (up to the limit set) on behalf of its owner. After token spending approval,
`StakingManager` method `stake` can be invoked by passing an amount, a _serviceOnwer_ address and a _serviceID_. For "global" services not tied to any particular service owner, the "zero address" can be used as the serviceOwner (i.e. `0x0000000000000000000000000000000000000000`).

If multiple stakes need to be done, sender can make one big approval that sums up to the desired total stake amount.

### StakedAccess Contract Interface

All staking functionality is implemented by the `StakingManager` contract, which includes the
following attributes:

#### Public State Variables

* `balances[address][serviceOwner][serviceID]`: A mapping that stores all stake balances for each sender address for each different service under a serviceOwner address.

* `releaseDates[address][serviceOwner][serviceID]`: A mapping from addresses and bytes32 to a datetime in Unix format, representing the moment at which such stake can be released for a given service.

* `stakePeriods[serviceOwner][serviceID]:` The minimum amount of _days_ that each stake should be locked for before allowing token retrieval for a given service.  Only the _serviceOwner_ address can set this parameter.

* `stakeMinimum[serviceOwner][serviceID]:` The minimum amount of _tokens_ (including decimal places) that a sender can stake for a given service. Only the _serviceOwner_ address can set this parameter.

#### Public Functions

* `stake(amount, serviceOwner, serviceID)`: On invoking the `stake` function, an `amount` of tokens
is deducted from the sender address balance and added to the staking balance for a particular `serviceID` under a `serviceOwner` address. For the contract to be able to deduct tokens on behalf of the sender, sender **must previously call the approve method of the token contract** with at least the intended `amount`.

* `withdraw(serviceOwner, serviceID)`: a stake sender can invoke the `withdraw` function by specifying a `serviceOwner` and `serviceID`, in which case the **total** stake for that service is sent back to the sender's wallet. If a minimum period has been set priorly to the stake action, such withdrawal can only be made if present moment is beyond what's set on `releaseDates` for that particular stake.

* `hasStake(address, serviceOwner, serviceID)`: returns whether there's a stake made (greater than zero) by a sender on a particular service.

* `hasStakeAboveMinimum(address, serviceID)`: returns whether there's a stake made (greater than the current minimum) by a sender on a particular service.

* `setServiceStakePeriod(serviceID, amount)` **(only service owner)**: Stake lock-in period can be changed for any arbitrary `serviceID` under the caller's address. This does not affect stakes previously made.

* `setServiceMinimumStake(serviceID, amount)` **(only service owner)**: Minimum staking amount can
be changed for any arbitrary `serviceID` under the caller's address. This does not affect stakes previously made.

#### Events

* `KEYStaked(uint256 amount, address from, address serviceOwner, bytes32 serviceID)`: Emitted when
an address has successfully staked an amount of _KEY_ to a particular service.

* `KEYStakeWithdrawn(uint256 amount, address from, address serviceOwner, bytes32 serviceID)`:
Emitted when a _KEY_ owner has withdrawn tokens previously staked for a certain serviceID.

## Development

The smart contracts are being implemented in Solidity `0.4.23`.

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

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
