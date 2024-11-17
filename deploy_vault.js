// SPDX-License-Identifier: BUSL-1.1
// Hanji Protocol. On-chain limit order book exchange
// (c) Long Gamma Labs, 2023.

const ethers = require("ethers");
const vaultFactoryInfo = require("./out/HanjiVaultFactory.sol/HanjiVaultFactory.json");
const helperInfo = require("./out/HanjiHelper.sol/HanjiHelper.json");

// Replace with your RPC URL
const rpcUrl = "https://node.ghostnet.etherlink.com"; // Update to your RPC URL if different

// Replace with your private key
const privateKey = "";

// Replace with the address of the HanjiLOB contract for WETH/USDC
const hanjiLobAddress = "0x811b18B8957a4c275948353aEFc6C3E9d62a8680";

// Addresses for roles (replace with actual addresses)
const administrator = "0x8060a67de3D4A9E28B9CcBcD9dd4A80f1724273e";
const marketMaker = "0x8060a67de3D4A9E28B9CcBcD9dd4A80f1724273e";
const liquidityInitializer = "0x8060a67de3D4A9E28B9CcBcD9dd4A80f1724273e";
const pauser = "0x8060a67de3D4A9E28B9CcBcD9dd4A80f1724273e";

// Pyth network details (replace with actual testnet addresses and IDs)
const pythContractAddress = "0x2880aB155794e7179c9eE2e38200202908C17B43";
const ethPriceFeedId = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
//const ethPriceFeedId = ethers.utils.hexlify('0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace');

// Create a provider and wallet
const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);

async function main() {
  // Deploy the HanjiHelper contract (if not already deployed)
  console.log("Deploying Helper contract...");
  const helperAbi = helperInfo.abi;
  const helperBytecode = helperInfo.bytecode;
  const helperFactory = new ethers.ContractFactory(helperAbi, helperBytecode, wallet);
  const helper = await helperFactory.deploy();
  await helper.deploymentTransaction().wait();
  const helperAddress = helper.target;
  console.log(`Helper deployed at: ${helperAddress}`);

  // Deploy the HanjiVaultFactory contract
  console.log("Deploying HanjiVaultFactory contract...");
  const vaultFactoryAbi = vaultFactoryInfo.abi;
  const vaultFactoryBytecode = vaultFactoryInfo.bytecode;
  const vaultFactoryFactory = new ethers.ContractFactory(vaultFactoryAbi, vaultFactoryBytecode, wallet);
  const vaultFactory = await vaultFactoryFactory.deploy();
  await vaultFactory.deploymentTransaction().wait();
  const vaultFactoryAddress = vaultFactory.target;
  console.log(`HanjiVaultFactory deployed at: ${vaultFactoryAddress}`);

  // Now create HanjiVault using the factory
  console.log("Creating HanjiVault contract...");
  const vaultTx = await vaultFactory.createHanjiVault(
    hanjiLobAddress,
    helperAddress,
    "HanjiVault",            // Name of the vault token
    "HJV",                   // Symbol of the vault token
    administrator,
    marketMaker,
    liquidityInitializer,
    pauser,
    1,                       // Penalty (from deploy.js script)
    pythContractAddress,
    ethPriceFeedId
  );
  const vaultReceipt = await vaultTx.wait();
  const vaultEvent = vaultReceipt.logs.find((log) => log.fragment?.name === "HanjiVaultCreated");

  if (!vaultEvent) {
    console.error("HanjiVaultCreated event not found in transaction logs");
    process.exit(1);
  }

  const vaultAddress = vaultEvent.args[1];
  console.log(`HanjiVault deployed at: ${vaultAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });