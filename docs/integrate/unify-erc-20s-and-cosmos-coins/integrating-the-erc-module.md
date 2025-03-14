---
sidebar_position: 2
---

# Integrating The ERC-20 Module

If a given Cosmos EVM chain has not yet integrated the ERC-20 module into their codebase, this is a required step to enable STR v2.

## Keeper Implementation

The module keeper needs to be added to the application struct.

```go
type App struct {
	*baseapp.BaseApp
	
	// ...
	ERC20Keeper erc20keeper.Keeper
	// ...
}
```

This keeper has to be instantiated during the creation of a new application instance.

```go
func NewApp(
	// ...
) *App {
	// ...
	
	app.Erc20Keeper = erc20keeper.NewKeeper(
		keys[erc20types.StoreKey],
		appCodec,
		authtypes.NewModuleAddress(govtypes.ModuleName),
		app.AccountKeeper,
		app.BankKeeper,
		app.EvmKeeper,
		app.StakingKeeper,
		app.AuthzKeeper,
		&app.TransferKeeper,
	)
}
```

**EVM Keeper**

To support the Single Token Representation v2, it is also required to pass the ERC-20 module keeper into the [instantiation of the EVM keeper](https://github.com/cosmos/evm/blob/v19.0.0/app/app.go#L441-L447).

```go
	evmKeeper := evmkeeper.NewKeeper(
		appCodec, keys[evmtypes.StoreKey], tkeys[evmtypes.TransientKey], authtypes.NewModuleAddress(govtypes.ModuleName),
		app.AccountKeeper, app.BankKeeper, stakingKeeper, app.FeeMarketKeeper,
		// ERC-20 keeper is passed here for ERC-20 Cosmos EVM precompile
		&app.Erc20Keeper,
		tracer, app.GetSubspace(evmtypes.ModuleName),
	)
	app.EvmKeeper = evmKeeper
```

## Module Accounts

The ERC-20 module account has to be set up along with the corresponding permissions. Note, that the module requires minter and burner permissions if native ERC-20s should be supported to be handled through a corresponding token pair. This works through a mint-and-burn mechanism.

```go
maccPerms = map[string][]string{
	// ...
			
	erc20types.ModuleName: {authtypes.Minter, authtypes.Burner},
}
```

## Module Basics

Add the ERC-20 module basics to the basic module manager. 

```go
ModuleBasics = module.NewBasicManager(
	// ...
	evm.AppModuleBasic{},
	feemarket.AppModuleBasic{},
	erc20.AppModuleBasic{},
)
```

Note, that the ERC-20 module also provides governance proposals that need to be added to the configuration of the governance module (should it be used).

```go
ModuleBasics = module.NewBasicManager(
	// ...
	gov.NewAppModuleBasic(
		[]govclient.ProposalHandler{
			// ...
			erc20client.RegisterERC20ProposalHandler,
			erc20client.ToggleTokenConversionProposalHandler,
		},
	),
	// ...
)
```

## Module Manager

The main module manager needs to include the ERC-20 application module as well.

```go
app.mm = module.NewManager(
		// ...
		
		// Cosmos EVM app modules
		evm.NewAppModule(app.EvmKeeper, app.AccountKeeper, app.GetSubspace(evmtypes.ModuleName)),
		feemarket.NewAppModule(app.FeeMarketKeeper, app.GetSubspace(feemarkettypes.ModuleName)),	
		erc20.NewAppModule(app.Erc20Keeper, app.AccountKeeper,
			app.GetSubspace(erc20types.ModuleName)),
	)
```

## Begin and End Block Order

Even though the Begin- and EndBlock logic is currently a no-op for the ERC-20 module, we still recommend to add the module into the corresponding order functions of the module manager.

```go
app.mm.SetOrderBeginBlockers(
		// ...
		feemarkettypes.ModuleName,
		evmtypes.ModuleName,
		erc20types.ModuleName,
	)
	
	// NOTE: fee market module must go last in order to retrieve the block gas used.
	app.mm.SetOrderEndBlockers(
		// ...
		evmtypes.ModuleName,
		erc20types.ModuleName,
		feemarkettypes.ModuleName,
	)
```

## Module Genesis Order

The ERC-20 module needs to be added to the order function for the `InitGenesis` functions of the individual modules in the application.

```go
app.mm.SetOrderInitGenesis(
		// ...
		
		// Cosmos EVM modules
		evmtypes.ModuleName,
		erc20types.ModuleName,
		// NOTE: feemarket module needs to be initialized before genutil module:
		// gentx transactions use MinGasPriceDecorator.AnteHandle
		feemarkettypes.ModuleName,
		genutiltypes.ModuleName,
		
		// ...
	)
```

## Governance Router

The governance proposal routes for the available proposals of the ERC-20 module need to be add to the governance router.

```go
	govRouter := govv1beta1.NewRouter()
	govRouter.AddRoute(govtypes.RouterKey, govv1beta1.ProposalHandler).
		AddRoute(upgradetypes.RouterKey, upgrade.NewSoftwareUpgradeProposalHandler(&app.UpgradeKeeper)).
		AddRoute(ibcclienttypes.RouterKey, ibcclient.NewClientProposalHandler(app.IBCKeeper.ClientKeeper)).
		// ERC-20 route
		AddRoute(erc20types.RouterKey, erc20.NewErc20ProposalHandler(&app.Erc20Keeper))
```

## Parameter Subspace

To add the ERC-20 module’s parameters into the parameter keeper, it’s required to initially the corresponding subspace.

```go
func initParamsKeeper(
	appCodec codec.BinaryCodec, legacyAmino *codec.LegacyAmino, key, tkey storetypes.StoreKey,
) paramskeeper.Keeper {
	paramsKeeper := paramskeeper.NewKeeper(appCodec, legacyAmino, key, tkey)

	// ...
	
	// Cosmos EVM subspaces
	paramsKeeper.Subspace(evmtypes.ModuleName).WithKeyTable(evmtypes.ParamKeyTable()) //nolint: staticcheck
	paramsKeeper.Subspace(feemarkettypes.ModuleName).WithKeyTable(feemarkettypes.ParamKeyTable())
	paramsKeeper.Subspace(erc20types.ModuleName)
	
	return paramsKeeper
}
```

## Store Keys

It’s required to add the corresponding ERC-20 module’s store key to the slice of key-value store keys.

```go
import (
	// ...
	
	erc20types "github.com/cosmos/evm/v19/x/erc20/types"
	evmtypes "github.com/cosmos/evm/v19/x/evm/types"
	feemarkettypes "github.com/cosmos/evm/v19/x/feemarket/types"
)

keys := sdk.NewKVStoreKeys(
	// ...
	
	// Cosmos EVM store keys
	evmtypes.StoreKey,
	feemarkettypes.StoreKey,
	erc20types.StoreKey,
)
```