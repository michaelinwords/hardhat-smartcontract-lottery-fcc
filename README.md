# Hardhat Smart Contract Lottery - Free Code Camp Tutorial

## Setting up:
-   We used this very long command to install all of our dependencies for this project:

`yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv`

Note: then, need to add require statements to hardhat.config.js

## Events:
-   Whenever we update a dynamic object (like an array, mapping), always emit an event
-   EVM has functionality to log events - events allow you to "print" to the EVM log
-   Smart contracts cannot access logs, but emitted events are tied to the contract that emitted them
-   Within events, parameters are either indexed or not; can have up to 3 indexed parameters (topics); these are much easier to search for
-   Naming convention: name an event (function_start) by the reverse of a function (start_function)

## Chainlink VRF and keepers:
-   Biggest change in VRF version 2 is that instead of funding contract with link (VRF 1 model), instead now funding subscription, an account that allows you to fund multiple contracts
-   Happens in two parts: request the random words, then fulfill random words - this being a two-part process helps prevent hacking/breaking the randomness of the process
-   The vrfCoordinator is the address of the contract that does the random number verification
-   How to use keepers network to automate parts of our code, based on a trigger we define:
>   need to make sure our contract has two functions: checkUpkeep (checks if the contract requires work to be done) and performUpkeep (perform the work on the contract, if instructed by checkUpkeep)
>>  checkUpkeep is run off-chain by a node from the chainlink keeper network
>>  performUpkeep: where we verify that things are correct and should run on chain
## Other notes:
-   If we want an address to be able to receive tokens (whether we're receiving or sending), the address needs to have the payable keyword
-   hardhat-shorthand is an NPM package that will allow us to be able to type "hh compile" rather than "yarn hardhat compile", and similar commands; to install, yarn global add hardhat-shorthand (correction: that installation command does not work; use npm install --global hardhat-shorthand)