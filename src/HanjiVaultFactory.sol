// SPDX-License-Identifier: BUSL-1.1
// Hanji Protocol. On-chain limit order book exchange
// (c) Long Gamma Labs, 2023.
pragma solidity ^0.8.26;


import {HanjiProxy} from "./HanjiProxy.sol";
import {HanjiVault} from "./HanjiVault.sol";


/// @title Vault Factory for Hanji Protocol
/// @dev This contract is responsible for creating HanjiVault instances.
contract HanjiVaultFactory {
    /// @dev An instance of HanjiVault
    HanjiVault immutable public vaultImplementation;

    /// @dev Constructor for HanjiVaultFactory.
    constructor() {
        vaultImplementation = new HanjiVault();
    }

    /// @dev An event that is emitted when a HanjiVault is created.
    event HanjiVaultCreated(
        address indexed creator,
        address vault,
        address lob,
        string name,
        string symbol,
        address administrator,
        address marketMaker,
        address liquidityInitializer,
        address pauser,
        uint256 penalty,
        address pythContractAddress,
        bytes32 ethPriceFeedId
    );

    /// @dev Creates a HanjiVault.
    /// @return The address of the created HanjiVault.
    function createHanjiVault(
        address lob,
        address helper,
        string memory name,
        string memory symbol,
        address administrator,
        address marketMaker,
        address liquidityInitializer,
        address pauser,
        uint256 penalty,
        address pythContractAddress,
        bytes32 ethPriceFeedId
    ) external returns (address) {
        bytes memory initializeCallData = abi.encodeWithSignature(
            "initialize(address,address,string,string,address,address,address,address,uint256,address,bytes32)",
            lob,
            helper,
            name,
            symbol,
            administrator,
            marketMaker,
            liquidityInitializer,
            pauser,
            penalty,
            pythContractAddress,
            ethPriceFeedId
        );

        HanjiProxy vaultProxy = new HanjiProxy(
            address(vaultImplementation),
            initializeCallData
        );

        emit HanjiVaultCreated(
            msg.sender,
            address(vaultProxy),
            lob,
            name,
            symbol,
            administrator,
            marketMaker,
            liquidityInitializer,
            pauser,
            penalty,
            pythContractAddress,
            ethPriceFeedId
        );

        return address(vaultProxy);
    }
}
