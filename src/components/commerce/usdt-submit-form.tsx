'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BSC_CHAIN_ID_HEX,
  BSC_CHAIN_NAME,
  BSC_EXPLORER_URL,
  BSC_RPC_URL,
  BSC_USDT_CONTRACT,
  erc20TransferData,
} from '@/lib/commerce/bsc-usdt';

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export function UsdtSubmitForm({
  orderId,
  recipient,
  amountAtomic,
  amountLabel,
  existingTransactionHash,
}: {
  orderId: string;
  recipient: string;
  amountAtomic: string;
  amountLabel: string;
  existingTransactionHash?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(existingTransactionHash ? 'Checking your payment…' : '');
  const [txHash, setTxHash] = useState(existingTransactionHash ?? '');

  async function verify(hash: string) {
    const response = await fetch('/api/checkout/orders/' + orderId + '/usdt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionHash: hash }),
    });
    const result = await response.json();

    if (response.status === 202) {
      setMessage(result.message ?? 'Payment sent. Waiting for blockchain confirmation…');
      return false;
    }
    if (!response.ok) throw new Error(result.error ?? 'Unable to verify payment.');

    setMessage('Payment verified. Your course is unlocked.');
    router.refresh();
    return true;
  }

  async function poll(hash: string) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await verify(hash)) return;
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    setMessage('Payment is still confirming. You can refresh this page in a moment.');
  }

  useEffect(() => {
    if (!existingTransactionHash) return;
    let cancelled = false;

    (async () => {
      try {
        for (let attempt = 0; attempt < 8 && !cancelled; attempt += 1) {
          if (await verify(existingTransactionHash)) return;
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Unable to verify payment yet.');
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTransactionHash]);

  async function pay() {
    if (!window.ethereum) {
      setMessage('No compatible Web3 wallet was detected. Open this page in your wallet browser or connect a supported wallet.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error('No wallet account was connected.');

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_CHAIN_ID_HEX }],
        });
      } catch (error) {
        if ((error as { code?: number })?.code !== 4902) throw error;
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BSC_CHAIN_ID_HEX,
            chainName: BSC_CHAIN_NAME,
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: [BSC_RPC_URL],
            blockExplorerUrls: [BSC_EXPLORER_URL],
          }],
        });
      }

      setMessage('Wallet connected. Approve the payment in your wallet.');
      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: BSC_USDT_CONTRACT,
          value: '0x0',
          data: erc20TransferData(recipient, BigInt(amountAtomic)),
        }],
      }) as string;

      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error('MetaMask did not return a valid transaction.');

      setTxHash(hash);
      setMessage('Payment sent. Verifying it on BNB Smart Chain…');
      await poll(hash);
    } catch (error) {
      const walletError = error as { code?: number; message?: string };
      if (walletError?.code === 4001) setMessage('Payment cancelled in your wallet.');
      else setMessage(walletError?.message ?? 'Unable to complete the wallet payment.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="usdt-submit">
    <div className="notice">
      Connect your Web3 wallet and approve <strong>{amountLabel} USDT</strong>. Payment goes directly from your wallet to Ayat Academy. We never receive your private key or recovery phrase.
    </div>
    {message && <div className="notice">{message}</div>}
    {txHash && <a className="text-link break-value" href={BSC_EXPLORER_URL + '/tx/' + txHash} target="_blank" rel="noreferrer">View transaction</a>}
    <button className="button" type="button" disabled={busy || Boolean(existingTransactionHash)} onClick={pay}>
      {busy ? 'Waiting for wallet…' : existingTransactionHash ? 'Payment submitted' : 'Connect Wallet & Pay'}
    </button>
  </div>;
}
