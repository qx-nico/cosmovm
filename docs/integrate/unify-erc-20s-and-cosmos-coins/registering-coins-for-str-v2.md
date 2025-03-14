---
sidebar_position: 4
---

# Registering Coins For STR v2

To enable existing Cosmos coins to be used with STR v2, it is required to register them as token pairs in the ERC-20 keeper and to add the corresponding smart contract address to the slice of active dynamic precompiles in the ERC-20 module parameters.

*Dynamic precompiles* are those that are deployed interactively depending on the network state. This discerns them from the *static* precompiles, which are not dependent on the network state but rather always instantiated (e.g. the staking precompile).

There are two required parts to enable the transaction flow involving STR v2—integrating the corresponding IBC middleware as well as running the required upgrade logic, that is either introducing the ERC-20 module to the chain or migrating the existing token pairs that may already be present on a given chain.

## 📦 Integrating The IBC Middleware

To reduce the manual labor required to handle STR v2 and to enable an autonomous flow of data, we have introduced an IBC middleware, that wraps the transfer module to provide two distinct use cases when it comes to the handling of ERC-20 tokens and Cosmos coins:

1. Incoming IBC coins, that are not yet registered as a token pair with the ERC-20 module are automatically added as such. Additionally, there is a new dynamic precompiles created and added to the parameters in the ERC-20 module for the STR v2 to immediately work without further configuration.
    
    This enables a smooth user experience, where new IBC coins are directly useable in both Cosmos and EVM transactions, while this can be controlled afterwards using governance in case a harmful coin should be exempted from STR v2.
    
2. Native ERC-20 tokens, that are registered as a token pair in the module, are automatically converted to Cosmos coins upon sending them in IBC transfers. This eliminates the need to unwrap them manually and is part of our previous model to improve handling between the two token representations.
    
    There is more detailed information in ❓What About Existing Native ERC-20s  as to why these tokens are not supported by STR v2 yet, in the index of this file.
    

To enable the IBC middleware, the following additions are required in any Cosmos EVM Chain:

### Transfer Keeper Instantiation
    
    The transfer keeper have the ERC-20 module keeper passed to it.
    
    ```go
    	app.TransferKeeper = transferkeeper.NewKeeper(
    		appCodec, keys[ibctransfertypes.StoreKey], app.GetSubspace(ibctransfertypes.ModuleName),
    		app.IBCKeeper.ChannelKeeper,
    		app.IBCKeeper.ChannelKeeper, &app.IBCKeeper.PortKeeper,
    		app.AccountKeeper, app.BankKeeper, scopedTransferKeeper,
    		app.Erc20Keeper, // Add ERC-20 Keeper for ERC-20 transfers
    	)
    ```
    
### Transfer Stack
    
    The application wiring needs to be extended to introduce the ERC-20 IBC middleware to the transfer stack.
    
    ```go
    	/*
    		Create Transfer Stack
    
    		transfer stack contains:
    			- ERC-20 Middleware
    			- IBC Transfer
    
    		SendPacket, since it is originating from the application to core IBC:
    		 	transferKeeper.SendPacket -> erc20.SendPacket -> channel.SendPacket
    
    		RecvPacket, message that originates from core IBC and goes down to app, the flow is the other way
    			channel.RecvPacket -> erc20.OnRecvPacket -> transfer.OnRecvPacket
    	*/
    
    	// create IBC module from top to bottom of stack
    	var transferStack porttypes.IBCModule
    
    	transferStack = transfer.NewIBCModule(app.TransferKeeper)
    	transferStack = erc20.NewIBCMiddleware(app.Erc20Keeper, transferStack)
    ```
    

## 🆙 Upgrade Logic

In case the ERC-20 module has already been integrated in the given chain it will be required to run a corresponding migration to add the existing token pairs for native Cosmos coins to the list of supported coins for STR v2.

### Migration of existing Cosmos token pairs
    
    The required migration for existing coins was done during the Evmos v19.0.0 chain upgrade and the reference implementation can be found here: https://github.com/cosmos/evm/blob/v19.0.0/app/upgrades/v19/upgrades.go#L37-L75.
    
    In short, the required steps are:
    
    1. Running the module migrations to introduce the new parameters.
    2. Create token pairs for the native chain’s denomination(s) and get the list of existing token pairs that are native Cosmos/IBC coins.
    3. Convert all existing assets that are currently stored in their ERC-20 representation back to Cosmos coins.
    4. Register dynamic precompiles for each of the affected token pairs
    5. Delete the smart contract at the original Hex address, which will now be replaced with the corresponding precompile.

Alternatively, if the ERC-20 module is newly added to a given chain to enable this feature, the corresponding store upgrades will have to be conducted to add the ERC-20 module.

### Addition of ERC-20 store in upgrade handler
    
    The required store upgrades are defined here:
    
    ```go
    func (app *App) setupUpgradeHandlers() {
    	// ...
    	
    	upgradeInfo, err := app.UpgradeKeeper.ReadUpgradeInfoFromDisk()
    	if err != nil {
    		panic(fmt.Errorf("failed to read upgrade info from disk: %w", err))
    	}
    
    	if app.UpgradeKeeper.IsSkipHeight(upgradeInfo.Height) {
    		return
    	}
    
    	var storeUpgrades *storetypes.StoreUpgrades
    
    	switch upgradeInfo.Name {
    	case vX.UpgradeName:        // <-- adjust here for affected version
    		storeUpgrades = &storetypes.StoreUpgrades{
    			Added: []string{erc20types.ModuleName},
    		}
    	default:
    		// no-op
    	}
    
    	if storeUpgrades != nil {
    		// configure store loader that checks if
    		// version == upgradeHeight and applies store upgrades
    		app.SetStoreLoader(
    			upgradetypes.UpgradeStoreLoader(upgradeInfo.Height, storeUpgrades),
    		)
    	}
    }
    ```
    
### Register the chain’s native denomination as a token pair
    
    As described above, each supported native Cosmos coin requires a registered ERC-20 token pair to be enabled for use with STR v2.
    
    This naturally also goes for any Cosmos EVM chain’s native denomination. Hence, the upgrade that introduces the ERC-20 module to the chain should also register the native asset(s) as token pairs.
    
### Setting the defaults for the ERC-20 module parameters
    
    The ERC-20 module has a set of module parameters, that need to be instantiated and provided with sensible defaults for the given Cosmos EVM chain.
    
    To enable the functionality, the `enable_erc20` flag needs to be set to true. The `native_precompiles` holds an array of ERC-20 contract addresses for the chain’s native denomination(s), so if there was a corresponding smart contract deployed in the [previous described step](https://www.notion.so/Unify-ERC-20s-and-Cosmos-Coins-431b2ea75c7e486b9ce9a127f449897b?pvs=21) it should be added to this slice of strings.
    
    Finally, the `dynamic_precompiles` will be filled with the ERC-20 addresses of any IBC coins on chain. If there are existing Cosmos coins that should be converted, register them as an ERC-20 token pair during the upgrade and follow the approach described here: [**Migration of existing Cosmos token pairs**](https://www.notion.so/Migration-of-existing-Cosmos-token-pairs-dccbd2b13ed94483a35a65986119a61c?pvs=21) .