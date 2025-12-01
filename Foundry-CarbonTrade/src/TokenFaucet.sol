// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IMintableERC20 is IERC20 {
    function mint(address account, uint256 amount) external;
}

/// @title TokenFaucet
/// @notice Simple faucet that lets each address claim a fixed amount of tokens once per interval.
contract TokenFaucet {
    IMintableERC20 public immutable token;
    address public immutable owner;

    uint256 public constant CLAIM_AMOUNT = 1_000 * 1e18; // 1000 tokens (18 decimals)
    uint256 public constant CLAIM_INTERVAL = 24 hours;

    mapping(address => uint256) public lastClaimAt;

    event Claimed(address indexed user, uint256 amount);

    constructor(address tokenAddress) {
        owner = msg.sender;
        token = IMintableERC20(tokenAddress);
    }

    function claim() external {
        uint256 last = lastClaimAt[msg.sender];
        require(
            block.timestamp - last >= CLAIM_INTERVAL,
            "Claim too soon"
        );

        lastClaimAt[msg.sender] = block.timestamp;
        token.mint(msg.sender, CLAIM_AMOUNT);

        emit Claimed(msg.sender, CLAIM_AMOUNT);
    }
}

