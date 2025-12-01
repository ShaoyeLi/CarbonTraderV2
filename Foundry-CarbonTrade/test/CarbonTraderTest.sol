// SPDX-License-Identifier: MIT

pragma solidity ^0.8.12;
//import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {CarbonTrader} from "../src/CarbonTrader.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";


contract CarbonTraderTest is Test{
    CarbonTrader carbonTrader;//新建一个CarbonTrader合约实例
    ERC20Mock usdtToken;     //新建一个模拟的ERC20代币实例，作为USDT使用

    address owner = address(this);
    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {  //在每个测试用例执行前运行，进行初始化操作
    usdtToken = new ERC20Mock("USDT", "USDT", address(this), 1*10**24); //部署一个模拟的USDT合约，并铸造初始代币，数目为1百万个USDT
    carbonTrader = new CarbonTrader(address(usdtToken)); //部署CarbonTrader合约
    }

    function testIssueAllowance() public {
        carbonTrader.issueAllowance(address(this), 1000);
        assertEq (carbonTrader.getAllowance(owner),1000);  //Eq是equal

    }

    function testFreezeAllowance() public{
        carbonTrader.issueAllowance(owner,500);
        carbonTrader.freezeAllowance(owner,200);
        assertEq(carbonTrader.getFrozenAllowance(owner),200);
    }

    function testUnfreezeAllowance() public{
        carbonTrader.issueAllowance(owner,1000);
        carbonTrader.freezeAllowance(owner,600);
        carbonTrader.unfreezeAllowance(owner,100);
        assertEq(carbonTrader.getFrozenAllowance(owner),500);   //单个测试函数:"forge test -mt testUnfreezeAllowance"mt表示match test
    }

    function testDestroyAllowance() public {
        carbonTrader.issueAllowance(owner,1000);
        carbonTrader.destroyAllowance(owner,600);
        assertEq(carbonTrader.getAllowance(owner),400);

        vm.prank(user1); //模拟user1地址调用下面的函数
        vm.expectRevert(); //期待下面的函数调用会报错
        carbonTrader.destroyAllAllowance(owner);
        assertEq(carbonTrader.getAllowance(owner),400);

        vm.prank(owner); //模拟user1地址调用下面的函数
        carbonTrader.destroyAllAllowance(owner);
        assertEq(carbonTrader.getAllowance(owner),0);
    }

    function testCreateTrade() public{
        string memory tradeId = "tradeId";
        carbonTrader.issueAllowance(owner,300);

        carbonTrader.createTrade(
            tradeId,
            300,
            100,
            10,
            block.timestamp,
            block.timestamp + 1000 //单位是秒
        );

        (address seller,uint256 amount,,,,) = carbonTrader.getTrade(tradeId);
        assertEq(seller,owner);
        assertEq(amount,300);
    
    }

    function testDeposit()public {
        string memory tradeId = "tradeId";
        carbonTrader.issueAllowance(owner,300);
        //owner先创建交易拿出300个碳排放权，后面面user2才能购买
        carbonTrader.createTrade(
            tradeId,
            300,
            100,
            10,
            block.timestamp,
            block.timestamp + 1000 //单位是秒
        );
        //给user2铸造一个代币
        usdtToken.mint(user2, 1*10**6); //这是1个代币

        vm.prank(user2); //模拟user2地址调用下面的函数
        usdtToken.approve(address(carbonTrader),1*10**6); //user2批准CarbonTrader合约花费1个代币
        
        vm.prank(user2);
        carbonTrader.deposit(tradeId, 1*10**6, "info");//deposit函数里有msg.sender，所以要用prank模拟user2调用,不模拟的话，默认身份是owner
        
        vm.prank(user2);
        assertEq(carbonTrader.getDeposit(tradeId), 1*10**6); //getDeposit函数里有msg.sender，所以要用prank模拟user2调用
    }

    function testRefund()public {
        string memory tradeId = "tradeId";
        carbonTrader.issueAllowance(owner,300);
        //owner先创建交易拿出300个碳排放权，后面面user2才能购买
        carbonTrader.createTrade(
            tradeId,
            300,
            100,
            10,
            block.timestamp,
            block.timestamp + 1000 //单位是秒
        );
        //给user2铸造一个代币
        usdtToken.mint(user2, 1*10**6); //这是1个代币

        vm.prank(user2); //模拟user2地址调用下面的函数
        usdtToken.approve(address(carbonTrader),1*10**6); //user2批准CarbonTrader合约花费1个代币
        
        vm.prank(user2);
        carbonTrader.deposit(tradeId, 1*10**6, "info");

        assertEq(usdtToken.balanceOf(address(carbonTrader)), 1*10**6); //断言CarbonTrader合约的代币余额是1个代币

        vm.prank(user2);
        carbonTrader.refund(tradeId);

        vm.prank(user2);
        assertEq(carbonTrader.getDeposit(tradeId), 0); 
        assertEq(usdtToken.balanceOf(address(carbonTrader)), 0);
        assertEq(usdtToken.balanceOf(user2), 1*10**6);
    }


    function testFinalizeAuctionAndTransferCarbon() public{
        string memory tradeId = "tradeId";
        carbonTrader.issueAllowance(owner, 500);
        //owner先创建交易拿出500个碳排放权，后面面user2才能购买

        carbonTrader.createTrade(
            tradeId,
            500,
            100,
            10,
            block.timestamp,
            block.timestamp + 1000 //单位是秒
        );
        //给user2铸造一个代币
        usdtToken.mint(user2, 1.5*10**6); //这是1.5个代币

        vm.prank(user2); //模拟user2地址调用下面的函数
        usdtToken.approve(address(carbonTrader), 1.5*10**6); //user2批准CarbonTrader合约花费1个代币
        
        vm.prank(user2);
        carbonTrader.deposit(tradeId, 1*10**6, "info");

        // 快进时间到结束
        vm.warp(block.timestamp + 1001);

        vm.prank(user2);
        carbonTrader.finalizeAuctionAndTransferCarbon(tradeId);

        // 1.5e6 初始 - 1e6 押金 = 0.5e6
        assertEq(usdtToken.balanceOf(user2), 0.5*10**6);
        assertEq(carbonTrader.getAllowance(user2), 500);
    }

}


