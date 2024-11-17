// init_liquidity_and_update_quotes.js

const ethers = require('ethers');
const axios = require('axios');
const {
  getPythContract,EvmPriceServiceConnection
} = require('@pythnetwork/pyth-evm-js');
const vaultInfo = require('./out/HanjiVault.sol/HanjiVault.json');
const erc20Info = require('./out/PlainToken.sol/PlainToken.json');

// Replace with your RPC URL
const rpcUrl = 'https://node.ghostnet.etherlink.com'; // Update if different

// Replace with your private keys
const privateKeyLiquidityInitializer = ''; // Private key of the liquidity initializer (Alice)
const privateKeyMarketMaker = ''; // Private key of the market maker

// Addresses (replace with actual deployed addresses)
const vaultAddress = '0xefdCe4E9E3299510Ef5Ce77e896128c38cfa9307'; // Address of the deployed HanjiVault contract
const tokenXAddress = '0x8DEF68408Bc96553003094180E5C90d9fe5b88C1'; // Address of WETH token used in the HanjiLOB contract
const tokenYAddress = '0x9626cC8790c547779551B5948029a4f646853F91'; // Address of USDC token used in the HanjiLOB contract

// Pyth network details (replace with actual testnet addresses and IDs)
const pythContractAddress = '0x2880aB155794e7179c9eE2e38200202908C17B43'; // Pyth contract address
const ethPriceFeedId = 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'; // ETH/USD Price Feed ID (without 0x prefix)

// Create a provider
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Create wallet instances
const liquidityInitializerWallet = new ethers.Wallet(privateKeyLiquidityInitializer, provider);
const marketMakerWallet = new ethers.Wallet(privateKeyMarketMaker, provider);

// Instantiate contracts
const vaultAbi = vaultInfo.abi;
const tokenAbi = erc20Info.abi;

const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, provider);
const vaultWithMarketMaker = vaultContract.connect(marketMakerWallet);

const tokenX = new ethers.Contract(tokenXAddress, tokenAbi, provider); // WETH
const tokenY = new ethers.Contract(tokenYAddress, tokenAbi, provider); // USDC
const tokenXWithLiquidityInitializer = tokenX.connect(liquidityInitializerWallet);
const tokenYWithLiquidityInitializer = tokenY.connect(liquidityInitializerWallet);

async function main() {
  // Set the amount to deposit
  const tokenXAmount = 1n * (10n ** 18n) / (10n ** 13n);  //ethers.parseUnits('1', 18); // Example WETH amount
  const tokenYAmount = 100000000n; //ethers.parseUnits('2000', 6); // Example USDC amount
  const tokenXAmountToApprove = 1000n * (10n ** 18n); //ethers.parseUnits('1', 18); // Example WETH amount
  const tokenYAmountToApprove = 1000000000n * 1000000n; //ethers.parseUnits('2000', 6); // Example USDC amount
  const minLpAmount = 0; // Minimum LP tokens expected

  // Step 1: Approve the vault to spend liquidity initializer's tokens
  console.log('Approving vault to spend tokens...');
  let tx;

  // Approve tokenX
  tx = await tokenXWithLiquidityInitializer.approve(vaultAddress, tokenXAmountToApprove);
  await tx.wait();

  // Approve tokenY
  tx = await tokenYWithLiquidityInitializer.approve(vaultAddress, tokenYAmountToApprove);
  await tx.wait();

  console.log('Approval transactions confirmed.');

  // Check allowances after approval
  const tokenXAllowance = await tokenXWithLiquidityInitializer.allowance(
    liquidityInitializerWallet.address,
    vaultAddress
  );
  const tokenYAllowance = await tokenYWithLiquidityInitializer.allowance(
    liquidityInitializerWallet.address,
    vaultAddress
  );
  console.log(`tokenX Allowance after approval: ${ethers.formatUnits(tokenXAllowance, 18)}`);
  console.log(`tokenY Allowance after approval: ${ethers.formatUnits(tokenYAllowance, 6)}`);

  // Check balances
  const tokenXBalance = await tokenXWithLiquidityInitializer.balanceOf(liquidityInitializerWallet.address);
  const tokenYBalance = await tokenYWithLiquidityInitializer.balanceOf(liquidityInitializerWallet.address);
  console.log(`tokenX Balance: ${ethers.formatUnits(tokenXBalance, 18)}`);
  console.log(`tokenY Balance: ${ethers.formatUnits(tokenYBalance, 6)}`);

  // Step 2: Initialize liquidity by depositing tokens into the vault
  console.log('Depositing tokens to initialize liquidity...');
  tx = await vaultContract.connect(liquidityInitializerWallet).deposit(
    tokenXAmount,
    tokenYAmount,
    minLpAmount
  );
  await tx.wait();
  console.log('Liquidity initialized.');

  // Step 3: Fetch the latest price update data using EvmPriceServiceConnection
  console.log('Fetching price update data from Pyth Network...');

  // Initialize the connection with the appropriate endpoint
  const connection = new EvmPriceServiceConnection('https://hermes.pyth.network');

  // Define the price IDs
  const priceIds = [`0x${ethPriceFeedId}`];

  // Fetch the price feed update data
  const priceFeedUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

  // Check if data was received
  if (priceFeedUpdateData.length === 0) {
    console.error('No price update data received.');
    process.exit(1);
  }
  //console.log(priceFeedUpdateData);
  // Calculate the required fee
  // const pythContract = getPythContract(pythContractAddress, provider);
  const fee = 1; // await pythContract.getUpdateFee(priceFeedUpdateData);

  // Step 4: Call updateQuotes function with price data
  console.log('Updating quotes...');
  tx = await vaultWithMarketMaker.updateQuotes(priceFeedUpdateData, { value: fee , gasLimit: 30000000});
  await tx.wait();
  console.log('Quotes updated.');
}

main()
  .then(() => console.log('Script completed successfully.'))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });