// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useWalletInfo
} from '@reown/appkit/react';
import { BrowserProvider, type Eip1193Provider } from 'ethers';
import {
  BSC_EXPLORER_URL,
  BSC_USDT_CONTRACT,
  erc20TransferData,
} from '@/lib/commerce/bsc-usdt';

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
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<Eip1193Provider>('eip155');

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

  async function connectWallet() {
    setMessage('');
    try {
      await open({ view: 'Connect', namespace: 'eip155' });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open wallet selection.');
    }
  }

  async function pay() {
    if (!isConnected || !address || !walletProvider) {
      await connectWallet();
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner(address);

      setMessage('Approve the USDT payment in your selected wallet.');
      const transaction = await signer.sendTransaction({
        to: BSC_USDT_CONTRACT,
        value: 0n,
        data: erc20TransferData(recipient, BigInt(amountAtomic)),
      });

      if (!/^0x[0-9a-fA-F]{64}$/.test(transaction.hash)) {
        throw new Error('Your wallet did not return a valid transaction.');
      }

      setTxHash(transaction.hash);
      setMessage('Payment sent. Verifying it on BNB Smart Chain…');
      await poll(transaction.hash);
    } catch (error) {
      const walletError = error as { code?: number | string; message?: string };
      if (walletError?.code === 4001 || walletError?.code === 'ACTION_REJECTED') {
        setMessage('Payment cancelled in your wallet.');
      } else {
        setMessage(walletError?.message ?? 'Unable to complete the wallet payment.');
      }
    } finally {
      setBusy(false);
    }
  }

  const shortAddress = address ? address.slice(0, 6) + '…' + address.slice(-4) : '';

  return <div className="usdt-submit">
    <div className="notice">
      Choose your preferred Web3 wallet and approve <strong>{amountLabel} USDT</strong> on BNB Smart Chain. Payment goes directly to Ayat Academy. We never receive your private key or recovery phrase.
    </div>

    {isConnected && address && <div className="notice">
      Connected wallet: <strong>{shortAddress}</strong>
      {' '}<button className="text-link" type="button" onClick={() => open({ view: 'Connect', namespace: 'eip155' })}>Change wallet</button>
    </div>}

    {message && <div className="notice">{message}</div>}
    {txHash && <a className="text-link break-value" href={BSC_EXPLORER_URL + '/tx/' + txHash} target="_blank" rel="noreferrer">View transaction</a>}

    {!isConnected ? (
      <button className="button" type="button" disabled={Boolean(existingTransactionHash)} onClick={connectWallet}>
        Connect Wallet
      </button>
    ) : (
      <button className="button" type="button" disabled={busy || Boolean(existingTransactionHash)} onClick={pay}>
        {busy ? 'Waiting for wallet…' : existingTransactionHash ? 'Payment submitted' : 'Pay ' + amountLabel + ' USDT'}
      </button>
    )}
  </div>;
}
