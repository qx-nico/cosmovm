---
sidebar_position: 1
---

# Unify Erc-20s & Cosmos Coins

## Context

evmOS has recently introduced the [Single Token Representation v2](https://medium.com/evmos/evmos-introduces-native-tokens-as-erc-20-for-cosmos-1a4c7de5c3e9), which is a revolutionary piece of technology for the Cosmos ecosystem. For the first time, there is full alignment between the [ICS-20](https://github.com/cosmos/ibc/blob/main/spec/app/ics-020-fungible-token-transfer/README.md) standard for Cosmos coins and the [ERC-20 token standard](https://ethereum.org/en/developers/docs/standards/tokens/erc-20/), which is widely used in EVM chains.

Previously, it was specifically required to convert the tokens between the two representations in order to use them either in IBC transfers and other functionality native to the Cosmos ecosystem or for them to be used in EVM smart contracts.

Now with STR v2, this conversion is no longer required for those assets, that are registered in evmOS’ `x/erc20` module. This is enabled through EVM extensions, which make use of an exposed interface for the bank module and the ERC-20 standard to access the bank directly when transferring registered Cosmos coins in the EVM. 

❗ This guide requires any given chain to be have already integrated the evmOS EVM and IBC. If any of these are not enabled yet, please do so before integrating the ERC-20 module and STRv2.

***

This consists of 3 steps:

1. Integrating the ERC-20 Module
2. Adding The Bank EVM Extension
3. Registering Coins For STR v2


## ❓What About Existing Native ERC-20s?
ERC-20 tokens that have been natively issued in the EVM are not yet supported by default, because the process of enabling them with STR v2 requires a corresponding EVM extension to be issued in place of the underlying smart contract.

The important thing is though, that ERC-20 is simply a requirement for given methods to be present in a smart contract like the `symbol` or `name` queries as well as the `balanceOf`, `transfer` and `transferFrom` methods among others.

There are also contracts that have extended functionality like specific minting and burning logic or more advanced approval mechanisms. This functionality would be removed if we were to deploy the default ERC-20 EVM extension in place of the original contract. For this reason, we are not supporting ERC-20 tokens that were natively issued in the EVM (for now) with STR v2.
