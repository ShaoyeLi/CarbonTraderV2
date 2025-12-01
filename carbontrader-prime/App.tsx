import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  Wallet, Leaf, LayoutDashboard, Settings, 
  Plus, History, ShieldAlert, ArrowRight,
  TrendingUp, Coins, LogOut, CheckCircle2, AlertCircle
} from 'lucide-react';

import { ABIs, DEFAULT_CONFIG } from './constants';
import { AppConfig, Trade, UserState, ViewState } from './types';
import { Button, Card, Input, Badge, Modal } from './components/UI';

// --- Helper Utilities ---
const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
const formatEth = (val: bigint) => ethers.formatEther(val);
const formatToken = (val: bigint) => ethers.formatUnits(val, 18);

const extractErrorName = (error: any): string | undefined => {
  if (!error) return undefined;
  if (error.errorName) return error.errorName;
  if (error.info?.errorName) return error.info.errorName;
  if (error.info?.error?.errorName) return error.info.error.errorName;
  const raw: string = error.shortMessage || error.message || '';
  const match = raw.match(/CarbonTrader_[A-Za-z0-9]+/);
  return match?.[0];
};

const mapErrorToMessage = (error: any): string => {
  const name = extractErrorName(error);
  const raw: string = error?.shortMessage || error?.message || '';

  switch (name) {
    case 'CarbonTrader_BidTooLow':
      return '出价过低，请提高押金金额。';
    case 'CarbonTrader_AuctionEnded':
      return '拍卖已结束，无法继续出价或买断。';
    case 'CarbonTrader_AuctionNotStarted':
      return '拍卖尚未开始，请稍后再试。';
    case 'CarbonTrader_NotWhitelisted':
      return '当前地址未在白名单中，无法参与本次交易。';
    case 'CarbonTrader_Blacklisted':
      return '当前地址在黑名单中，操作被拒绝。';
    case 'CarbonTrader_TradeNotExist':
      return '交易不存在，请检查 Trade ID。';
    case 'CarbonTrader_TradeFinalized':
      return '该拍卖已结算。';
    case 'CarbonTrader_NoDeposit':
      return '当前地址在该拍卖下没有可退款押金。';
    case 'CarbonTrader_StillHighestBidder':
      return '你是当前最高出价人，需等待拍卖结束并流拍/结算后再退款。';
    case 'CarbonTrader_NotOwner':
      return '只有管理员可以执行此操作。';
    case 'CarbonTrader_BuyNowDisabled':
      return '该交易未设置一口价。';
    default:
      return raw || '交易失败，请稍后重试或在控制台查看详细错误信息。';
  }
};

const showFriendlyError = (error: any, fallback?: string) => {
  console.error(error);
  const msg = mapErrorToMessage(error);
  alert(msg || fallback || '操作失败');
};

const TRADE_SEQ_KEY = 'carbonTraderTradeSeq';

const generateTradeId = (existingTrades: Trade[]): string => {
  const used = new Set(existingTrades.map(t => t.tradeId));

  // 从 localStorage 和当前列表里取一个最大的已用序号
  const stored = Number(localStorage.getItem(TRADE_SEQ_KEY) || '0');
  const fromTrades = existingTrades.reduce((max, t) => {
    const m = t.tradeId.match(/CT-(\d{6})$/);
    if (!m) return max;
    const n = parseInt(m[1], 10);
    return n > max ? n : max;
  }, 0);

  let seq = Math.max(stored, fromTrades, 100000) + 1; // 从 100001 起
  if (seq > 999999) seq = 100001; // 极端情况下简单回绕

  let id = `CT-${seq.toString().padStart(6, '0')}`;
  while (used.has(id)) {
    seq += 1;
    if (seq > 999999) seq = 100001;
    id = `CT-${seq.toString().padStart(6, '0')}`;
  }

  localStorage.setItem(TRADE_SEQ_KEY, String(seq));
  return id;
};

