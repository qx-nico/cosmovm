---
sidebar_position: 3
---

# Adding The Bank EVM Precompile

STR v2 enables native coin transfers through EVM interfaces. This is enabled through the `x/bank` precompile, which provides the corresponding logic that relates to the token transfer methods native to the EVM.

This precompile needs to be enabled. If you have not yet enabled any precompiles on your chain, please read [Enable Precompiles](./../enable-precompiles.md) prior to continuing with this document.

In short, to enable the bank precompiles, add it to the provider function that builds the map of precompiled contracts which is passed to the EVM keeper upon creation.

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

Furthermore, it is required to **enable the bank precompile in the EVM module parameters**. This can be done through a corresponding module upgrade proposal that goes through governance. However, since it is required that the introduction of this feature goes hand in hand with a chain upgrade, we recommend to just enable the precompile during the upgrade process as well by creating a dedicated upgrade handler.

An example to enable a precompile in an upgrade handler is shown [here](./../enable-precompiles.md).