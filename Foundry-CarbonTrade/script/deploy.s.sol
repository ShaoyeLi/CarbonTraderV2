// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";  // ← ADD THIS LINE
import {CarbonTrader} from "../src/CarbonTrader.sol";
import {ERC20Mock} from "../test/mocks/ERC20Mock.sol";
import {TokenSale} from "../src/TokenSale.sol";
import {TokenFaucet} from "../src/TokenFaucet.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // 部署 ERC20Mock (竞标代币，例如 USDT)
        ERC20Mock usdt = new ERC20Mock("USDT", "USDT", msg.sender, 1 * 10**24);
        
        // 部署 CarbonTrader（使用 USDT 作为竞价货币）
        CarbonTrader carbonTrader = new CarbonTrader(address(usdt));

        // 部署 TokenSale（用 ETH 兑换 USDT 的合约）
        TokenSale tokenSale = new TokenSale(address(usdt));

        // 部署 TokenFaucet（水龙头，每地址每 24h 可领 1000 代币）
        TokenFaucet faucet = new TokenFaucet(address(usdt));

        vm.stopBroadcast();
        
        // 输出地址（精简版）
        console.log("=== Deployment Summary ===");
        console.log("USDT:", address(usdt));
        console.log("CarbonTrader:", address(carbonTrader));
        console.log("TokenSale:", address(tokenSale));
        console.log("TokenFaucet:", address(faucet));

        // 将部署信息写入 JSON 文件，供前端读取
        string memory root = "deploy";
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "USDT", address(usdt));
        vm.serializeAddress(root, "CarbonTrader", address(carbonTrader));
        vm.serializeAddress(root, "TokenSale", address(tokenSale));
        string memory json = vm.serializeAddress(
            root,
            "TokenFaucet",
            address(faucet)
        );

        // 写入到 deployments/latest.json
        vm.writeJson(json, "deployments/latest.json");
    }
}
