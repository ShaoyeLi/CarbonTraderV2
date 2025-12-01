// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

error CarbonTrader_NotOwner();
error CarbonTrader_ParamError();
error CarbonTrader_TransferFailed();
error CarbonTrader_NotEnoughDeposit();
error CarbonTrader_TradeNotExist();
error CarbonTrader_RefoundFailed();
error CarbonTrader_FinalizeAuctionFailed();
error CarbonTrader_TradeAlreadyExists();
error CarbonTrader_TradeFinalized();
error CarbonTrader_AuctionNotStarted();
error CarbonTrader_AuctionEnded();
error CarbonTrader_BidTooLow();
error CarbonTrader_NoBids();
error CarbonTrader_StillHighestBidder();
error CarbonTrader_NotSellerOrOwner();
error CarbonTrader_NoDeposit();
error CarbonTrader_SellerCannotBidOwnAuction();
error CarbonTrader_Blacklisted();
error CarbonTrader_NotWhitelisted();
error CarbonTrader_BuyNowDisabled();

contract CarbonTraderStorage {
    event NewTrade(
        address indexed seller,
        string tradeId,
        uint256 amount,
        uint256 startamount,
        uint256 priceOfUnit,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        string tradeId,
        address indexed bidder,
        uint256 amount,
        string info
    );

    event BidRefunded(
        string tradeId,
        address indexed bidder,
        uint256 amount
    );

    event TradeFinalized(
        string tradeId,
        address winner,
        uint256 paidAmount,
        uint256 carbonAmount
    );

    struct Trade {
        address seller;
        uint256 amount;
        uint256 startamount;
        uint256 priceOfUnit;
        uint256 startTime;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool finalized;
        uint256 reservePrice;
        uint256 buyNowPrice;
        bool buyNowUsed;
        mapping(address => uint256) deposit;
    }

    mapping(address => uint256) internal userToAllowance;
    mapping(address => uint256) internal userToFrozenAllowance;
    mapping(address => uint256) internal auctionAmount;
    mapping(string => Trade) internal idToTrade;

    mapping(address => bool) public blacklisted;
    mapping(address => bool) public whitelisted;
    bool public whitelistEnabled;

    address internal immutable OWNER;
    address internal immutable FEE_RECIPIENT;
    uint256 public feeBasisPoints; // 手续费，基点制表示（100 = 1%）
    IERC20 internal token;

    constructor(address tokenAddress) {
        OWNER = msg.sender;
        FEE_RECIPIENT = msg.sender;
        token = IERC20(tokenAddress);
        feeBasisPoints = 100; // 默认 1%
    }

    function owner() public view returns (address) {
        return OWNER;
    }

    function feeRecipient() public view returns (address) {
        return FEE_RECIPIENT;
    }

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != OWNER) revert CarbonTrader_NotOwner();
    }

    function _checkAllowed(address user) internal view {
        if (blacklisted[user]) revert CarbonTrader_Blacklisted();
        if (whitelistEnabled && !whitelisted[user]) revert CarbonTrader_NotWhitelisted();
    }
}
