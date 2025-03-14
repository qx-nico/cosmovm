---
sidebar_position: 9
---

# Tokens

It is recommend to uses [Atto](https://en.wikipedia.org/wiki/Atto-) for your base denomination to maintain parity with Ethereum.
There are two types of assets to consider on a Cosmos EVM-based chain:

- Cosmos tokens issued by the `x/bank` module
- Ethereum-typed tokens, e.g. ERC-20, issued by the EVM

`1 stake = 10<sup>18</sup> astake`

This matches Ethereum denomination of:

`1 ETH = 10<sup>18</sup> wei`

## Cosmos Coins

Accounts can own Cosmos coins in their balance, which are used for operations with other Cosmos and transactions. Examples
of these are using the coins for staking, IBC transfers, governance deposits and EVM.

## EVM Tokens

Cosmos EVM is compatible with ERC20 tokens and other non-fungible token standards (EIP721, EIP1155)
that are natively supported by the EVM.

For more information on how we handle token registration, head over [here](./../../develop/mainnet#token-registration).