function App() {
  // --- State ---
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [config] = useState<AppConfig>(DEFAULT_CONFIG);
  
  // Contracts
  const [carbonContract, setCarbonContract] = useState<ethers.Contract | null>(null);
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [saleContract, setSaleContract] = useState<ethers.Contract | null>(null);
  const [faucetContract, setFaucetContract] = useState<ethers.Contract | null>(null);

  // Data
  const [view, setView] = useState<ViewState>('market');
  const [userState, setUserState] = useState<UserState>({
    ethBalance: 0n, tokenBalance: 0n, carbonAllowance: 0n, carbonFrozen: 0n, auctionAmount: 0n
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [contractOwner, setContractOwner] = useState<string>('');
  const [myDeposits, setMyDeposits] = useState<Record<string, bigint>>({});
  const [whitelistOn, setWhitelistOn] = useState<boolean>(false);
  const [feeBps, setFeeBps] = useState<number>(0);
  const [dashboardView, setDashboardView] = useState<'auctions' | 'bids'>('auctions');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [platformVolume, setPlatformVolume] = useState<bigint>(0n);
  const [platformTradesCount, setPlatformTradesCount] = useState<number>(0);
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [consoleRows, setConsoleRows] = useState<
    { address: string; eth: bigint; token: bigint; allowance: bigint; frozen: bigint; auctionAmount: bigint }[]
  >([]);
  const [consoleLoading, setConsoleLoading] = useState<boolean>(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState<{ isOpen: boolean, tradeId: string }>({ isOpen: false, tradeId: '' });
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Form Inputs
  const [createForm, setCreateForm] = useState({ id: '', amount: '', price: '', reserve: '', buyNow: '' });
  const [depositAmount, setDepositAmount] = useState('');
  const [ethToBuy, setEthToBuy] = useState('0.1');
  const [adminAddress, setAdminAddress] = useState('');
  const [adminAmount, setAdminAmount] = useState('');

  // --- Initialization ---
  
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    return () => {
      if (window.ethereum) window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  useEffect(() => {
    if (account && config.carbonAddr && config.tokenAddr) {
      initializeContracts();
    }
  }, [account, config]);

  useEffect(() => {
    if (
      view === 'admin' &&
      account &&
      contractOwner &&
      account.toLowerCase() !== contractOwner.toLowerCase()
    ) {
      setView('market');
    }
  }, [view, account, contractOwner]);

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
    } else {
      connectWallet();
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask');
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      setProvider(_provider);
      setSigner(_signer);
      setAccount(await _signer.getAddress());
    } catch (err) {
      console.error(err);
    }
  };

  const initializeContracts = async () => {
    if (!signer || !config.carbonAddr || !config.tokenAddr) return;

    try {
      const carbon = new ethers.Contract(config.carbonAddr, ABIs.CarbonTrader, signer);
      const token = new ethers.Contract(config.tokenAddr, ABIs.ERC20, signer);
      
      setCarbonContract(carbon);
      setTokenContract(token);

      if (config.saleAddr) {
        const sale = new ethers.Contract(config.saleAddr, ABIs.TokenSale, signer);
        setSaleContract(sale);
      }

      if (config.faucetAddr) {
        const faucet = new ethers.Contract(config.faucetAddr, ABIs.Faucet, signer);
        setFaucetContract(faucet);
      }

      const owner = await carbon.owner();
      setContractOwner(owner);

      try {
        const [wl, fee] = await Promise.all([
          carbon.whitelistEnabled(),
          carbon.feeBasisPoints()
        ]);
        setWhitelistOn(Boolean(wl));
        setFeeBps(Number(fee));
      } catch (err) {
        console.error('Failed to load admin settings', err);
      }

      await refreshData(carbon, token, await signer.getAddress());
    } catch (e) {
      console.error("Contract Init Failed", e);
    }
  };

  const refreshData = useCallback(async (carbon: ethers.Contract, token: ethers.Contract, addr: string) => {
    if (!provider) return;
    
    try {
      // 1. Fetch User Data
      const [eth, tok, allow, frozen, aucAmt] = await Promise.all([
        provider.getBalance(addr),
        token.balanceOf(addr),
        carbon.getAllowance(addr),
        carbon.getFrozenAllowance(addr),
        carbon.getAuctionAmount(addr)
      ]);

      setUserState({
        ethBalance: eth,
        tokenBalance: tok,
        carbonAllowance: allow,
        carbonFrozen: frozen,
        auctionAmount: aucAmt
      });

      // 2. Fetch Market Data (Events)
      const filter = carbon.filters.NewTrade();
      const events = await carbon.queryFilter(filter, 0, 'latest');
      
      const loadedTrades: Trade[] = await Promise.all(events.map(async (ev: any) => {
        const { tradeId, seller, amount, startamount, priceOfUnit, startTime, endTime } = ev.args;
        
        // Fetch current status
        const [highestBidder, highestBid, finalized] = await carbon.getTradeStatus(tradeId);
        const [reservePrice, buyNowPrice, buyNowUsed] = await carbon.getTradePrices(tradeId);

        return {
          tradeId, seller, amount, startamount, priceOfUnit, startTime, endTime,
          highestBidder, highestBid, finalized, reservePrice, buyNowPrice, buyNowUsed
        };
      }));

      const orderedTrades = loadedTrades.reverse(); // Newest first
      setTrades(orderedTrades);

      // 3. Fetch caller-specific deposits for each trade
      const depositsEntries = await Promise.all(
        orderedTrades.map(async (t) => {
          try {
            const d: bigint = await carbon.getDeposit(t.tradeId);
            return [t.tradeId, d] as const;
          } catch {
            return [t.tradeId, 0n] as const;
          }
        })
      );
      const depositsMap: Record<string, bigint> = {};
      for (const [id, amount] of depositsEntries) {
        depositsMap[id] = amount;
      }
      setMyDeposits(depositsMap);

      // 4. Fetch platform-level stats from TradeFinalized events
      const finalizedEvents = await carbon.queryFilter(carbon.filters.TradeFinalized(), 0, 'latest');
      let totalVol: bigint = 0n;
      for (const ev of finalizedEvents) {
        const paid: bigint = ev.args.paidAmount;
        if (paid > 0n) {
          totalVol += paid;
        }
      }
      setPlatformTradesCount(finalizedEvents.length);
      setPlatformVolume(totalVol);

    } catch (err) {
      console.error("Data refresh failed", err);
    }
  }, [provider]);

  // --- Actions ---

  const handleOpenCreateModal = () => {
    const autoId = generateTradeId(trades);
    setCreateForm(prev => ({ ...prev, id: autoId }));
    setShowCreateModal(true);
  };

  const handleBuyTokens = async () => {
    if (!saleContract) return;
    try {
      const tx = await saleContract.buyTokens({ value: ethers.parseEther(ethToBuy) });
      await tx.wait();
      alert('Tokens purchased');
      setShowTopUpModal(false);
      if (carbonContract && tokenContract && account) refreshData(carbonContract, tokenContract, account);
    } catch (e) {
      showFriendlyError(e, 'Purchase failed');
    }
  };

  const handleFaucetClaim = async () => {
    if (!faucetContract) return;
    try {
      const tx = await faucetContract.claim();
      await tx.wait();
      alert('Faucet claimed: 1000 USDT');
      if (carbonContract && tokenContract && account) {
        await refreshData(carbonContract, tokenContract, account);
      }
    } catch (e) {
      showFriendlyError(e, 'Faucet claim failed');
    }
  };

  const handleCreateTrade = async () => {
    if (!carbonContract) return;
    try {
      const now = Math.floor(Date.now() / 1000);
      const end = now + 86400; // 1 day
      
      const tx = await carbonContract.createTrade(
        createForm.id,
        BigInt(createForm.amount),
        BigInt(createForm.amount),
        ethers.parseUnits(createForm.price, 18), // assuming unit price is 18 decimals
        now,
        end
      );
      await tx.wait();

      if (createForm.reserve || createForm.buyNow) {
        const reserve = createForm.reserve ? ethers.parseUnits(createForm.reserve, 18) : 0n;
        const buyNow = createForm.buyNow ? ethers.parseUnits(createForm.buyNow, 18) : 0n;
        const tx2 = await carbonContract.setTradePrices(createForm.id, reserve, buyNow);
        await tx2.wait();
      }

      alert('Trade Created');
      setShowCreateModal(false);
      if (tokenContract && account) refreshData(carbonContract, tokenContract, account);
    } catch (e) {
      showFriendlyError(e, 'Creation failed');
    }
  };

  const handleDeposit = async () => {
    if (!carbonContract || !tokenContract || !account) return;
    try {
      const tradeId = showDepositModal.tradeId;
      const amount = ethers.parseUnits(depositAmount, 18);
      
      // Check allowance
      const spender = await carbonContract.getAddress();
      const currentAllowance = await tokenContract.allowance(account, spender);
      
      // We need to calculate delta if there is a previous bid, but simplifying: just ensure total allowance
      if (currentAllowance < amount) {
         const txApp = await tokenContract.approve(spender, amount);
         await txApp.wait();
      }

      const tx = await carbonContract.deposit(tradeId, amount, "web-bid");
      await tx.wait();
      
      alert('Bid Placed');
      setShowDepositModal({ isOpen: false, tradeId: '' });
      refreshData(carbonContract, tokenContract, account);
    } catch (e) {
      showFriendlyError(e, 'Deposit failed');
    }
  };

  const handleBuyNow = async (tradeId: string, price: bigint) => {
    if (!carbonContract || !tokenContract || !account) return;
    try {
       const spender = await carbonContract.getAddress();
       const currentAllowance = await tokenContract.allowance(account, spender);
       if (currentAllowance < price) {
          const txApp = await tokenContract.approve(spender, price);
          await txApp.wait();
       }
       const tx = await carbonContract.buyNow(tradeId);
       await tx.wait();
       alert('Purchased Instantly');
       refreshData(carbonContract, tokenContract, account);
    } catch(e) {
      showFriendlyError(e, 'Buy Now failed');
    }
  }

  const handleWithdraw = async () => {
    if (!carbonContract) return;
    try {
      const tx = await carbonContract.withdrawAuctionAmount();
      await tx.wait();
      if (tokenContract && account) refreshData(carbonContract, tokenContract, account);
    } catch(e) {
      showFriendlyError(e, 'Withdraw failed');
    }
  }

  const handleAdminAction = async (action: 'issue' | 'destroy') => {
    if (!carbonContract) return;
    try {
      const tx = action === 'issue' 
        ? await carbonContract.issueAllowance(adminAddress, BigInt(adminAmount))
        : await carbonContract.destroyAllowance(adminAddress, BigInt(adminAmount));
      await tx.wait();
      alert('Success');
    } catch(e) {
      showFriendlyError(e, 'Admin action failed');
    }
  }

  const handleToggleWhitelist = async () => {
    if (!carbonContract) return;
    try {
      const next = !whitelistOn;
      const tx = await carbonContract.setWhitelistEnabled(next);
      await tx.wait();
      setWhitelistOn(next);
      alert(next ? 'Whitelist mode enabled' : 'Whitelist mode disabled');
    } catch (e) {
      showFriendlyError(e, 'Toggle whitelist failed');
    }
  };

  const handleUpdateFee = async () => {
    if (!carbonContract) return;
    if (feeBps < 0 || feeBps > 1000) {
      alert('Fee must be between 0 and 1000 basis points (max 10%).');
      return;
    }
    try {
      const tx = await carbonContract.setFeeBasisPoints(feeBps);
      await tx.wait();
      alert('Fee updated');
    } catch (e) {
      showFriendlyError(e, 'Update fee failed');
    }
  };

  const handleWhitelistAction = async (action: 'addW' | 'removeW' | 'addB' | 'removeB') => {
    if (!carbonContract) return;
    if (!adminAddress) {
      alert('Please input an address');
      return;
    }
    try {
      let tx;
      if (action === 'addW') tx = await carbonContract.addToWhitelist(adminAddress);
      else if (action === 'removeW') tx = await carbonContract.removeFromWhitelist(adminAddress);
      else if (action === 'addB') tx = await carbonContract.addToBlacklist(adminAddress);
      else tx = await carbonContract.removeFromBlacklist(adminAddress);

      await tx.wait();
      alert('Operation successful');
    } catch (e) {
      showFriendlyError(e, 'List operation failed');
    }
  };

  const handleBatchFinalize = async () => {
    if (!carbonContract || trades.length === 0) return;
    const now = Date.now() / 1000;
    const ids = trades
      .filter(t => Number(t.endTime) < now && !t.finalized)
      .map(t => t.tradeId);

    if (ids.length === 0) {
      alert('No ended, unfinalized trades to batch finalize.');
      return;
    }

    try {
      const tx = await carbonContract.batchFinalize(ids);
      await tx.wait();
      if (tokenContract && account) {
        await refreshData(carbonContract, tokenContract, account);
      }
      alert(`Batch finalized ${ids.length} trades.`);
    } catch (e) {
      showFriendlyError(e, 'Batch finalize failed');
    }
  };

  const handleLoadConsole = async () => {
    if (!provider || !tokenContract || !carbonContract) {
      alert('Please connect wallet and configure contracts first');
      return;
    }
    const raw = consoleInput.trim();
    if (!raw) {
      setConsoleRows([]);
      return;
    }
    const addrs = Array.from(
      new Set(
        raw
          .split(/[\s,;\n]+/)
          .map(a => a.trim())
          .filter(a => a.length === 42 && a.startsWith('0x'))
      )
    );
    if (addrs.length === 0) {
      alert('Please input at least one valid address');
      return;
    }
    setConsoleLoading(true);
    try {
      const rows = await Promise.all(
        addrs.map(async addr => {
          const [eth, tok, allow, frozen, aucAmt] = await Promise.all([
            provider.getBalance(addr),
            tokenContract.balanceOf(addr),
            carbonContract.getAllowance(addr),
            carbonContract.getFrozenAllowance(addr),
            carbonContract.getAuctionAmount(addr)
          ]);
          return {
            address: addr,
            eth,
            token: tok,
            allowance: allow,
            frozen,
            auctionAmount: aucAmt
          };
        })
      );
      setConsoleRows(rows);
    } catch (e) {
      showFriendlyError(e, 'Load accounts failed');
    } finally {
      setConsoleLoading(false);
    }
  };

  const handleFinalizeTrade = async (tradeId: string) => {
    if (!carbonContract || !tokenContract || !account) return;
    try {
      const tx = await carbonContract.finalizeAuctionAndTransferCarbon(tradeId);
      await tx.wait();
      await refreshData(carbonContract, tokenContract, account);
    } catch (e) {
      showFriendlyError(e, 'Finalize failed');
    }
  };

  const handleSellerEndEarly = async (tradeId: string) => {
    if (!carbonContract || !tokenContract || !account) return;
    try {
      const tx = await carbonContract.sellerFinalizeEarly(tradeId);
      await tx.wait();
      await refreshData(carbonContract, tokenContract, account);
    } catch (e) {
      showFriendlyError(e, 'End auction failed');
    }
  };

  const handleSellerCancelTrade = async (tradeId: string) => {
    if (!carbonContract || !tokenContract || !account) return;
    try {
      const tx = await carbonContract.cancelTrade(tradeId);
      await tx.wait();
      await refreshData(carbonContract, tokenContract, account);
    } catch (e) {
      showFriendlyError(e, 'Cancel listing failed');
    }
  };

  // --- Views ---

  const renderMarket = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {trades.length === 0 && (
        <div className="col-span-full text-center py-20 text-zinc-500 font-light">
          No active trades found in the ecosystem.
        </div>
      )}
      {trades.map((trade) => {
        const isOwner = account && trade.seller.toLowerCase() === account.toLowerCase();
        const isEnded = Number(trade.endTime) < Date.now() / 1000;
        const highestBidFmt = formatToken(trade.highestBid);
        const hasBid = trade.highestBid > 0n && trade.amount > 0n;
        const unitBid = hasBid ? formatToken(trade.highestBid / trade.amount) : '-';
        const startingTotalFmt = formatToken(trade.priceOfUnit);
        const reserveFmt = trade.reservePrice > 0n ? formatToken(trade.reservePrice) : '-';
        const buyNowFmt = trade.buyNowPrice > 0n ? formatToken(trade.buyNowPrice) : '-';
        
        return (
          <Card key={trade.tradeId} className="hover:border-zinc-700 transition-colors group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-xl font-normal text-zinc-100">{trade.tradeId}</h3>
                  <div className="text-xs text-zinc-500 font-mono mt-1">Seller: {shortenAddress(trade.seller)}</div>
               </div>
               {trade.finalized ? (
                 <Badge type="neutral">Finalized</Badge>
               ) : isEnded ? (
                 <Badge type="warning">Ended</Badge>
               ) : (
                 <Badge type="success">Active</Badge>
               )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-zinc-950/50 rounded-xl p-3">
                  <div className="text-xs text-zinc-500 mb-1">Carbon Amount</div>
                  <div className="text-lg font-medium text-emerald-400">{trade.amount.toString()}</div>
               </div>
               <div className="bg-zinc-950/50 rounded-xl p-3">
                  <div className="text-xs text-zinc-500 mb-1">
                    {hasBid ? 'Current Total Bid' : 'Starting Ask (Total)'}
                  </div>
                  <div className="text-lg font-medium text-zinc-200">
                    {hasBid ? highestBidFmt : startingTotalFmt}{' '}
                    <span className="text-xs text-zinc-600">USDT</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">
                    {hasBid ? `≈ ${unitBid} USDT / credit` : 'No bids yet'}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-zinc-950/50 rounded-xl p-3">
                <div className="text-[11px] text-zinc-500 mb-1">Reserve Price</div>
                <div className="text-sm font-medium text-zinc-200">
                  {reserveFmt === '-' ? '-' : `${reserveFmt} USDT`}
                </div>
              </div>
              <div className="bg-zinc-950/50 rounded-xl p-3">
                <div className="text-[11px] text-zinc-500 mb-1">Buy Now Price</div>
                <div className="text-sm font-medium text-zinc-200">
                  {buyNowFmt === '-' ? '-' : `${buyNowFmt} USDT`}
                </div>
              </div>
              <div className="bg-zinc-950/50 rounded-xl p-3">
                <div className="text-[11px] text-zinc-500 mb-1">Buy Now Status</div>
                <div className="text-sm font-medium text-zinc-200">
                  {trade.buyNowPrice === 0n
                    ? 'Disabled'
                    : trade.buyNowUsed
                      ? 'Used'
                      : 'Available'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {!trade.finalized && !isEnded && (
                <>
                  <Button 
                    className="w-full" 
                    variant={isOwner ? "secondary" : "primary"}
                    disabled={isOwner}
                    onClick={() => {
                        setShowDepositModal({ isOpen: true, tradeId: trade.tradeId });
                    }}
                  >
                    {isOwner ? "You are Seller" : "Place Bid"}
                  </Button>
                  
                  {trade.buyNowPrice > 0n && !trade.buyNowUsed && !isOwner && (
                    <Button 
                      className="w-full" variant="secondary"
                      onClick={() => handleBuyNow(trade.tradeId, trade.buyNowPrice)}
                    >
                      Buy Now ({formatToken(trade.buyNowPrice)})
                    </Button>
                  )}

                  {isOwner && trade.highestBid > 0n && (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => handleSellerEndEarly(trade.tradeId)}
                    >
                      End Auction Now
                    </Button>
                  )}
                </>
              )}
              
              {/* Settle Action (for anyone, but conceptually for seller/winner) */}
              {!trade.finalized && isEnded && trade.highestBid > 0n && (
                 <Button 
                  className="w-full" variant="primary"
                  onClick={() => handleFinalizeTrade(trade.tradeId)}
                 >
                   Settle Auction
                 </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card title="Carbon Credits">
          <div className="text-3xl font-light text-zinc-100 mt-2">{userState.carbonAllowance.toString()}</div>
          <div className="text-xs text-zinc-500 mt-1">Available to trade</div>
        </Card>
        <Card title="Frozen Credits">
          <div className="text-3xl font-light text-zinc-100 mt-2">{userState.carbonFrozen.toString()}</div>
          <div className="text-xs text-zinc-500 mt-1">Locked in auctions</div>
        </Card>
        <Card title="USDT Balance">
          <div className="text-3xl font-light text-zinc-100 mt-2">{formatToken(userState.tokenBalance)}</div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2 cursor-pointer hover:text-emerald-400" onClick={() => setShowTopUpModal(true)}>
             <Plus className="w-3 h-3" /> Top Up
          </div>
        </Card>
        <Card title="Pending Revenue">
           <div className="flex justify-between items-end">
             <div>
               <div className="text-3xl font-light text-zinc-100 mt-2">{formatToken(userState.auctionAmount)}</div>
               <div className="text-xs text-zinc-500 mt-1">From Sales</div>
             </div>
             {userState.auctionAmount > 0n && (
               <Button variant="ghost" className="h-8 px-3" onClick={handleWithdraw}>Claim</Button>
             )}
           </div>
        </Card>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light flex items-center gap-2">
            <History className="w-5 h-5 text-zinc-500" />
            {dashboardView === 'auctions' ? 'My Auctions' : 'My Bids'}
          </h2>
          <div className="inline-flex rounded-full bg-zinc-900/60 border border-zinc-800 p-1 text-xs">
            <button
              className={`px-4 py-1.5 rounded-full transition-colors ${
                dashboardView === 'auctions'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
              onClick={() => setDashboardView('auctions')}
            >
              My Auctions
            </button>
            <button
              className={`px-4 py-1.5 rounded-full transition-colors ${
                dashboardView === 'bids'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-200'
              }`}
              onClick={() => setDashboardView('bids')}
            >
              My Bids
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-xs font-medium">
              <tr>
                <th className="px-6 py-4">Trade ID</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">
                  {dashboardView === 'auctions' ? 'Amount' : 'My Deposit'}
                </th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {trades
                .filter((t) => {
                  const myDeposit = myDeposits[t.tradeId] ?? 0n;
                  if (dashboardView === 'auctions') {
                    return t.seller === account;
                  }
                  return myDeposit > 0n;
                })
                .map(t => {
                  const myDeposit = myDeposits[t.tradeId] ?? 0n;
                  const isSeller = account && t.seller.toLowerCase() === account.toLowerCase();
                  const isHighestBidder = account && t.highestBidder.toLowerCase() === account.toLowerCase();
                  const isEnded = Number(t.endTime) < Date.now() / 1000;
                  const canFinalize = !!(isSeller && !t.finalized && isEnded && t.highestBid > 0n);
                  const canEndEarly = !!(isSeller && !t.finalized && !isEnded && t.highestBid > 0n);
                  const canRefund = myDeposit > 0n && (!isHighestBidder || (isHighestBidder && t.finalized));
                  const canCancel =
                    !!(dashboardView === 'auctions' && isSeller && !t.finalized && t.highestBid === 0n);

                  return (
                <tr
                  key={t.tradeId}
                  className="hover:bg-zinc-800/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedTrade(t)}
                >
                  <td className="px-6 py-4 font-medium text-zinc-200 underline decoration-dotted">
                    {t.tradeId}
                  </td>
                  <td className="px-6 py-4">
                    {isSeller ? (
                      <Badge>Seller</Badge>
                    ) : (
                      <Badge type="neutral">
                        {isHighestBidder ? 'Highest Bidder' : 'Bidder'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {dashboardView === 'auctions'
                      ? `${t.amount.toString()} Credits`
                      : `${formatToken(myDeposit)} USDT`}
                  </td>
                  <td className="px-6 py-4">
                     {t.finalized ? 'Finalized' : isEnded ? 'Ended' : 'Active'}
                  </td>
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                     {canCancel && (
                       <Button
                         variant="secondary"
                         className="h-7 px-3 text-[11px] mr-2"
                         onClick={() => handleSellerCancelTrade(t.tradeId)}
                       >
                         Cancel Listing
                       </Button>
                     )}
                     {dashboardView === 'auctions' && canFinalize && (
                       <Button
                         variant="secondary"
                         className="h-7 px-3 text-[11px] mr-2"
                         onClick={() => handleFinalizeTrade(t.tradeId)}
                       >
                         Settle Auction
                       </Button>
                     )}
                     {dashboardView === 'auctions' && !canFinalize && canEndEarly && (
                       <Button
                         variant="secondary"
                         className="h-7 px-3 text-[11px] mr-2"
                         onClick={() => handleSellerEndEarly(t.tradeId)}
                       >
                         End Early
                       </Button>
                     )}
                     {canRefund && (
                       <Button
                         variant="secondary"
                         className="h-7 px-3 text-[11px]"
                         onClick={async () => {
                           if (!carbonContract) return;
                           try {
                             const tx = await carbonContract.refund(t.tradeId);
                             await tx.wait();
                             if (tokenContract && account) {
                               await refreshData(carbonContract, tokenContract, account);
                             }
                             alert('Refunded');
                           } catch (e) {
                             showFriendlyError(e, 'Refund failed');
                           }
                         }}
                       >
                         Refund Deposit
                       </Button>
                     )}
                     {!canCancel && !canFinalize && !canEndEarly && !canRefund && (
                       <span className="text-xs text-zinc-500">No actions</span>
                     )}
                  </td>
                </tr>
              )})}
              {trades.filter((t) => {
                const myDeposit = myDeposits[t.tradeId] ?? 0n;
                if (dashboardView === 'auctions') {
                  return t.seller === account;
                }
                return myDeposit > 0n;
              }).length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-8 text-center text-zinc-600">No activity yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card title="Issue Credits">
         <div className="space-y-4 mt-2">
            <Input label="User Address" placeholder="0x..." value={adminAddress} onChange={e => setAdminAddress(e.target.value)} />
            <Input label="Amount" type="number" placeholder="1000" value={adminAmount} onChange={e => setAdminAmount(e.target.value)} />
            <div className="flex gap-4">
              <Button onClick={() => handleAdminAction('issue')} className="w-full">Issue</Button>
              <Button onClick={() => handleAdminAction('destroy')} variant="danger" className="w-full">Destroy</Button>
            </div>

            <div className="border-t border-zinc-800 pt-4 mt-4 space-y-3">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Whitelist / Blacklist</div>
              <Input
                label="Manage Address"
                placeholder="0x..."
                value={adminAddress}
                onChange={e => setAdminAddress(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => handleWhitelistAction('addW')}>
                  Add to Whitelist
                </Button>
                <Button variant="secondary" onClick={() => handleWhitelistAction('removeW')}>
                  Remove from Whitelist
                </Button>
                <Button variant="danger" onClick={() => handleWhitelistAction('addB')}>
                  Add to Blacklist
                </Button>
                <Button variant="danger" onClick={() => handleWhitelistAction('removeB')}>
                  Remove from Blacklist
                </Button>
              </div>
            </div>
         </div>
      </Card>
      <Card title="System Controls">
         <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
               <div>
                 <div className="text-sm">Whitelist Mode</div>
                 <div className="text-xs text-zinc-500">
                   {whitelistOn ? 'Currently Enabled' : 'Currently Disabled'}
                 </div>
               </div>
               <Button
                 variant="secondary"
                 className="px-4"
                 onClick={handleToggleWhitelist}
               >
                 {whitelistOn ? 'Disable' : 'Enable'}
               </Button>
            </div>

            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Platform Fee</div>
                  <div className="text-xs text-zinc-500">
                    Current: {feeBps} bps (~{(feeBps / 100).toFixed(2)}%)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  label="New Fee (bps)"
                  type="number"
                  min={0}
                  max={1000}
                  value={feeBps.toString()}
                  onChange={e => setFeeBps(Number(e.target.value || '0'))}
                />
                <Button variant="secondary" className="mt-5" onClick={handleUpdateFee}>
                  Update
                </Button>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              onClick={handleBatchFinalize}
            >
              Batch Finalize Ended Trades
            </Button>
         </div>
      </Card>
      <Card title="Accounts Console" className="md:col-span-2">
         <div className="space-y-4 mt-2">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-1">
               <div className="text-xs text-zinc-500 mb-1">Addresses</div>
               <textarea
                 className="w-full h-24 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 resize-none"
                 placeholder="One or more addresses, separated by comma, space or new line"
                 value={consoleInput}
                 onChange={e => setConsoleInput(e.target.value)}
               />
               <Button
                 className="mt-3 w-full md:w-auto"
                 variant="secondary"
                 isLoading={consoleLoading}
                 onClick={handleLoadConsole}
               >
                 Load Accounts
               </Button>
             </div>
             <div className="md:col-span-2 space-y-2">
               <div className="flex items-center justify-between text-xs text-zinc-500">
                 <span>Platform Volume (from finalized trades)</span>
                 <span>
                   {formatToken(platformVolume)} USDT · {platformTradesCount} trades
                 </span>
               </div>
               <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-hidden">
                 <table className="w-full text-xs text-zinc-300">
                   <thead className="bg-zinc-950/80 text-zinc-500 uppercase">
                     <tr>
                       <th className="px-4 py-2 text-left">Address</th>
                       <th className="px-4 py-2 text-right">ETH</th>
                       <th className="px-4 py-2 text-right">USDT</th>
                       <th className="px-4 py-2 text-right">Carbon</th>
                       <th className="px-4 py-2 text-right">Frozen</th>
                       <th className="px-4 py-2 text-right">Withdrawable</th>
                     </tr>
                   </thead>
                   <tbody>
                     {consoleRows.length === 0 && (
                       <tr>
                         <td
                           colSpan={6}
                           className="px-4 py-6 text-center text-zinc-600"
                         >
                           No addresses loaded.
                         </td>
                       </tr>
                     )}
                     {consoleRows.map(row => (
                       <tr key={row.address} className="border-t border-zinc-900">
                         <td className="px-4 py-2 font-mono text-[11px]">
                           {shortenAddress(row.address)}
                         </td>
                         <td className="px-4 py-2 text-right">
                           {Number(formatEth(row.eth)).toFixed(4)}
                         </td>
                         <td className="px-4 py-2 text-right">
                           {formatToken(row.token)}
                         </td>
                         <td className="px-4 py-2 text-right">
                           {row.allowance.toString()}
                         </td>
                         <td className="px-4 py-2 text-right">
                           {row.frozen.toString()}
                         </td>
                         <td className="px-4 py-2 text-right">
                           {formatToken(row.auctionAmount)}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
         </div>
      </Card>
    </div>
  );

  if (!account) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-light text-zinc-100 tracking-tight">CarbonTrader <span className="font-semibold">Prime</span></h1>
          <p className="text-zinc-500 text-lg font-light">
            The next generation institutional carbon credit marketplace. Connect your wallet to begin.
          </p>
          <Button onClick={connectWallet} className="w-full h-12 text-base">
            <Wallet className="w-5 h-5 mr-2" /> Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-textMain font-sans selection:bg-emerald-500/30">
      
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-bold text-xs">CT</div>
            <span className="font-medium tracking-tight">CarbonTrader</span>
          </div>
          
          <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-full border border-white/5">
            {[
              { id: 'market', icon: TrendingUp, label: 'Market' },
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              ...(account.toLowerCase() === contractOwner.toLowerCase() ? [{ id: 'admin', icon: ShieldAlert, label: 'Admin' }] : [])
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewState)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-all duration-300 ${
                  view === item.id 
                    ? 'bg-zinc-800 text-zinc-100 shadow-lg' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:block text-right">
                <div className="text-xs font-medium text-zinc-300">{formatEth(userState.ethBalance).slice(0,6)} ETH</div>
                <div className="text-[10px] text-zinc-500 font-mono">{shortenAddress(account)}</div>
             </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
           <div>
              <h1 className="text-3xl font-light text-zinc-100">
                {view === 'market' && 'Carbon Marketplace'}
                {view === 'dashboard' && 'Portfolio Overview'}
                {view === 'admin' && 'System Administration'}
              </h1>
              <p className="text-zinc-500 mt-2 font-light">
                {view === 'market' && 'Discover and trade verified carbon credits.'}
                {view === 'dashboard' && 'Manage your assets and auction activity.'}
             </p>
           </div>
           {view === 'market' && (
             <Button onClick={handleOpenCreateModal}>
               <Plus className="w-4 h-4 mr-2" /> New Listing
             </Button>
           )}
        </div>

        {view === 'market' && renderMarket()}
        {view === 'dashboard' && renderDashboard()}
        {view === 'admin' && renderAdmin()}
      </main>

      {/* Modals */}

      {/* 1. Create Trade */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="List Carbon Credits">
         <div className="space-y-4">
            <Input label="Trade ID (Auto-generated)" placeholder="CT-000001" value={createForm.id} readOnly />
            <Input label="Amount (Credits)" type="number" placeholder="1000" value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: e.target.value})} />
            <Input label="Starting Total Price (USDT)" type="number" placeholder="1000" value={createForm.price} onChange={e => setCreateForm({...createForm, price: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
               <Input label="Reserve Price (Total USDT)" type="number" placeholder="Optional" value={createForm.reserve} onChange={e => setCreateForm({...createForm, reserve: e.target.value})} />
               <Input label="Buy Now Price (Total USDT)" type="number" placeholder="Optional" value={createForm.buyNow} onChange={e => setCreateForm({...createForm, buyNow: e.target.value})} />
            </div>
            <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-500">
               <AlertCircle className="w-4 h-4 inline mr-1 mb-0.5" />
               Listing will freeze your carbon credits until sold or cancelled.
            </div>
            <Button onClick={handleCreateTrade} className="w-full">Create Listing</Button>
         </div>
      </Modal>

      {/* 2. Deposit/Bid */}
      <Modal isOpen={showDepositModal.isOpen} onClose={() => setShowDepositModal({isOpen: false, tradeId: ''})} title={`Place Bid: ${showDepositModal.tradeId}`}>
         <div className="space-y-4">
            <div className="text-sm text-zinc-400 mb-4">
               Enter your total bid amount. If you have bid before, only the difference will be deducted.
            </div>
            <Input label="Total Bid Amount (USDT)" type="number" placeholder="0.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            <Button onClick={handleDeposit} className="w-full">Confirm Bid</Button>
         </div>
      </Modal>

      {/* 3. Top Up Tokens */}
      <Modal isOpen={showTopUpModal} onClose={() => setShowTopUpModal(false)} title="Acquire USDT">
         <div className="space-y-4">
            <Input label="Amount of ETH to Spend" type="number" value={ethToBuy} onChange={e => setEthToBuy(e.target.value)} />
            <div className="flex justify-between text-xs text-zinc-500 px-1">
               <span>Rate</span>
               <span>1 ETH = 1000 USDT</span>
            </div>
            <Button onClick={handleBuyTokens} className="w-full">Swap ETH for USDT</Button>
            <div className="text-xs text-zinc-500 text-center mt-2">
              Or claim <span className="text-emerald-400">1000 USDT</span> once every 24 hours from the faucet.
            </div>
            <Button onClick={handleFaucetClaim} className="w-full" variant="secondary">
              Claim Daily Faucet
            </Button>
        </div>
      </Modal>

      {/* 4. Trade Detail */}
      <Modal
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        title={selectedTrade ? `Trade Detail – ${selectedTrade.tradeId}` : 'Trade Detail'}
      >
        {selectedTrade && (
          <div className="space-y-4 text-sm text-zinc-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Seller</div>
                <div className="font-mono text-zinc-100">{shortenAddress(selectedTrade.seller)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Amount</div>
                <div>{selectedTrade.amount.toString()} Credits</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Start Time</div>
                <div>{new Date(Number(selectedTrade.startTime) * 1000).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">End Time</div>
                <div>{new Date(Number(selectedTrade.endTime) * 1000).toLocaleString()}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950/70 rounded-xl p-3">
                <div className="text-[11px] text-zinc-500 mb-1">Reserve Price</div>
                <div className="text-sm">
                  {selectedTrade.reservePrice > 0n
                    ? `${formatToken(selectedTrade.reservePrice)} USDT`
                    : '-'}
                </div>
              </div>
              <div className="bg-zinc-950/70 rounded-xl p-3">
                <div className="text-[11px] text-zinc-500 mb-1">Buy Now Price</div>
                <div className="text-sm">
                  {selectedTrade.buyNowPrice > 0n
                    ? `${formatToken(selectedTrade.buyNowPrice)} USDT`
                    : '-'}
                </div>
              </div>
              <div className="bg-zinc-950/70 rounded-xl p-3">
                <div className="text-[11px] text-zinc-500 mb-1">Status</div>
                <div className="text-sm">
                  {selectedTrade.finalized
                    ? 'Finalized'
                    : Number(selectedTrade.endTime) < Date.now() / 1000
                    ? 'Ended'
                    : 'Active'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-zinc-500 mb-1">Highest Bid</div>
                <div className="text-sm">
                  {selectedTrade.highestBid > 0n
                    ? `${formatToken(selectedTrade.highestBid)} USDT`
                    : 'No bids yet'}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Highest Bidder</div>
                <div className="text-sm">
                  {selectedTrade.highestBidder === ethers.ZeroAddress
                    ? '-'
                    : shortenAddress(selectedTrade.highestBidder)}
                </div>
              </div>
            </div>

            {account && (
              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-2">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">My Role</div>
                  <div className="text-sm">
                    {selectedTrade.seller.toLowerCase() === account.toLowerCase()
                      ? 'Seller'
                      : myDeposits[selectedTrade.tradeId] && myDeposits[selectedTrade.tradeId] > 0n
                      ? 'Bidder'
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">My Deposit</div>
                  <div className="text-sm">
                    {myDeposits[selectedTrade.tradeId] && myDeposits[selectedTrade.tradeId] > 0n
                      ? `${formatToken(myDeposits[selectedTrade.tradeId])} USDT`
                      : '0'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {account &&
                selectedTrade.seller.toLowerCase() === account.toLowerCase() &&
                !selectedTrade.finalized &&
                selectedTrade.highestBid === 0n && (
                  <Button
                    variant="secondary"
                    className="h-8 px-4 text-xs"
                    onClick={() => {
                      handleSellerCancelTrade(selectedTrade.tradeId);
                      setSelectedTrade(null);
                    }}
                  >
                    Cancel Listing
                  </Button>
                )}
              {account &&
                selectedTrade.seller.toLowerCase() === account.toLowerCase() &&
                !selectedTrade.finalized &&
                Number(selectedTrade.endTime) < Date.now() / 1000 &&
                selectedTrade.highestBid > 0n && (
                  <Button
                    variant="secondary"
                    className="h-8 px-4 text-xs"
                    onClick={() => {
                      handleFinalizeTrade(selectedTrade.tradeId);
                      setSelectedTrade(null);
                    }}
                  >
                    Settle Auction
                  </Button>
                )}
              {account &&
                selectedTrade.seller.toLowerCase() === account.toLowerCase() &&
                !selectedTrade.finalized &&
                Number(selectedTrade.endTime) >= Date.now() / 1000 &&
                selectedTrade.highestBid > 0n && (
                  <Button
                    variant="secondary"
                    className="h-8 px-4 text-xs"
                    onClick={() => {
                      handleSellerEndEarly(selectedTrade.tradeId);
                      setSelectedTrade(null);
                    }}
                  >
                    End Early
                  </Button>
                )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default App;
