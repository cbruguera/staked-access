# staked-access

Contracts that provide access to a marketplace based on the staking of KEY by participants

* `develop` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/develop) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/develop/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)
* `master` — [![CircleCI](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master.svg?style=svg)](https://circleci.com/gh/SelfKeyFoundation/staked-access/tree/master) [![codecov](https://codecov.io/gh/SelfKeyFoundation/staked-access/branch/master/graph/badge.svg)](https://codecov.io/gh/SelfKeyFoundation/staked-access)

## Overview

Many ICOs require that their participants be KYC (Know Your Customer) verified before being allowed to participate in their crowdsale.

The `StakedAccess` contracts by the SelfKeyFoundation provide the following functionality.

1. Addresses are able to `stake` `KEY` tokens, reserving an amount of tokens to indicate their willingness to participate in an ICO.
2. Staked `KEY` can only be retrieved by its owner once the `StakedAccess` contract has expired.

## Development

The smart contracts are being implemented in Solidity `0.4.19`.

### Prerequisites

* [NodeJS](htps://nodejs.org), version 9.5+ (I use [`nvm`](https://github.com/creationix/nvm) to manage Node versions — `brew install nvm`.)
* [truffle](http://truffleframework.com/), which is a comprehensive framework for Ethereum development. `npm install -g truffle` — this should install Truffle v4+.  Check that with `truffle version`.
* [Access to the KYC_Chain Jira](https://kyc-chain.atlassian.net)

### Initialisation

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
