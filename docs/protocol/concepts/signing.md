---
sidebar_position: 11
---

# Signing

Signing is the process of creating a digital signature using a private key to verify a transaction
on a blockchain. The signature is created using a specific cryptographic algorithm that
ensures the authenticity and integrity of the transaction using methods like
wallets and the CLI.

There are different methods for signing, but one of the most commonly used methods is the
[EIP-712](https://eips.ethereum.org/EIPS/eip-712) standard.
Cosmos EVM leverages EIP-712 to homogenize the interaction between the EVM and Cosmos.

## EIP-712

EIP-712 introduces a standard for signing "typed-data" in a human-readable format. This standard allowed users to understand
the data they are signing more easily and provides a more secure way to sign data, as it is less susceptible to phishing
attacks. EIP-712 is not an Ethereum transaction type, but a method for signing structured data that can be used for
authentication and indirect influence on program logic.

To support signing Cosmos transactions, Cosmos EVM utilizes the EIP-712 protocol for encoding Cosmos transactions in a
format that can be understood and processed by Ethereum signers, including Ledger hardware wallets. This approach
helps to overcome the limitations of Ethereum signing devices, which often do not support signing arbitrary bytes
for security reasons.

The process works as follows:

1. A Cosmos transaction is represented as a JSON sign-doc.
2. The JSON sign-doc is converted to an EIP-712 object, which consists of types and messages.
3. The EIP-712 object is signed using an Ethereum signer, such as MetaMask or a Ledger hardware device.
4. The same process is performed on the node to verify the signature.

By using EIP-712 for signing Cosmos transactions, Cosmos EVM ensures compatibility with popular Ethereum signing tools
like MetaMask and Ledger devices as well as Cosmos specific ones like Keplr and Leap. This compatibility makes it easier
for users to interact with both Ethereum and Cosmos networks, ultimately fostering greater interoperability between the
two ecosystems.