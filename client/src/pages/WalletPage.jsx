import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchWallet,
  createRazorpayOrder,
  verifyPayment,
  fetchWalletTransactions,
} from '../store/slices/walletSlice';
import { updateBalance } from '../store/slices/portfolioSlice';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) { resolve(true); return; }
    const s = document.createElement('script');
    s.id  = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

export default function WalletPage() {
  const dispatch    = useDispatch();
  const { virtualBalance, deposits, transactions, loading, orderLoading } =
    useSelector((s) => s.wallet);
  const user = useSelector((s) => s.auth.user);

  const [amount, setAmount]   = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    dispatch(fetchWallet());
    dispatch(fetchWalletTransactions());
  }, [dispatch]);

  const fmt = (n) =>
    n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '0.00';

  const handleAddMoney = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 1) {
      toast.error('Enter a valid amount (min ₹1)');
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast.error('Failed to load Razorpay. Check your connection.');
      return;
    }

    // Create order on the backend
    const resultAction = await dispatch(createRazorpayOrder(parsedAmount));
    if (createRazorpayOrder.rejected.match(resultAction)) {
      toast.error(resultAction.payload || 'Could not create order');
      return;
    }

    const { orderId, amount: orderAmount, currency, keyId } = resultAction.payload;

    setShowModal(false);

    const options = {
      key:         keyId,
      amount:      orderAmount,
      currency,
      name:        'ArthaYukti',
      description: 'Add Virtual Money to Wallet',
      order_id:    orderId,
      prefill: {
        name:  user?.name || '',
        email: user?.email || '',
      },
      theme: { color: 'oklch(0.78 0.16 152)' },
      handler: async (response) => {
        const verifyResult = await dispatch(
          verifyPayment({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          })
        );

        if (verifyPayment.fulfilled.match(verifyResult)) {
          const newBalance = verifyResult.payload.virtualBalance;
          dispatch(updateBalance(newBalance));
          toast.success(`₹${fmt(parsedAmount)} added to your wallet!`);
          setAmount('');
          dispatch(fetchWallet());
        } else {
          toast.error('Payment verification failed');
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => toast.error('Payment failed. Please try again.'));
    rzp.open();
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--muted-foreground)' }}>
            Virtual Money
          </p>
          <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--foreground)' }}>
            Wallet
          </h1>
        </div>
        <button
          onClick={() => { dispatch(fetchWallet()); dispatch(fetchWalletTransactions()); }}
          className="h-9 w-9 flex items-center justify-center rounded-md transition-colors duration-150"
          style={{ color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--muted)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 stroke-[1.5]" />
        </button>
      </div>

      {/* Balance card */}
      <div
        className="rounded-xl border p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'oklch(0.78 0.16 152 / 0.3)', background: 'linear-gradient(135deg, oklch(0.19 0.014 250) 0%, oklch(0.78 0.16 152 / 0.08) 100%)' }}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--muted-foreground)' }}>
            Available Balance
          </p>
          {loading && virtualBalance === null ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <p className="font-mono text-4xl tabular-nums font-semibold" style={{ color: 'var(--primary)' }}>
              ₹{fmt(virtualBalance ?? 100000)}
            </p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Virtual paper-trading funds
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          disabled={orderLoading}
          className="h-11 px-6 flex items-center gap-2 rounded-lg font-medium text-sm transition-opacity duration-150 disabled:opacity-50 flex-shrink-0"
          style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <Plus className="h-4 w-4 stroke-2" />
          Add Money
        </button>
      </div>

      {/* Add Money Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.6)' }}>
          <div
            className="w-full max-w-sm rounded-xl border p-6 space-y-5"
            style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
          >
            <div>
              <h2 className="font-display text-xl" style={{ color: 'var(--foreground)' }}>Add Virtual Money</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Use Razorpay test card: 4111 1111 1111 1111 · Any future date · Any CVV
              </p>
            </div>

            {/* Preset amounts */}
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className="h-8 px-3 rounded-md text-xs font-mono transition-colors duration-150"
                  style={{
                    backgroundColor: amount === String(a) ? 'oklch(0.78 0.16 152 / 0.15)' : 'var(--muted)',
                    color:           amount === String(a) ? 'var(--primary)' : 'var(--muted-foreground)',
                    border:          `1px solid ${amount === String(a) ? 'oklch(0.78 0.16 152 / 0.4)' : 'transparent'}`,
                  }}
                >
                  ₹{a.toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            {/* Custom amount input */}
            <div>
              <label className="text-xs uppercase tracking-[0.14em] mb-1.5 block" style={{ color: 'var(--muted-foreground)' }}>
                Custom Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                max="1000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full h-10 px-3 rounded-md border font-mono text-sm bg-transparent outline-none"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowModal(false); setAmount(''); }}
                className="flex-1 h-10 rounded-md text-sm transition-colors duration-150"
                style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMoney}
                disabled={orderLoading || !amount}
                className="flex-1 h-10 rounded-md text-sm font-medium transition-opacity duration-150 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                {orderLoading ? 'Processing…' : 'Pay with Razorpay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade transaction history */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>
            Trade History
          </h2>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No trades yet"
            description="Your buy and sell history will appear here."
          />
        ) : (
          transactions.map((tx) => (
            <div
              key={tx._id}
              className="flex items-center justify-between px-5 py-3.5 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-6 px-2 rounded text-xs font-mono font-medium flex items-center flex-shrink-0"
                  style={{
                    backgroundColor: tx.type === 'BUY' ? 'oklch(0.78 0.16 152 / 0.1)' : 'oklch(0.66 0.22 22 / 0.1)',
                    color:           tx.type === 'BUY' ? 'var(--primary)' : 'var(--destructive)',
                  }}
                >
                  {tx.type}
                </span>
                <div>
                  <p className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>{tx.symbol}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {tx.quantity} shares @ ₹{tx.price?.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm tabular-nums flex items-center justify-end gap-0.5" style={{ color: 'var(--foreground)' }}>
                  {tx.type === 'BUY'
                    ? <ArrowDownRight className="h-3.5 w-3.5" style={{ color: 'var(--destructive)' }} />
                    : <ArrowUpRight   className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                  }
                  ₹{tx.total?.toFixed(2)}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Wallet deposit history */}
      {deposits.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-sans font-medium text-sm" style={{ color: 'var(--foreground)' }}>
              Deposit History
            </h2>
          </div>
          {deposits.map((d) => (
            <div
              key={d._id}
              className="flex items-center justify-between px-5 py-3.5 border-b last:border-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-6 px-2 rounded text-xs font-mono font-medium flex items-center"
                  style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.1)', color: 'var(--primary)' }}
                >
                  DEPOSIT
                </span>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  Via Razorpay
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm tabular-nums" style={{ color: 'var(--primary)' }}>
                  +₹{fmt(d.amount)}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
