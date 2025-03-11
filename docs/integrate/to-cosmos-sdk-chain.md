---
sidebar_position: 1
---

# Integrate into a Cosmos SDK Chain

This guide will help you integrate onto a Cosmos SDK - based chain.


## ☑️ Prerequisites

We recommend to align the major dependencies with the desired version of Cosmos EVM that should be integrated. The main dependencies that should have the required version before integrating Cosmos EVM are:

<details>
	<summary>Click to expand</summary>

- **Cosmos SDK** (check the used version of [Cosmos EVM fork](https://github.com/cosmos/cosmos-sdk/tree/state-copy-fork))
- **IBC-Go**
- (if applicable) **Go-Ethereum** (check the used version of [Cosmos EVM fork](https://github.com/cosmos/go-ethereum))

> *⚠️ If there are breaking changes introduced we strongly suggest to run a corresponding chain upgrade to include these versions before working on the Cosmos EVM integration.*

</details>

---

## 🧩 Integration

Integration of Cosmos EVM is divided on Module Imports, Application Wiring, Ante Handlers, Integrating The RPC Server, followed by base configurations.

---

## 📲 Module Imports

To start off, the necessary module imports need to be added to the `go.mod` file:

<details>
	<summary>Click to expand</summary>

- **Cosmos EVM**
    
    Add the corresponding module import for the desired version of Cosmos EVM to the go module file.
    
    ```bash
    go get github.com/cosmos/cosmos-evm/v19.1.0
    #                              ^ --- adjust version to desired one
    ```
    
- **Cosmos SDK**
    
    Add a replace directive to the corresponding release tag on the Cosmos EVM fork of the Cosmos-SDK.
    
    | **Supported SDK Version** | **Cosmos EVM Version** | **EVM Fork** |
    | --- | --- | --- |
    | v0.47.8 | v19.1.0 | v0.47.8-cosmos-evm.2 |
    | v0.50.7 | (not yet released) | v0.50.7-cosmos-evm |
    
    ```bash
    go mod edit --replace \
    github.com/cosmos/cosmos-sdk=github.com/cosmos/cosmos-sdk@vY
    #                       adjust version to desired one --- ^
    ```
    
- **Go-Ethereum**
    
    
    Add a replace directive to the corresponding tag on Cosmos EVM's Go-Ethereum fork.
    
    | **Cosmos EVM Version** | **Go-Ethereum Version** | **Cosmos EVM Fork** |
    | --- | --- | --- |
    | v18.1.0 | v1.10.26 | v1.10.26-cosmos-evm |
    
    ```bash
    go mod edit --replace \
    github.com/ethereum/go-ethereum=github.com/cosmos/go-ethereum@vZ
    #                           adjust version to desired one --- ^
    ```

</details>

## 🛠️ BaseApp Options

The base application is inherited from the Cosmos SDK stack. It can be adjusted to the respective needs of the implemented chain.

<details>
	<summary>Click to expand</summary>

For the integration of the Cosmos EVM solution, we currently require using a `NoOpMempool` for the application specific mempool. For more information on this, refer to the [corresponding Cosmos documentation](https://docs.cosmos.network/main/build/building-apps/app-mempool#no-op-mempool).

*Tell me why!*
    
    The specific reason for this is that the provided mempool implementations of the Cosmos SDK require a non-empty signers field of the handled `sdk.Msg`. However, the Ethereum transactions are signed in a different way compared to standard Cosmos messages and their signature verification is happening only at the ante handler level. Hence, inside of the mempool, these messages are “unsigned” from the Cosmos perspective and other implementations than the `NoOpMempool` will fail to handle them.
    
    A potential error message that can occur is that for every EVM transaction, the resulting log will show `failed to remove tx from mempool: tx must at least have one signer`.
    

That being said, we recommend the following options for the base application:

```go
baseAppOptions = append(baseAppOptions, func(app *baseapp.BaseApp) {
	mempool := mempool.NoOpMempool{}
	app.SetMempool(mempool)
	handler := baseapp.NewDefaultProposalHandler(mempool, app)
	app.SetPrepareProposal(handler.PrepareProposalHandler())
	app.SetProcessProposal(handler.ProcessProposalHandler())
})
```

</details>

---

## 🔌 Application Wiring

As the next step to integrate the EVM OS, it is required to add the necessary application wiring within the chains’ `app.go`.

<details>
	<summary>Click to expand</summary>

The EVM can be added to your application, by adding the necessary logic to add the `x/evm` module. Note, that this is wired together with the EIP-1559 feemarket solution that lives in the `x/feemarket` module.

**Basic Wiring**

Both modules have to be wired up as any other Cosmos SDK module, which means adding it to the following pieces of core architecture:

- List of entities to add to in app wiring
    - [Basic Manager](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L239-L240)
    - [Module Manager](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L648-L649)
    - [Begin Blockers Order](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L672-L673)
    - [End Blockers Order](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L700-L701)
    - [Init Genesis Order](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L743-L747)
    - [Account Permissions](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L258)
    - [Store Keys](https://github.com/evmos/evmos/blob/main/app/keys.go#L52)
    - [Transient Keys](https://github.com/evmos/evmos/blob/main/app/keys.go#L61)
    - [Parameter Subspaces](https://github.com/evmos/evmos/blob/13f5d57a967abb3ffdc314ca150a615b31f5ffe7/app/app.go#L1143-L1144)

**Keeper Instantiation**

The module keeper fields will have to be added to the main application struct to enable usage throughout the codebase.

```go
import (
	// ...
	evmkeeper "github.com/evmos/evmos/v19/x/evm/keeper"
	feemarketkeeper "github.com/evmos/evmos/v19/x/feemarket/keeper"
)

type ExampleApp struct {
	*baseapp.BaseApp
	
	// ...
	EVMKeeper       *evmkeeper.Keeper
	FeeMarketKeeper feemarketkeeper.Keeper
}
```

Instantiation of the keepers is straightforward for the feemarket module but requires additional setup for the EVM module, as the map of available precompiled smart contracts is defined at the application instantiation level.

Precompiled smart contracts have originally been designed to enable running computation-heavy operations on-chain without the need to have it run by the Solidity interpreter. We have adjusted this implementation to enable our [EVM Extensions](https://evm.cosmos.network/develop/smart-contracts/evm-extensions), which make it possible for smart contracts to interact with Cosmos-native functionality of a chain.

In case, that only the default Ethereum behavior is desired, the instantiation can point to Ethereum’s map of precompiles.

```go
	// app/app.go
	import (
		// ...
		"github.com/evmos/evmos/v19/x/evm/core/vm"
		evmkeeper "github.com/evmos/evmos/v19/x/evm/keeper"
		evmtypes "github.com/evmos/evmos/v19/x/evm/types"
		feemarketkeeper "github.com/evmos/evmos/v19/x/feemarket/keeper"
		feemarkettypes "github.com/evmos/evmos/v19/x/feemarket/types"
		srvflags "github.com/cosmos/cosmos-evm/server/flags"
	)
	
	// Cosmos EVM keepers
	app.FeeMarketKeeper = feemarketkeeper.NewKeeper(
		appCodec, authtypes.NewModuleAddress(govtypes.ModuleName),
		keys[feemarkettypes.StoreKey],
		tkeys[feemarkettypes.TransientKey],
		app.GetSubspace(feemarkettypes.ModuleName),
	)

	tracer := cast.ToString(appOpts.Get(srvflags.EVMTracer))

	app.EVMKeeper = evmkeeper.NewKeeper(
		appCodec, keys[evmtypes.StoreKey], tkeys[evmtypes.TransientKey],
		authtypes.NewModuleAddress(govtypes.ModuleName),
		app.AccountKeeper, app.BankKeeper, app.StakingKeeper, app.FeeMarketKeeper,
		nil, // NOTE: we're passing nil as the ERC-20 keeper until integrating that module
		tracer, app.GetSubspace(evmtypes.ModuleName),
	)
	
	// NOTE: we are just adding the default Ethereum precompiles here.
	// Additional precompiles could be added if desired.
	app.EVMKeeper.WithStaticPrecompiles(
		vm.PrecompiledContractsBerlin,
	)
```

It is also suggested to include the address of the available EVM extensions, no matter if they are *active* or not, in the list of blocked addresses when instantiating the bank keeper.

The reference implementation for a method that returns the map of blocked addresses can be found here: https://github.com/evmos/evmos/blob/b36241652b57347ed5d83c5f6925e2b371996aec/app/app.go#L929-L959.

```go
// BlockedAddrs returns all the addresses that are not
// allowed to receive external tokens.
//
// These include:
//   - module accounts
//   - Ethereum's native precompiles
//   - the static precompiled contracts available through Cosmos EVM
func (app *ExampleApp) BlockedAddrs() map[string]bool {
	blockedAddrs := make(map[string]bool)

	accs := make([]string, 0, len(maccPerms))
	for k := range maccPerms {
		accs = append(accs, k)
	}
	sort.Strings(accs)

	for _, acc := range accs {
		blockedAddrs[authtypes.NewModuleAddress(acc).String()] = true
	}

	blockedPrecompilesHex := evmtypes.AvailableStaticPrecompiles
	for _, addr := range vm.PrecompiledAddressesBerlin {
		blockedPrecompilesHex = append(blockedPrecompilesHex, addr.Hex())
	}

	for _, precompile := range blockedPrecompilesHex {
		blockedAddrs[utils.EthHexToCosmosAddr(precompile).String()] = true
	}

	return blockedAddrs
}
```

</details>

---

## 🤝 Ante Handlers

Cosmos EVM enables developers to build chains that handle Ethereum style transactions as well as standard Cosmos SDK transactions. This is accounted for by introducing separate ante handlers these transaction types and routing the transaction handling accordingly.

<details>
	<summary>Click to expand</summary>

This is required to account for the different approaches to e.g. handling gas payments for the corresponding transactions or the different signature verifications.

Specifically, our implementation relies on the corresponding signature verification handlers ([EVM](https://github.com/evmos/evmos/blob/main/app/ante/evm/05_signature_verification.go#L58), [Cosmos](https://github.com/evmos/evmos/blob/main/app/ante/sigverify.go#L37) & [EIP-712 Cosmos Messages](https://github.com/evmos/evmos/blob/main/app/ante/cosmos/eip712.go#L61)) and the custom logic to [deduct fees](https://github.com/evmos/evmos/blob/main/app/ante/evm/fee_checker.go#L20-L41), which is dependent on our implementation of the EIP-1559 and will have to be implemented on the customer chains.

### 🔹**EVM Ante Handler**

In order to evaluate the validity of EVM transactions, we have implemented all checks within a “mono” ante handler as opposed to the more common concept of chaining multiple individual ante decorators as commonly done in the Cosmos SDK.

This implementation helps reduce the overhead of repeated queries and type conversions of necessary input data for the given checks. Therefore, we encourage partner chains to also adopt this workflow and build a singular ante handler for EVM transactions based on the helper methods that we are providing in our code base.

### ⚛️ **Cosmos Ante Handler**

The standard Cosmos SDK messages are handled with common ante decorators used by many chains. We do extend the standard ante handling flow by rejecting any transactions that contain `MsgEthereumTx` in them ([here](https://github.com/evmos/evmos/blob/main/app/ante/cosmos.go#L19)) and also limit operations that can be delegated to other accounts ([here](https://github.com/evmos/evmos/blob/main/app/ante/cosmos.go#L20-L23)).

Based on the EIP-1559 we have implemented a feemarket solution that dynamically adjusted the required gas for transactions based on the network load. This is checked by a corresponding ante handler for Cosmos transactions too ([here](https://github.com/evmos/evmos/blob/main/app/ante/cosmos.go#L29)).

This is also accompanied by another ante decorator ([here](https://github.com/evmos/evmos/blob/main/app/ante/cosmos.go#L39)), which checks the gas wanted amount of the current block to add into the base fee calculations of the feemarket logic.

- **Links to reference implementation**
    - Inclusion in application instantiation: https://github.com/evmos/evmos/blob/9606a4176136285b9993f572307a828528c4748b/app/app.go#L838
    - Application method definition: https://github.com/evmos/evmos/blob/9606a4176136285b9993f572307a828528c4748b/app/app.go#L898-L919
    - Main handler logic which divides EVM and Cosmos transactions: https://github.com/evmos/evmos/blob/main/app/ante/ante.go#L16-L54
        - Mono handler for EVM transactions: https://github.com/evmos/evmos/blob/main/app/ante/evm/mono.go#L108-L313
        - Chained handler for Cosmos transactions: https://github.com/evmos/evmos/blob/main/app/ante/cosmos.go#L18-L40

</details>

---

## 📡 Integrating The RPC Server

The JSON-RPC server is required for communication with the EVM backend and tooling. Its implementation lives in the server package and it is being set up when running the appd start command.
Integrating this into the codebase of an existing Cosmos SDK-based blockchain can be done by replacing the use of the Cosmos SDK server’s AddCommands method with Cosmos EVM's equivalent of this, which is extended to start the JSON-RPC server as well.

<details>
	<summary>Click to expand</summary>

The JSON-RPC implementation requires some configuration settings to be present, which is reflected in an extension of the app configuration on our end.
Extended App Configuration
type CustomAppConfig struct {
	// ...
	
	// Necessary fields:
	EVM     EVMConfig     `mapstructure:"evm"`
	JSONRPC JSONRPCConfig `mapstructure:"json-rpc"`
	TLS     TLSConfig     `mapstructure:"tls"`
}
​
In the standard approach to building a Cosmos SDK-based chain, this configuration will have to be instantiated within a initAppConfig method or similar. This has to reflect the new fields as well.

```go
import (
	// ...
	serverconfig "github.com/cosmos/cosmos-sdk/server/config"
	cevmserverconfig "github.com/cosmos/cosmos-evm/server/config"
)

func initAppConfig() (string, interface{}) {
	type CustomAppConfig struct {
		serverconfig.Config

		// Cosmos EVM configuration
		EVM     cevmserverconfig.EVMConfig
		JSONRPC cevmserverconfig.JSONRPCConfig
		TLS     cevmserverconfig.TLSConfig
	}

	srvCfg := serverconfig.DefaultConfig()
	
	// ...

	customAppConfig := CustomAppConfig{
		Config:  *srvCfg,
		// Cosmos EVM configuration
		EVM:     *cevmserverconfig.DefaultEVMConfig(),
		JSONRPC: *cevmserverconfig.DefaultJSONRPCConfig(),
		TLS:     *cevmserverconfig.DefaultTLSConfig(),
	}

	customAppTemplate := serverconfig.DefaultConfigTemplate +
		// Cosmos EVM configuration
		cevmserverconfig.DefaultEVMConfigTemplate

	return customAppTemplate, customAppConfig
}
```

</details>

---

## ⛓️ **Adopting An EIP-155 Compliant Chain ID**

Using Bech32 formatted addresses with the chain-specific address prefix has the advantage that replay protection is basically inherently included in Cosmos transactions.

<details>
	<summary>Click to expand</summary>

On the EVM, sender and recipient addresses are however included in the chain-agnostic Hex representation. This means that replay-protection becomes relevant when adding the EVM to the chains.

It is common in the EVM ecosystem to check https://chainid.network/ to pick a suitable unique chain ID and add a corresponding entry to the [Ethereum networks list](https://github.com/ethereum-lists/chains/tree/master/_data/chains) to avoid duplication between chains. Another relevant resource to add the chain ID to is https://github.com/DefiLlama/chainlist/blob/d0d752221c76f5dcc7109bbe5d1d0dc5ecb319f4/constants/chainIds.json#L85.

The expected chain ID format would be `chainname_XXXXX-Y`, where X is the EIP-155 chain ID and Y the increment of chain IDs after e.g. a hard fork has happened. This is enforced in the EVM types in the evmos codebase: https://github.com/evmos/evmos/blob/dc3b28d8bd000b72c9483acc051cf74e43e8b043/types/chain_id.go#L15-L25.

</details>

---

## 🔐 Adopting The `ethsecp256k1` Signing Algorithm

To enable native EVM support, Cosmos EVM relies on a different signing algorithm compared to the standard Cosmos chains. More detailed information about this can be found in the following dropdown:

<details>
	<summary>Click to expand</summary>

- ⚠️ **A note on signing algorithms**
    
    Cosmos and EVM wallets both use the same elliptic curve - `secp256k1`. However, there are two primary compatibility issues. According to the BIP-44 spec, the HD Path has different components: `m / purpose' / coin_type' / account' / change / address_index`. Cosmos chains and EVMs use different HD Path coin type values to derivate the public key from the private key. While Cosmos uses `118`, EVMs use `60`. 
    
    Also, their address derivation scheme, i.e. how the address is created from the public key, differs. EVM uses the Keccak hashing algorithm and trims the resulting hash to the first 20 bytes, while Cosmos uses sha256. This difference is independent of the resulting address representation in either Bech32 or Hex representation.
    
    For the Cosmos EVM main chain, the configuration when integrating with Cosmos wallet partners like Leap or Keplr is reflecting this different coin type and is using `60` instead.
    

The short of it is, that it is required to add support for this signing algorithm by importing the Cosmos EVM key types and registering the corresponding interfaces in the used `params.EncodingConfig`. Note, that these functions already include the `cosmos-sdk/std` registrations, so they can be discarded and will other raise an error of duplicate registrations.

```go
// cmd/root.go
import (
	// ...
	cvmencoding "https://github.com/cosmos/cosmos-evm/encoding"
)

func NewRootCmd() *cobra.Command {
	// Register the codecs including the eth_secp256k1 signing algorithm
	encodingConfig := cvm.MakeConfig(app.ModuleBasics)
	
	// ...
}
```

```go
// app/app.go
import (
	// ...
	cvm "https://github.com/evmos/encoding"
)

func NewExampleApp(
	// ...
) *ExampleApp {
	encodingConfig := cvm.MakeConfig(app.ModuleBasics)
	
	// ...
)
```

**Signature Verification Gas Consumer**

The default signature verification ante handler is included in the `DefaultSigVerificationGasConsumer`. This method handles signatures for the default key types that are present in the Cosmos SDK.

Depending on the desired supported keys, this method has to be extended/adjusted to support the `eth_secp256k1` algorithm.

In the case of the Evmos chain, this algorithm is favored over the default `secp256k1` algorithm found in the Cosmos SDK, which is why it is replacing the latter one in its reference implementation of this ante decorator:

https://github.com/evmos/evmos/blob/v19.2.0/app/ante/sigverify.go#L37-L63

</details>

---

## 💱 **Adjusting The Base Units Of The Network Denomination**

As opposed to Cosmos chains that use micro-units, the Ethereum based chains opt for a base unit of 18 decimals (i.e. atto units). At the current moment, the evmOS codebase is not natively catered to work with micro units, so we would suggest where possible to adjust the chain IDs base denomination to be an atto unit instead.

<details>
	<summary>Click to expand</summary>

- **Possible Solution**
    
    Kava has implemented a solution that is making use of both, i.e. `ukava` and `akava`. This might also be a suitable solution for any evmOS partners but it could cause unnecessary overhead and complication when integrating evmOS into the codebase.
    
    **Implementation Details**
    
    The Kava codebase has a dedicated [EvmBankKeeper](https://github.com/Kava-Labs/kava/blob/346f4be683b6f967ade50794c8ee0577681784be/x/evmutil/keeper/bank_keeper.go), which is keeping track of balances in `akava` (EVM denom) and `ukava` (Cosmos denom).
    
    This design holds two separate balances of these denominations and converts them between each other if necessary. An example of how this adds overhead can be seen in the [GetBalance](https://github.com/Kava-Labs/kava/blob/346f4be683b6f967ade50794c8ee0577681784be/x/evmutil/keeper/bank_keeper.go#L48-L59) method, where the total spendable balance is derived of adding the `akava` and `ukava` balances.

</details>

---

## 🆙 Chain Upgrade & **Migrations**

Naturally when adding new modules to the chain there will be a migration necessary in terms of initialising the new parameters during the upgrade as well as adding the new key value stores for the added modules. This will require a coordinated chain upgrade as detailed e.g. in [our upgrades documentation](https://evm.cosmos.network/validate/upgrades).

Check the [EVM](https://github.com/evmos/evmos/blob/ceae6608955f1279546066dad1a53a53593790cd/proto/ethermint/evm/v1/evm.proto#L11-L34) and [feemarket](https://github.com/evmos/evmos/blob/ceae6608955f1279546066dad1a53a53593790cd/proto/ethermint/feemarket/v1/feemarket.proto#L12-L44) module parameters for an overview of the fields to set with the desired values.


---

## 👨‍💻 CLI Configuration

There is a selection of different CLI commands that are unique to the Cosmos EVM codebase, which can be included in any partner’s application binaries. The most useful ones are listed below:

<details>
	<summary>Click to expand</summary>

- `appd keys` is extended by utilities to import and export Ethereum native hexadecimal private keys: https://github.com/evmos/evmos/blob/v18.1.0/client/keys.go#L19-L83.
    
    If this should be supported, it is required to also adjust the client context and initialize the context with the corresponding keyring options:
    
    ```go
    initClientCtx := client.Context{}.
    	// ...
    	WithKeyringOptions(evmoskeyring.Option())
    ```
    
- `appd debug` and its subcommands provide useful utilities for address conversion and other debugging / development related purposes: https://github.com/evmos/evmos/blob/v18.1.0/client/debug/debug.go#L28-L42.
- `appd block` exports the last block from the database of the node (instead of querying from network): https://github.com/evmos/evmos/blob/v18.1.0/client/block/block.go#L15-L72.
- `appd add-genesis-account` can be used as a reference for add new accounts to a given genesis JSON file: https://github.com/evmos/evmos/blob/v18.1.0/cmd/evmosd/genaccounts.go#L39-L285. Note, that this usually is reimplemented for every chain’s specific use-case.

</details>

---

## 🔏 EIP-712 Encoding

To support the encoding of messages in EIP-712 compliant fashion, it’s required to register the corresponding implementation with the existing encoding configuration.

<details>
	<summary>Click to expand</summary>

To do so, include the following command in the initialization of the root command, as well as the application itself (or just add to your custom implementation of `MakeConfig`).

- Example wiring in root command
    
    ```go
    // cmd/root.go
    import (
    	// ...
    	cevmencoding "https://github.com/cosmos/cosmos-evm/v18/encoding"
    	cevmeip712 "github.com/cosmos/cosmos/evm/ethereum/eip712"
    )
    
    func NewRootCmd() *cobra.Command {
    	encodingConfig := cevmencoding.MakeConfig(()
    	cevmeip712.SetEncodingConfig(
    		encodingConfig.Amino,
    		encodingConfig.InterfaceRegistry,
    	)
    
    	// ...
    )
    ```
    
- Example wiring in app.go
    
    ```go
    // app/app.go
    import (
    	// ...
    	cevmencoding "https://github.com/evmos/evmos/v18/encoding"
    	cevmeip712 "github.com/cosmos/cosmos-evm/ethereum/eip712"
    )
    
    func NewExampleApp(
    	// ...
    ) *ExampleApp {
    	encodingConfig := cevmencoding.MakeConfig(app.ModuleBasics)
    	cevmeip712.SetEncodingConfig(
    		encodingConfig.Amino,
    		encodingConfig.InterfaceRegistry,
    	)
    	
    	// ...
    )
    ```

</details>

---

## 💽 Ledger Integration

Cosmos EVM enables using Ledger’s Ethereum app to send EVM transactions with the corresponding hardware wallets.

<details>
	<summary>Click to expand</summary>

To enable this, it’s required to add the following context options to the client context:

https://github.com/cosmos/cosmos/evm/blob/bf18711/example_chain/osd/cmd/root.go#L77-L89

```jsx
initClientCtx := client.Context{}.
	// ...
	WithLedgerHasProtobuf(true) // support for Ledger
```

Additionally, the keyring options should be adjusted to defer the Ledger support from the default Cosmos SDK application to the Ethereum one:

https://github.com/cosmos/cosmos-evm/blob/cff4d2a/crypto/keyring/options.go#L16-L47

This has to replicated / imported into any customer repositories that desire to exhibit the same behavior.

</details>

---

# 🔭 What’s Next?

After onboarding to Cosmos EVM your chain now has a proven EVM implementation available for smart contract developers to build on top of and EVM wallet users to tap into natively!

This amazing new experience can be improved even more:

- [Unify ERC-20s and Cosmos Coins](https://www.notion.so/Unify-ERC-20s-and-Cosmos-Coins-431b2ea75c7e486b9ce9a127f449897b?pvs=21) with the *Single Token Representation v2*.
- [Enable EVM Extensions](https://www.notion.so/Enable-EVM-Extensions-81f1186d25ec4c7a8fd951e644c6802c?pvs=21) or add your own custom implementations, that let smart contract developers and EVM users access your Cosmos SDK module functionality! More information can be found here: https://evm.cosmos.network/develop/smart-contracts/evm-extensions.
- Add more functionality from the https://evm.cosmos.network/protocol/modules.