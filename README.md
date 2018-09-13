# selfkey-staking

This project comprehends a set of smart contracts that allow users to make KEY deposits for getting
access to services and features. The base contract `DepositVault` serves as the base for more
complex functionality to be implemented, such as staking and escrow payments.

* `develop` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/develop/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)
* `master` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/master/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)

## Overview

The `DepositVault` contract implements basic "deposit" functionality. The contract works as a "deposit registry", keeping track of different deposits made by different addresses and linked to different services provided by different owners. The following is a list of features:

1. Addresses are able to "deposit" _KEY_ associated to a given _Service Owner_ address and a _serviceID_ 32-byte string.

2. Deposited tokens can only be retrieved by the original sender anytime.

3. For the `deposit` method to work, the sender has to first invoke `approve(depositVaultAddress, maxAmount)` on the **token contract** , passing the deposit vault contract address and
the corresponding deposit amount (including all decimal places). This is to allow the deposit contract to spend funds (up to the limit set) on behalf of its owner. After approval,
`DepositVault` method `deposit` can be invoked by specifying an `amount` (with all decimal places),
a _serviceOwner_ address and a _serviceID_. For "global" services not tied to any particular provider, the "zero address" can be used as the `serviceOwner` (i.e. `0x0000000000000000000000000000000000000000`).

If multiple deposits need to be done, sender can make one big approval that sums up to the desired total deposit amount. Thus the users don't need to spend extra gas by having to approve each time.

### DepositVault base contract

Core deposit functionality is implemented by the `DepositVault` contract, which features a global array of balances:

* `balances[depositor][serviceOwner][serviceID]`: this mapping stores all deposit balances for each depositor address for each different service owner under a specific serviceID.

#### Methods

* `deposit(amount, serviceOwner, serviceID)`: On invoking this function, an `amount` of tokens
is deducted from the sender address balance and added to the deposit balance for a particular `serviceID` under a `serviceOwner` address. For the contract to be able to deduct tokens on behalf
of the sender, sender **must previously call the approve method on the token contract** with _at least_ the `amount` intended for deposit. Successful execution triggers the event `KEYDeposited`.

* `withdraw(serviceOwner, serviceID)`: a deposit sender can invoke the `withdraw` function anytime
by specifying a `serviceOwner` and `serviceID`, in which case the **total** deposit for that
service is sent back to the depositor address.  Successful execution of this method triggers the event `KEYWithdrawn`.

#### Events

* `KEYDeposited(amount, from, serviceOwner, serviceID)`: Emitted
when an address has successfully deposited an amount of _KEY_ to a particular service.

* `KEYWithdrawn(amount, from, serviceOwner, serviceID)`:
Emitted when a depositor has withdrawn tokens previously deposited for a certain service.

### Specialized DepositVault implementations

As previously mentioned, `DepositVault` serves as the most simple case of deposit registry functionality, from which the following "specialized" implementations derive, having the same basic  capabilites plus some additional features:

#### LockedDepositVault

Implements an optional "timelock" on deposits. For this end, the service owner can set a "lock period" upon any serviceID. Any deposit made by an address on such serviceID will reset the counter for the period set on that deposit. Deposit sender cannot withdraw before the period is fulfilled.

This contract is _pausable_, meaning that the contract owner can at some point suspend its
activity in case there's a migration going on and the contract is becoming "deprecated". When the contract is paused, no new deposits can be made, and withdrawals are enabled regardless of their timelock status.

##### Attributes

* `releaseDates[depositor][serviceOwner][serviceID]`: keeps track of the release dates for all deposits, stored as a datetime in Unix format. This value is set at deposit time, if there's a lock period that corresponds to the specific service. If no timelock has been set for the corresponding service, it'll have the default value 0.

* `lockPeriods[serviceOwner][serviceID]`: stores all the set lock periods for specific services by their corresponding service owner. If no timelock has been set for the given service, it'll have the default value 0.

##### Methods

* `setLockPeriod(serviceID, period)`: At any point, any Ethereum address can set a lock period (in seconds) for a `serviceID` that holds or will hold deposits under the caller address as its _service owner_.

`deposit` and `withdraw` methods work as implemented on the `DepositVault` contract, but have been
overwritten for adding and checking timelock states on deposits respectively. Timelock check on withdrawal is overriden if the contract is _paused_.

##### Events

* `LockPeriodSet(serviceOwner, serviceID, period)`: triggered when a lock `period` is set to a
`serviceID` by a `serviceOwner`.

#### RefundableDepositVault

`RefundableDepositVault` is a type of `LockedDepositVault`, with the addition of a `refund` method that a service owner can invoke anytime to force a refund of tokens to the original depositor, regardless of its timelock status.

##### Methods

* `refund(depositor, serviceID)`: refunds deposited token to their original sender. Successful execution triggers a `PaymentRefunded` event.

##### Events

* `PaymentRefunded(amount, depositor, serviceOwner, serviceID)`

#### RefundableEscrow

`RefundableEscrow` is a slightly different type of deposit contract, in that it's made to handle "deferred payments", meaning that the tokens can be _released_ to the service owner when the depositor considers the transaction conditions have been met.

This contract is _pausable_, meaning that the contract owner can at some point suspend its
activity in case there's a migration going on and the contract is becoming "deprecated". When the contract is paused, no new deposits can be made, and withdrawals are enabled.

##### Methods

* `withdraw(serviceOwner, serviceID)`: In this version, withdrawals are disabled by default, being available only if the contract is _paused_.

* `deposit(amount, serviceOwner, serviceID)`: works exactly as in `DepositVault`, with the
difference that `0x000..` cannot be used as a service owner address.

* `release(serviceOwner, serviceID)`: A depositor can release the deposited funds on a `serviceID` to be sent to the corresponding `serviceOwner`.

* `refund(depositor, serviceID)`: A service owner can "roll-back" the payment by refunding the
tokens to the depositor.

##### Events

* `PaymentMade(amount, sender, serviceOwner, serviceID)`
* `PaymentReleased(amount, sender, serviceOwner, serviceID)`
* `PaymentRefunded(amount, sender, serviceOwner, serviceID)`

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
