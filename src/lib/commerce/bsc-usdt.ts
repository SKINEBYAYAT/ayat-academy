export const BSC_CHAIN_ID_HEX = '0x38';
export const BSC_CHAIN_NAME = 'BNB Smart Chain';
export const BSC_RPC_URL = 'https://bsc-dataseed.bnbchain.org';
export const BSC_EXPLORER_URL = 'https://bscscan.com';

// Binance-Peg BSC-USD (commonly shown as USDT on BNB Smart Chain).
export const BSC_USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
export const BSC_USDT_DECIMALS = 18;

// Public receiving address only. No private key is stored by Ayat Academy.
export const BUSINESS_BSC_WALLET = '0x1554cB61bA52D56395f2D5B8e826e5cBde1a078e';

export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export function usdtAtomicFromMinor(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new Error('Invalid payment amount.');
  return BigInt(amountMinor) * 10n ** BigInt(BSC_USDT_DECIMALS - 2);
}

export function erc20TransferData(recipient: string, amountAtomic: bigint) {
  const address = recipient.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const amount = amountAtomic.toString(16).padStart(64, '0');
  return '0xa9059cbb' + address + amount;
}
