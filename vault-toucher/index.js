const ethers = require('ethers');
const {
  EvmPriceServiceConnection
} = require('@pythnetwork/pyth-evm-js');
const vaultInfo = require('./out/HanjiVault.sol/HanjiVault.json');

// Replace with your RPC URL
const rpcUrl = 'https://node.ghostnet.etherlink.com'; // Update if different

// Replace with your private keys
const privateKeyMarketMaker = '0x9448ca647ac2db60182d46d1519c0df3a00041010e99d84e7234133f01488f9c'; // Private key of the market maker

// Addresses (replace with actual deployed addresses)
const vaultAddress = '0x97048Ee35d89Cc5937F23528CEFfBf490d27e001'; // Address of the deployed HanjiVault contract

// Pyth network details (replace with actual testnet addresses and IDs)
const ethPriceFeedId = 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace'; // ETH/USD Price Feed ID (without 0x prefix)

// Create a provider
const provider = new ethers.JsonRpcProvider(rpcUrl);

// Create wallet instances
const marketMakerWallet = new ethers.Wallet(privateKeyMarketMaker, provider);

// Instantiate contracts
const vaultAbi = vaultInfo.abi;

const vaultContract = new ethers.Contract(vaultAddress, vaultAbi, provider);
const vaultWithMarketMaker = vaultContract.connect(marketMakerWallet);

async function main() {
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

  console.log('Updating quotes...');
  console.log(priceFeedUpdateData);
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