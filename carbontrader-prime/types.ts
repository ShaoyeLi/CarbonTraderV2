export interface Trade {
  seller: string;
  amount: bigint;
  startamount: bigint;
  priceOfUnit: bigint;
  startTime: bigint;
  endTime: bigint;
  highestBidder: string;
  highestBid: bigint;
  finalized: boolean;
  reservePrice: bigint;
  buyNowPrice: bigint;
  buyNowUsed: boolean;
  tradeId: string;
}

export interface Bid {
  bidder: string;
  amount: bigint;
  info: string;
}

export interface AppConfig {
  carbonAddr: string;
  tokenAddr: string;
  saleAddr: string;
  faucetAddr: string;
}

export interface UserState {
  ethBalance: bigint;
  tokenBalance: bigint;
  carbonAllowance: bigint;
  carbonFrozen: bigint;
  auctionAmount: bigint; // Withdrawable
}

export type ViewState = 'market' | 'dashboard' | 'admin';

export const ABIs = {
  CarbonTrader: [
    "function owner() view returns (address)",
    "function issueAllowance(address user, uint256 amount) external",
    "function getAllowance(address user) view returns (uint256)",
    "function freezeAllowance(address user, uint256 amount) external",
    "function unfreezeAllowance(address user, uint256 amount) external",
    "function getFrozenAllowance(address user) view returns (uint256)",
    "function getAuctionAmount(address user) view returns (uint256)",
    "function whitelistEnabled() view returns (bool)",
    "function feeBasisPoints() view returns (uint256)",
    "function destroyAllowance(address user, uint256 amount) external",
    "function destroyAllAllowance(address user) external",
    "function setFeeBasisPoints(uint256 newFee) external",
    "function setWhitelistEnabled(bool enabled) external",
    "function addToWhitelist(address user) external",
    "function removeFromWhitelist(address user) external",
    "function addToBlacklist(address user) external",
    "function removeFromBlacklist(address user) external",
    "function createTrade(string tradeId, uint256 _amount, uint256 _startamount, uint256 _priceOfUnit, uint256 _startTime, uint256 _endTime) external",
    "function setTradePrices(string tradeId, uint256 _reservePrice, uint256 _buyNowPrice) external",
    "function buyNow(string tradeId) external",
    "function cancelTrade(string tradeId) external",
    "function sellerFinalizeEarly(string tradeId) external",
    "function getTrade(string tradeId) view returns (address, uint256, uint256, uint256, uint256, uint256)",
    "function getTradeStatus(string tradeId) view returns (address, uint256, bool)",
    "function getTradePrices(string tradeId) view returns (uint256, uint256, bool)",
    "function deposit(string tradeId, uint256 amount, string info) external",
    "function getDeposit(string tradeId) view returns (uint256)",
    "function refund(string tradeId) external",
    "function finalizeAuctionAndTransferCarbon(string tradeId) external",
    "function batchFinalize(string[] tradeIds) external",
    "function withdrawAuctionAmount() external",
    "event NewTrade(address indexed seller, string tradeId, uint256 amount, uint256 startamount, uint256 priceOfUnit, uint256 startTime, uint256 endTime)",
    "event BidPlaced(string tradeId, address indexed bidder, uint256 amount, string info)",
    "event TradeFinalized(string tradeId, address winner, uint256 paidAmount, uint256 carbonAmount)"
  ],
  ERC20: [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ],
  TokenSale: [
    "function buyTokens() payable"
  ],
  Faucet: [
    "function claim() external"
  ]
};
