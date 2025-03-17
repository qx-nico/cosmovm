---
sidebar_position: 5
---

# Enable Cosmos EVM Precompiles

:::note
These documents are in maintenance, due to the recent migration from evmOS to the maintenance of this fork by the Interchain Labs team. The team is working on updating stale or old references, and re-link to the appropriate repositories. **If you'd like to get in touch with a Cosmos EVM expert at Interchain Labs, please reach out [here](https://share-eu1.hsforms.com/2g6yO-PVaRoKj50rUgG4Pjg2e2sca)**.
:::

Cosmos EVM precompiles are an innovative solution to align the Cosmos and EVM worlds provided by Cosmos EVM. This system is a combination of precompiles smart contracts, Cosmos-native module logic and corresponding Solidity interfaces, which enable accessing a chain’s core Cosmos primitives through MetaMask or other EVM wallets and smart contracts on the EVM.

Cosmos EVM provides precompiles for a selection of core modules from the Cosmos SDK (staking, distribution, bank) and modules from Cosmos EVM itself (ERC-20). These can be enabled to for use by passing a corresponding map of contract addresses and the respective precompiled contracts into the EVM keeper during the application instantiation.

```go
evmKeeper.WithStaticPrecompiles(
	ProvideEVMExtensions(...)
)
```

## 🤝 Provider Function

We recommend to build a provider function, which then returns the required map. This function instantiates the desired EVM precompile and builds the map of addresses and implementations. You can check the reference implementation here: https://github.com/cosmos/evm/blob/main/x/evm/keeper/static_precompiles.go#L33-L101.

An example implementation, that would just use the staking and distribution precompiles, can be found here:

```go
import (
	fmt"
	"slices"

	"golang.org/x/exp/maps"
	
	// EVM Types
	"github.com/cosmos/evm/v19/x/evm/core/vm"
	"github.com/cosmos/evm/v19/x/evm/types"
	
	// Keepers
	authzkeeper "github.com/cosmos/cosmos-sdk/x/authz/keeper"
	distributionkeeper "github.com/cosmos/cosmos-sdk/x/distribution/keeper"
	stakingkeeper "github.com/cosmos/evm/v19/x/staking/keeper"
	
	// EVM precompiles
	distprecompile "github.com/cosmos/evm/v19/precompiles/distribution"
	stakingprecompile "github.com/cosmos/evm/v19/precompiles/staking"
)

func ProvideEVMExtensions(
	stakingKeeper stakingkeeper.Keeper,
	distributionKeeper distributionkeeper.Keeper,
	authzKeeper authzkeeper.Keeper,
) map[common.Address] {
	// Clone the existing precompiles from the Go-Ethereum fork
	precompiles := maps.Clone(vm.PrecompileContractsBerlin)
	
	// Instantiate the staking EVM extension
	stakingPrecompile, err := stakingprecompile.NewPrecompile(stakingKeeper, authzKeeper)
	if err != nil {
		panic(fmt.Errorf("failed to instantiate staking precompile: %w", err))
	}

	// Instantiate the distribution EVM extension
	distributionPrecompile, err := distprecompile.NewPrecompile(
		distributionKeeper,
		stakingKeeper,
		authzKeeper,
	)
	if err != nil {
		panic(fmt.Errorf("failed to instantiate distribution precompile: %w", err))
	}
	
	// Add the instantiated EVM precompile to the map of precompiled contracts
	precompiles[stakingPrecompile.Address()] = stakingPrecompile
	precompiles[distributionPrecompile.Address()] = distributionPrecompile
	
	return precompiles
}
```

## 🗳️ Activation In Parameters

Cosmos EVM has a distinction between the *available* precompiles and those that are *active*. 

**Available Cosmos EVM Precompiles** refer to the precompiles that are functionally enabled in the EVM and, if activated through governance, can handle incoming transactions or smart contract calls.

**Active Cosmos EVM Precompiles** are those that have been enabled in the EVM module parameters and are open to receive transactions. This distinction enables chain operators for example to test new precompiles on their respective testnets, while keeping experimental features off of the main chain without having to run separate chain binaries.

In summary:

- **Available precompiles**: Theoretically included in the EVM, not necessarily in use.
- **Active Precompiles**: Enabled and in use, under control of chain governance.

**Parameter Change**

The way to set a given precompile to active is by including the corresponding Hex representation of the contract’s address to the slice of `active_static_precompiles` in the [EVM module parameters](https://github.com/cosmos/evm/blob/v19.0.0/proto/ethermint/evm/v1/evm.proto#L10-L33).

This can be achieved by submitting a *parameter upgrade proposal* on chain. When introducing a new precompile in a new binary version, we usually recommend to include the parameter change within the upgrade logic to avoid having a second governance proposal.

```go
// app/upgrades/vX/upgrades.go
package vX

import (
	...
)

// CreateUpgradeHandler creates an SDK upgrade handler for vX
func CreateUpgradeHandler(
	mm *module.Manager,
	configurator module.Configurator,
	ek *evmkeeper.Keeper,
) upgradetypes.UpgradeHandler {
	return func(ctx sdk.Context, _ upgradetypes.Plan, vm module.VersionMap) (module.VersionMap, error) {
		logger := ctx.Logger().With("upgrade", UpgradeName)
		
		// Add staking precompile to active static precompiles parameter
		params := ek.GetParams(ctx)
		params.ActiveStaticPrecompiles = append(
			params.ActiveStaticPrecompiles,
			evmtypes.StakingPrecompileAddress,
		)
		if err := ek.SetParams(ctx, params); err != nil {
			logger.Error("error enabling staking evm extension", "error", err)
		}
		
		// Run module migrations
		return mm.RunMigrations(ctx, configurator, vm)
	}
}
```

## 🙅 Adding To Blocked Addresses

In general, we recommend to add the all available precompiles to be added to the list of blocked addresses that is passed to the bank keeper, because it can be expected that sending user funds to the precompiled contract is an erroneous use case.

<aside>
⚠️ This is an assumption based on our experience. It could be possible that you do want to have user funds sent to the accounts of your custom Cosmos SDK precompiles, in which case you can choose to not set those to be blocked.

</aside>

In the reference implementation of Cosmos EVM, there is the following function to build the map of blocked addresses:

```go
func (app *Evmos) BlockedAddrs() map[string]bool {
	blockedAddrs := make(map[string]bool)

	// Add all module accounts to be blocked
	accs := make([]string, 0, len(maccPerms))
	for k := range maccPerms {
		accs = append(accs, k)
	}
	sort.Strings(accs)

	for _, acc := range accs {
		blockedAddrs[authtypes.NewModuleAddress(acc).String()] = true
	}

	// Add all precompiled smart contracts to the blocked addresses
	blockedPrecompilesHex := evmtypes.DefaultStaticPrecompiles
	for _, addr := range vm.PrecompiledAddressesBerlin {
		blockedPrecompilesHex = append(blockedPrecompilesHex, addr.Hex())
	}

	for _, precompile := range blockedPrecompilesHex {
		blockedAddrs[utils.EthHexToCosmosAddr(precompile).String()] = true
	}

	return blockedAddrs
}
```