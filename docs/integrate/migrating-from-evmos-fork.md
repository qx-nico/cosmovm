---
sidebar_position: 3
---

# Migrate from Evmos Fork

If you have started your project as a fork of the Evmos repository, we have good news for you! Upgrading to Cosmos EVM will enable you to reduce a lot of code in your codebase and replace its native types and functions with the corresponding imports from the original codebase.

In addition you will be profit from security upgrades, performance improvements and feature additions without having the development overhead of manually adjusting your fork.



## Migration
The following steps are required to migrate from a fork:

## 📲 Module Imports

The first step to move away from an existing forked codebase is adding the module import:

**Cosmos EVM**

```bash
go get github.com/evmos/evmos/vX
#   adjust desired version --- ^
```
    
**Cosmos SDK**
    
Cosmos EVM is making use of its own fork of the Cosmos SDK codebase, specifically to add Ledger functionality with the Ethereum app.

The following table shows the used versions of the Cosmos SDK fork with respect to the Cosmos EVM versions:

| **Cosmos EVM Version** | **Cosmos SDK Fork** |
| --- | --- |
| v10.0.1 | v0.46.7-ledger |
| v11.0.2 | v0.46.9-ledger |
| v12.1.6 | v0.46.13-ledger.3 |
| v13.0.2 | v0.46.13-alpha.ledger.8 |
| v14.1.0 | v0.47.4-evmos.2 |
| v15.0.0 | v0.47.5-evmos |
| v16.0.4 | v0.47.5-evmos.2 |
| v17.0.2 | v0.47.5-evmos.2 |
| v18.1.0 | v0.47.5-evmos.2 |

```bash
go mod edit --replace \
github.com/cosmos/cosmos-sdk=github.com/evmos/cosmos-sdk@vY
#                       adjust version to desired one --- ^
```
    
**Go-Ethereum**


Add a replace directive to the corresponding tag on the Cosmos Go-Ethereum fork.

| **Cosmos EVM Version** | **evmOS Fork** |
| --- | --- |
| < v18.1.0 | v1.10.26-evmos |

```bash
go mod edit --replace \
github.com/ethereum/go-ethereum=github.com/evmos/go-ethereum@vZ
#                           adjust version to desired one --- ^
```


## ♻️ Removing Forked Modules

As the project now has obtained a license to use the most recent version of the Cosmos EVM, we recommended to remove all corresponding modules from the fork, that did not undergo any adjustments by the project team. These can be directly imported from the Cosmos EVM dependency and thus will contain the most up-to-date changes.
This removes legacy code from the project’s codebase and makes the project cleaner.

As a fork of the legacy Evmos codebase, the most types and functions should already be in use within the codebase that is distinct to the given project. Hence, this process of moving to an Cosmos EVM user is simply a matter of adjusting import paths.

For example, if the `encoding` package has been removed from the codebase, the following shell command replaces those import paths with the corresponding import from the Cosmos EVM:

```bash
grep -rl 'github.com/YOUR-ORG/YOUR-PROJECT/encoding' ./ \
| LC_ALL=C xargs sed -i '' \
's|github.com/YOUR-ORG/YOUR-PROJECT/encoding|github.com/evmos/evmos/vX/encoding|g'
#             adjust to desired version ---------------------------- ^
```

<aside>
⚠️ Since the command above is adjusting all files that contain the given pattern, it is advisable to only run the `grep` command portion first. That way it can be ensured, that no undesired changes will be applied (e.g. in the `.git` folder).

</aside>

## 🆙 Upgrade Procedure

We suggest to run a chain upgrade after implementing said changes to moving to the Cosmos EVM dependency and before upgrading to newer versions of our software.

This will make the upgrade process leaner and also provide a separation of concerns.

## What's Next?

After migrating to Cosmos EVM you can extend the functionality of your chain even further than making use of the most recent up-to-date EVM implementation.

- Unify ERC-20s and Cosmos Coins with the *Single Token Representation v2*.
- Enable EVM Extensions or add your own custom implementations, that let smart contract developers and EVM users access your Cosmos SDK module functionality! More information can be found here: https://evm.cosmos.network/develop/smart-contracts/evm-extensions.
- Add more functionality from the https://evm.cosmos.network/protocol/modules.