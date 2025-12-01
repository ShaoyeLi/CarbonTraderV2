// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IMintableERC20 is IERC20 {
    function mint(address account, uint256 amount) external;
}

contract TokenSale {
    IMintableERC20 public immutable token;
    address public immutable owner;

    // 每 1 ETH 可以兑换多少代币（不考虑小数，直接按 1e18 wei 计算）
    uint256 public constant RATE = 1_000 * 1e18; // 1 ETH -> 1000 代币（18位）

    event TokensPurchased(address indexed buyer, uint256 ethPaid, uint256 tokensMinted);
    event EthWithdrawn(address indexed to, uint256 amount);

    constructor(address tokenAddress) {
        owner = msg.sender;
        token = IMintableERC20(tokenAddress);
    }

    receive() external payable {
        buyTokens();
    }

    function buyTokens() public payable {
        require(msg.value > 0, "No ETH sent");
        uint256 amount = (msg.value * RATE) / 1e18;
        token.mint(msg.sender, amount);
        emit TokensPurchased(msg.sender, msg.value, amount);
    }

    function withdrawETH(address payable to, uint256 amount) external {
        require(msg.sender == owner, "Not owner");
        if (amount == 0 || amount > address(this).balance) {
            amount = address(this).balance;
        }
        to.transfer(amount);
        emit EthWithdrawn(to, amount);
    }
}

