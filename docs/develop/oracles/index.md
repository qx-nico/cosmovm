# Oracles

An oracle is a piece of software that retrieves data from external sources and feeds it into smart contracts on the blockchain.
This enables smart contracts to respond to real-world events, trigger automated actions, and execute their intended functions.
These oracles serve as a bridge between the decentralized,
trustless environment of blockchain and the centralized, traditional internet.

Oracles can be added on either the EVM level or at the core protocol level.
EVM-based oracles can just be deployed as a smart contract.
Protocol level oracles require integration into the binary of a Cosmos EVM-based chain.

## How do Oracles work?

``` sql
   +------------+         +------------+         +-------------+
   | External   |         |   Oracle   |         |  Smart      |
   | Data Source|         | Service    |         | Contract    |
   +------------+         +------------+         +-------------+
        |                       |                       |
        |  API Call             |                       |
        |---------------------> |                       |
        |                       |    Retrieve External  |
        |                       |    Data via API Call  |
        |                       |---------------------->|
        |                       |                       |
        |                       |    Use External Data  |
        |                       |    in Smart Contract  |
        |                       |<----------------------|
        |                       |                       |
        |                       |    Return Result to   |
        |                       |    Smart Contract     |
        |                       |<----------------------|
        |                       |                       |

```

In this diagram:

* External Data Source refers to a source of data outside the blockchain network,
such as a stock market, weather service, or other external API.
* Oracle Service is a third-party service that acts as a bridge between the external data source and the smart contract.
It retrieves the data from the external source and provides it to the smart contract.
* Smart Contract is a self-executing contract that is deployed on the blockchain network.
It uses the data provided by the oracle to perform certain actions, such as releasing funds or triggering events.
* API Call refers to the request made by the smart contract to the oracle service, asking for the required external data.
* Retrieve External Data refers to the process of retrieving the requested data
from the external data source via the API call.
* Use External Data refers to the process of using the retrieved data in the smart contract to perform actions,
such as condition checking and state changes.
* Return Result refers to the process of returning the result of the action performed in the smart contract back to the oracle.