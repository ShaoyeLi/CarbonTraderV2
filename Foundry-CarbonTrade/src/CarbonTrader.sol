// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./CarbonTraderStorage.sol";

// 管理碳积分与拍卖逻辑的主合约，实现业务逻辑，状态与权限在 CarbonTraderStorage 中定义
contract CarbonTrader is CarbonTraderStorage {
    constructor(address tokenAddress) CarbonTraderStorage(tokenAddress) {}

    // ===== 基础查询与管理员操作 =====

    function issueAllowance(address user, uint256 amount) public onlyOwner {
        userToAllowance[user] += amount;
    }

    function getAllowance(address user) public view returns (uint256) {
        return userToAllowance[user];
    }

    function freezeAllowance(address user, uint256 amount) public onlyOwner {
        userToAllowance[user] -= amount;
        userToFrozenAllowance[user] += amount;
    }

    function unfreezeAllowance(address user, uint256 amount) public onlyOwner {
        userToAllowance[user] += amount;
        userToFrozenAllowance[user] -= amount;
    }

    function getFrozenAllowance(address user) public view returns (uint256) {
        return userToFrozenAllowance[user];
    }

    function getAuctionAmount(address user) public view returns (uint256) {
        return auctionAmount[user];
    }

    function destroyAllowance(address user, uint256 amount) public onlyOwner {
        userToAllowance[user] -= amount;
    }

    function destroyAllAllowance(address user) public onlyOwner {
        userToAllowance[user] = 0;
    }

    function setFeeBasisPoints(uint256 newFee) external onlyOwner {
        // 上限 10%（1000 基点），避免误操作设置过高费率
        if (newFee > 1000) revert CarbonTrader_ParamError();
        feeBasisPoints = newFee;
    }

    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
    }

    function addToWhitelist(address user) external onlyOwner {
        whitelisted[user] = true;
    }

    function removeFromWhitelist(address user) external onlyOwner {
        whitelisted[user] = false;
    }

    function addToBlacklist(address user) external onlyOwner {
        blacklisted[user] = true;
    }

    function removeFromBlacklist(address user) external onlyOwner {
        blacklisted[user] = false;
    }

    // ===== 拍卖创建与查询 =====

    function createTrade(
        string memory tradeId,
        uint256 _amount,
        uint256 _startamount,
        uint256 _priceOfUnit,
        uint256 _startTime,
        uint256 _endTime
    ) public {
        _checkAllowed(msg.sender);
        if (idToTrade[tradeId].seller != address(0) && !idToTrade[tradeId].finalized)
            revert CarbonTrader_TradeAlreadyExists();
        if (
            _amount <= 0 ||
            _amount > userToAllowance[msg.sender] ||
            _startamount <= 0 ||
            _priceOfUnit <= 0 ||
            _startTime >= _endTime
        ) revert CarbonTrader_ParamError();

        Trade storage newTrade = idToTrade[tradeId];
        newTrade.seller = msg.sender;
        newTrade.amount = _amount;
        newTrade.startamount = _startamount;
        newTrade.priceOfUnit = _priceOfUnit;
        newTrade.startTime = _startTime;
        newTrade.endTime = _endTime;
        newTrade.highestBidder = address(0);
        newTrade.highestBid = 0;
        newTrade.finalized = false;
        newTrade.reservePrice = 0;
        newTrade.buyNowPrice = 0;
        newTrade.buyNowUsed = false;
        userToAllowance[msg.sender] -= _amount;
        userToFrozenAllowance[msg.sender] += _amount;

        emit NewTrade(
            msg.sender,
            tradeId,
            _amount,
            _startamount,
            _priceOfUnit,
            _startTime,
            _endTime
        );
    }

    function getTrade(string memory tradeId)
        public
        view
        returns (
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        if (idToTrade[tradeId].seller == address(0)) revert CarbonTrader_TradeNotExist();
        return (
            idToTrade[tradeId].seller,
            idToTrade[tradeId].amount,
            idToTrade[tradeId].startamount,
            idToTrade[tradeId].priceOfUnit,
            idToTrade[tradeId].startTime,
            idToTrade[tradeId].endTime
        );
    }

    function getTradeStatus(string memory tradeId)
        public
        view
        returns (
            address,
            uint256,
            bool
        )
    {
        if (idToTrade[tradeId].seller == address(0)) revert CarbonTrader_TradeNotExist();
        Trade storage t = idToTrade[tradeId];
        return (t.highestBidder, t.highestBid, t.finalized);
    }

    function getTradePrices(string memory tradeId)
        public
        view
        returns (
            uint256,
            uint256,
            bool
        )
    {
        if (idToTrade[tradeId].seller == address(0)) revert CarbonTrader_TradeNotExist();
        Trade storage t = idToTrade[tradeId];
        return (t.reservePrice, t.buyNowPrice, t.buyNowUsed);
    }

    // ===== 出价、退款、信息设置 =====

    function deposit(
        string memory tradeId,
        uint256 amount,
        string memory info
    ) public {
        Trade storage currentTrade = idToTrade[tradeId];
        _checkAllowed(msg.sender);
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        if (currentTrade.finalized) revert CarbonTrader_TradeFinalized();
        if (block.timestamp < currentTrade.startTime) revert CarbonTrader_AuctionNotStarted();
        if (block.timestamp >= currentTrade.endTime) revert CarbonTrader_AuctionEnded();
        if (msg.sender == currentTrade.seller) revert CarbonTrader_SellerCannotBidOwnAuction();
        if (amount <= currentTrade.highestBid || amount == 0) revert CarbonTrader_BidTooLow();

        uint256 prevBid = currentTrade.deposit[msg.sender];
        if (amount <= prevBid) revert CarbonTrader_BidTooLow();

        uint256 delta = amount - prevBid;

        bool success = token.transferFrom(msg.sender, address(this), delta);
        if (!success) revert CarbonTrader_NotEnoughDeposit();

        currentTrade.deposit[msg.sender] = amount;
        currentTrade.highestBidder = msg.sender;
        currentTrade.highestBid = amount;

        emit BidPlaced(tradeId, msg.sender, amount, info);
    }

    function getDeposit(string memory tradeId) public view returns (uint256) {
        return idToTrade[tradeId].deposit[msg.sender];
    }

    function refund(string memory tradeId) public {
        Trade storage currentTrade = idToTrade[tradeId];
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        uint256 depositAmount = currentTrade.deposit[msg.sender];
        if (depositAmount == 0) revert CarbonTrader_NoDeposit();

        if (msg.sender == currentTrade.highestBidder && !currentTrade.finalized)
            revert CarbonTrader_StillHighestBidder();

        currentTrade.deposit[msg.sender] = 0;

        bool success = token.transfer(msg.sender, depositAmount);
        if (!success) {
            currentTrade.deposit[msg.sender] = depositAmount;
            revert CarbonTrader_RefoundFailed();
        }
        emit BidRefunded(tradeId, msg.sender, depositAmount);
    }

    // 允许卖家在无人出价的前提下取消拍卖，将冻结的碳积分退回
    function cancelTrade(string memory tradeId) external {
        Trade storage currentTrade = idToTrade[tradeId];
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        if (msg.sender != currentTrade.seller) revert CarbonTrader_NotSellerOrOwner();
        if (currentTrade.finalized) revert CarbonTrader_TradeFinalized();
        if (currentTrade.highestBidder != address(0) || currentTrade.highestBid != 0)
            revert CarbonTrader_NoBids();

        if (userToFrozenAllowance[currentTrade.seller] < currentTrade.amount)
            revert CarbonTrader_ParamError();

        userToFrozenAllowance[currentTrade.seller] -= currentTrade.amount;
        userToAllowance[currentTrade.seller] += currentTrade.amount;
        currentTrade.finalized = true;
    }

    // ===== 保留价 / 一口价 =====

    function setTradePrices(
        string memory tradeId,
        uint256 _reservePrice,
        uint256 _buyNowPrice
    ) public {
        Trade storage currentTrade = idToTrade[tradeId];
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        if (currentTrade.finalized) revert CarbonTrader_TradeFinalized();
        if (msg.sender != currentTrade.seller && msg.sender != owner())
            revert CarbonTrader_NotSellerOrOwner();
        if (_buyNowPrice != 0 && _buyNowPrice < _reservePrice)
            revert CarbonTrader_ParamError();

        currentTrade.reservePrice = _reservePrice;
        currentTrade.buyNowPrice = _buyNowPrice;
    }

    function buyNow(string memory tradeId) external {
        Trade storage currentTrade = idToTrade[tradeId];
        _checkAllowed(msg.sender);
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        if (currentTrade.finalized) revert CarbonTrader_TradeFinalized();
        if (currentTrade.buyNowPrice == 0) revert CarbonTrader_BuyNowDisabled();
        if (block.timestamp < currentTrade.startTime) revert CarbonTrader_AuctionNotStarted();
        if (block.timestamp >= currentTrade.endTime) revert CarbonTrader_AuctionEnded();
        if (msg.sender == currentTrade.seller) revert CarbonTrader_SellerCannotBidOwnAuction();

        uint256 price = currentTrade.buyNowPrice;
        bool success = token.transferFrom(msg.sender, address(this), price);
        if (!success) revert CarbonTrader_NotEnoughDeposit();

        uint256 fee = (price * feeBasisPoints) / 10000;
        uint256 sellerAmount = price - fee;
        auctionAmount[currentTrade.seller] += sellerAmount;
        auctionAmount[FEE_RECIPIENT] += fee;

        if (userToFrozenAllowance[currentTrade.seller] < currentTrade.amount)
            revert CarbonTrader_ParamError();
        userToFrozenAllowance[currentTrade.seller] -= currentTrade.amount;
        userToAllowance[msg.sender] += currentTrade.amount;

        currentTrade.finalized = true;
        currentTrade.buyNowUsed = true;

        emit TradeFinalized(tradeId, msg.sender, price, currentTrade.amount);
    }

    // ===== 结算与提现 =====

    function finalizeAuctionAndTransferCarbon(string memory tradeId) public {
        _finalize(tradeId, false);
    }

    // 允许卖家在拍卖尚未到期时主动根据当前最高价结算拍卖
    function sellerFinalizeEarly(string memory tradeId) public {
        Trade storage currentTrade = idToTrade[tradeId];
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        if (msg.sender != currentTrade.seller) revert CarbonTrader_NotSellerOrOwner();
        _finalize(tradeId, true);
    }

    function _finalize(string memory tradeId, bool ignoreTimeCheck) internal {
        Trade storage currentTrade = idToTrade[tradeId];
        if (currentTrade.seller == address(0)) revert CarbonTrader_TradeNotExist();
        if (currentTrade.finalized) revert CarbonTrader_TradeFinalized();
        if (!ignoreTimeCheck && block.timestamp < currentTrade.endTime)
            revert CarbonTrader_AuctionNotStarted();
        if (currentTrade.highestBidder == address(0) || currentTrade.highestBid == 0)
            revert CarbonTrader_NoBids();

        if (
            currentTrade.reservePrice != 0 &&
            currentTrade.highestBid < currentTrade.reservePrice
        ) {
            if (userToFrozenAllowance[currentTrade.seller] < currentTrade.amount)
                revert CarbonTrader_ParamError();
            userToFrozenAllowance[currentTrade.seller] -= currentTrade.amount;
            userToAllowance[currentTrade.seller] += currentTrade.amount;
            currentTrade.finalized = true;
            emit TradeFinalized(tradeId, address(0), 0, 0);
            return;
        }

        address winner = currentTrade.highestBidder;
        uint256 paidAmount = currentTrade.highestBid;

        if (userToFrozenAllowance[currentTrade.seller] < currentTrade.amount)
            revert CarbonTrader_ParamError();

        userToFrozenAllowance[currentTrade.seller] -= currentTrade.amount;
        userToAllowance[winner] += currentTrade.amount;

        uint256 fee = (paidAmount * feeBasisPoints) / 10000;
        uint256 sellerAmount = paidAmount - fee;
        auctionAmount[currentTrade.seller] += sellerAmount;
        auctionAmount[FEE_RECIPIENT] += fee;

        currentTrade.deposit[winner] = 0;
        currentTrade.finalized = true;
        currentTrade.highestBid = 0;

        emit TradeFinalized(tradeId, winner, paidAmount, currentTrade.amount);
    }

    function batchFinalize(string[] memory tradeIds) external onlyOwner {
        for (uint256 i = 0; i < tradeIds.length; i++) {
            _finalize(tradeIds[i], false);
        }
    }

    function withdrawAuctionAmount() public {
        _checkAllowed(msg.sender);
        uint256 withdrawAmount = auctionAmount[msg.sender];
        auctionAmount[msg.sender] = 0;
        bool success = token.transfer(msg.sender, withdrawAmount);
        if (!success) {
            auctionAmount[msg.sender] = withdrawAmount;
            revert CarbonTrader_TransferFailed();
        }
    }
}
