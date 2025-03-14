---
sidebar_position: 2
---

# Migrate from Ethermint

This guide will help you migrate from an Ethermint implementation to Cosmos EVM.


## ☑️ Prerequisites

In order to ensure the best possible experience, we recommend initially migrating to a version of Cosmos EVM, that is compatible with the version of Ethermint when it comes to the used dependencies. The following table shows versions that can be immediately adapted:

| **Ethermint** | **Compatible Cosmos EVM Version** |
| --- | --- |
| [v0.21.x](https://github.com/evmos/ethermint/releases/tag/v0.21.0) | [v13.0.2](https://github.com/evmos/evmos/releases/tag/v13.0.2) |
| [v0.22.x](https://github.com/evmos/ethermint/releases/tag/v0.22.0) | [v13.0.2](https://github.com/evmos/evmos/releases/tag/v13.0.2) |

After migrating to EVM, we strongly suggest a follow-up migration to a more recent version that usually contains new features, performance improvements as well as security fixes.

As this will include upgrades to the used versions of the main dependencies like Cosmos SDK and IBC, we recommend doing this in a dedicated chain upgrade.

---

## Migration
These are the steps to follow to migrate.

## 📲 Module Imports

The first step in migrating from Ethermint to Cosmos EVM is importing the corresponding version in the corresponding Go module file.

**Cosmos EVM**
    
```
yaml
    go get github.com/evmos/evmos/v13@v13.0.2
```


Furthermore, the necessary replacements to the used versions of the Cosmos EVM version have to be made.

**Cosmos SDK**
    
Add a replace directive to the corresponding release tag on the Cosmos EVM fork of the Cosmos-SDK.

```bash
go mod edit --replace \
github.com/cosmos/cosmos-sdk=github.com/evmos/cosmos-sdk@v0.46.13-alpha.ledger.8
```
    
**Go-Ethereum**
    
Add a replace directive to the corresponding tag on Cosmos EVM' Go-Ethereum fork.

```bash
go mod edit --replace \
github.com/ethereum/go-ethereum=github.com/cosmos/go-ethereum@v1.10.26-evmos-rc2
```
    

### 💻 Adjusting The Import Paths

All imports of the Ethermint dependency can be replaced throughout the repository with the updated Go module imports from Cosmos EVM:

```bash
find . -type f -name '*.go' -exec \
sed -i '' 's|github\.com/evmos/ethermint|github\.com/evmos/evmos/v13|g' {} +
```

### 🕰️ Updating Outdated Implementations

There have been numerous changes made to the EVM and feemarket implementations between the discontinued Ethermint versions and Cosmos EVM. Most of these only touch the contained code within the respective functions and types, but there have been some improvements and refactors, that require work on top of simply adjusting the import paths.

#### 🔌 **App Wiring**

The EVM keeper interface has been reduced, which requires less arguments being passed into the `NewKeeper` function call made in `app.go`.

#### 🤝 **Ante Handler**

The ante package has been reorganized and split into multiple subpackages for EVM- and Cosmos related ante handlers as well as utilites.

The call signature of the `NewEthGasConsumeDecorator` has been adjusted.

Finally, the `ethante.Recover` function has been removed. On the Evmos repository, this function is not used anymore (see [here](https://github.com/evmos/evmos/blob/v16.0.3/app/ante/ante.go#L17-L26)) and it can be removed on any customer chains too.

#### 📠 **EVM Module**

The `vm` subdirectory in the `x/evm` module has been refactored.

On top of this, EVM extensions have been added to the codebase, which require additional EVM parameters and corresponding setup in the application wiring by instantiating the EVM keeper with the available precompiled contracts.

## What's next?
After migrating to Cosmos EVM you can extend the functionality of your chain even further than making use of the most recent up-to-date EVM implementation.

- Unify ERC-20s and Cosmos Coins with the *Single Token Representation v2*.
- Enable EVM Extensions or add your own custom implementations, that let smart contract developers and EVM users access your Cosmos SDK module functionality! More information can be found here: https://evm.cosmos.network/develop/smart-contracts/evm-extensions.
- Add more functionality from the https://evm.cosmos.network/protocol/modules.