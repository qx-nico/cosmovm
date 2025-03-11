---
sidebar_position: 3
---

# 🏦 Adding The Bank EVM Extension

STR v2 enables native coin transfers through EVM interfaces. This is enabled through the bank EVM extension, which provides the corresponding logic that relates to the token transfer methods native to the EVM.

This EVM extension needs to be enabled. If you have not yet enabled any EVM extensions on your chain, please read [Enable EVM Extensions](https://www.notion.so/Enable-EVM-Extensions-81f1186d25ec4c7a8fd951e644c6802c?pvs=21) prior to continuing with this document.

In short, to enable the bank extension, add it to the provider function that builds the map of precompiled contracts which is passed to the EVM keeper upon creation.

```go
func ProvideEVMExtensions(
	// ...
	bankKeeper  bankkeeper.Keeper,
	erc20Keeper erc20keeper.Keeper,
) map[common.Address]vm.PrecompiledContract {
	// ...
	
	bankPrecompile, err := bankprecompile.NewPrecompile(bankKeeper, erc20Keeper)
	if err != nil {
		panic(fmt.Errorf("failed to instantiate bank precompile: %w", err))
	}

	// ...
	precompiles[bankPrecompile.Address()] = bankPrecompile
	
	return precompiles
}
```

Furthermore, it is required to **enable the bank EVM extension in the EVM module parameters**. This can be done through a corresponding module upgrade proposal that goes through governance. However, since it is required that the introduction of this feature goes hand in hand with a chain upgrade, we recommend to just enable the extension during the upgrade process as well by creating a dedicated upgrade handler.

An example to enable an EVM extension in an upgrade handler is shown here: [// app/upgrades/vX/upgrades.go
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
		
		// Add staking EVM extension to active static precompiles parameter
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

An example to enable an EVM extension in an upgrade handler is shown here: https://altiplanic.notion.site/Enable-EVM-Extensions-81f1186d25ec4c7a8fd951e644c6802c#be2260f3b3734d4b8b44532fe2898b1a