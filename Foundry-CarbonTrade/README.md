## 测试网体验账号说明

本仓库在 Sepolia 测试网预留了一个**仅供演示使用的测试账号**，方便体验完整前后端流程。请勿在此账号上存放任何真实资产。

- 测试网：Sepolia  
- 账户私钥（仅用于测试）：  
  `50a1978d6fca900d0ea122307860b26b33f8eb8fb57d68fb66975d75e1834a05`  
- 说明：
  - 该账号在部署时已经被发放了约 1000 个碳积分（allowance），可用于挂单和出价测试。
  - 该私钥是公开的，在任何环境都**不要**转入真实资产，仅适用于测试网交互。
  - 你可以在 MetaMask / Rabby 等钱包中通过“导入账户”使用此私钥登录前端，直接体验完整拍卖流程。

---

### 推荐体验流程

1. 准备钱包与网络  
   - 在 MetaMask / Rabby 中通过“导入账户”使用上述测试私钥。  
   - 将钱包网络切换到 **Sepolia**。  
   - 如需少量测试 ETH，可通过公开水龙头领取（仅用于支付 gas）。

2. 打开前端  
   - 本地体验：  
     ```bash
     cd carbontrader-prime
     npm install
     npm run dev
     ```  
     浏览器访问 `http://localhost:5173`（或 Vite 输出的本地地址）。  
   - 或访问你在 Vercel 上部署的前端地址（例如 `https://<your-app>.vercel.app`）。

3. 连接钱包  
   - 打开前端首页，点击 `Connect Wallet`。  
   - 确认钱包弹窗，连接刚才导入的 Sepolia 测试账号。  
   - 顶部右侧会显示该账号的 ETH 余额、缩写地址。

4. 获取 USDT（竞标代币）  
   - 进入 `Dashboard`，在顶部卡片中找到 `USDT Balance`，点击 `Top Up`。  
   - 在弹出的 `Acquire USDT` 中：  
     - 输入少量 `Amount of ETH to Spend`，点击 `Swap ETH for USDT`（调用 `TokenSale.buyTokens()`）。  
     - 或直接点击 `Claim Daily Faucet`，每 24 小时可领取 1000 个测试 USDT。

5. 创建一场拍卖（卖家视角）  
   - 确保该账号已经有一定数量的碳积分（本测试账号默认约 1000）。  
   - 切换到 `Market` 页面，点击右上角 `New Listing`：  
     - `Trade ID` 会自动填充为形如 `CT-100001` 的编号。  
     - `Amount (Credits)`：填写要挂单的碳积分数量，例如 `100`。  
     - `Starting Total Price (USDT)`：填写整笔起拍总价，例如 `1000`。  
     - 如有需要，可填写 `Reserve Price (Total USDT)` 和 `Buy Now Price (Total USDT)`。  
     - 点击 `Create Listing`，等待交易确认。  
   - 完成后，在 `Market` 列表中可以看到新挂出的拍卖卡片。

6. 参与出价与提前结束（买家/卖家视角）  
   - 使用 **另一个 Sepolia 账户** 连接前端，作为买家：  
     - 在 `Market` 中找到该挂单，点击 `Place Bid` 输入总出价金额（USDT），前端会自动完成 `approve + deposit`。  
     - 若设置了一口价，可直接点击 `Buy Now` 完成一口价成交。  
   - 再切回卖家账号：  
     - 若拍卖未到结束时间且已有出价，可在卡片上点击 `End Auction Now`（或在 `Dashboard → My Auctions` 中使用 `End Early`）提前结算。  
     - 若拍卖已结束且有最高价，可在卡片或 Dashboard 中点击 `Settle Auction` 正常结算。

7. 退款与提现（买家/卖家收尾）  
   - 买家退款：  
     - 在 `Dashboard → My Bids` 中，查看自己参与的拍卖。  
     - 对于未中标或已流拍/已结算的拍卖，点击 `Refund Deposit` 退回押金。  
   - 卖家提现：  
     - 在 `Dashboard` 顶部 `Pending Revenue` 卡片中，点击 `Claim` 调用 `withdrawAuctionAmount()`，将已结算收入提到自己钱包。


---

## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <anvil_第0个账户私钥> \
  --broadcast -vvvv
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## 前端与系统结构说明（交接给前端开发）

本节是给前端开发同事看的简要说明，帮助在已有合约与业务逻辑基础上重构 UI。

### 1. 项目结构总览

- 合约层：
  - `src/CarbonTraderStorage.sol`：存储布局、事件、错误码、权限与名单检查。
  - `src/CarbonTrader.sol`：主业务逻辑（碳积分、拍卖、保留价/一口价、手续费、黑/白名单）。
  - `src/TokenSale.sol`：ETH → 竞标代币（USDTMock）的兑换逻辑。
  - `src/TokenFaucet.sol`：简单水龙头合约，每个地址每 24 小时可领取固定额度测试代币。
- 部署与测试：
  - `script/deploy.s.sol`：本地或测试网一键部署脚本，会依次部署 `ERC20Mock`、`CarbonTrader`、`TokenSale`、`TokenFaucet`。
  - `test/CarbonTraderTest.sol`：基础单元测试，验证主要拍卖流程。
- 前端原型：
  - `frontend/index.html`：单页应用入口（调试/教学版 UI）。
  - `frontend/main.js`：使用 ethers v6 与合约交互的逻辑。
  - `frontend/style.css`：简单样式。
  - `carbontrader-prime/`：基于 React + Vite 的新版前端实现，推荐在此目录继续演进产品级 UI。

对前端重构而言，可以将合约视为固定的“后端 API”，在新的 React/Vue/Svelte 应用中直接复用。

### 2. 对前端而言的关键合约 API

以下为前端侧经常调用的核心函数（仅列出名称和用途，具体参数见合约）：

- `CarbonTrader`（碳积分 + 拍卖引擎）
  - 管理员：
    - `owner()`：返回管理员地址。
    - `issueAllowance(address user, uint256 amount)`：发行碳积分。
    - `destroyAllowance(address user, uint256 amount)` / `destroyAllAllowance(address user)`：销毁碳积分。
    - `setFeeBasisPoints(uint256 newFee)`：设置平台手续费（基点，100 = 1%，上限 1000 = 10%）。
    - `setWhitelistEnabled(bool enabled)`：开启/关闭仅白名单参与模式。
    - `addToWhitelist(address)` / `removeFromWhitelist(address)`：维护白名单。
    - `addToBlacklist(address)` / `removeFromBlacklist(address)`：维护黑名单。
    - `batchFinalize(string[] tradeIds)`：批量结算可结算的拍卖。
  - 卖家：
    - `createTrade(string tradeId, uint256 amount, uint256 startamount, uint256 priceOfUnit, uint256 startTime, uint256 endTime)`：创建拍卖并自动冻结碳积分。
    - `setTradePrices(string tradeId, uint256 reservePrice, uint256 buyNowPrice)`：设置保留价与一口价。
    - `finalizeAuctionAndTransferCarbon(string tradeId)`：在拍卖结束后手动结算单个拍卖。
    - `sellerFinalizeEarly(string tradeId)`：卖家在拍卖进行中基于当前最高出价提前结算单个拍卖。
    - `cancelTrade(string tradeId)`：在无人出价的前提下，卖家可以取消已上架的拍卖并解冻碳积分。
    - `withdrawAuctionAmount()`：提现卖家累计收入（和平台手续费）。
  - 买家：
    - `deposit(string tradeId, uint256 amount, string info)`：出价，内部仅对新增金额 `delta` 扣款。
    - `buyNow(string tradeId)`：按一口价立即成交。
    - `refund(string tradeId)`：非最高出价者或流拍/已结算后取回押金。
  - 查询：
    - `getTrade(string tradeId)`：返回卖家、拍卖参数。
    - `getTradeStatus(string tradeId)`：返回最高出价者、最高出价、是否已最终化。
    - `getTradePrices(string tradeId)`：返回保留价、买断价以及当前是否已通过一口价成交。
    - `getDeposit(string tradeId)`：当前地址在该拍卖下的押金。
    - `getAllowance(address)` / `getFrozenAllowance(address)`：可用/冻结碳积分。
    - `getAuctionAmount(address)`：待提现金额（卖家收入与平台手续费）。
    - `whitelistEnabled()`：当前是否开启白名单模式。
    - `feeBasisPoints()`：当前手续费基点设置。

- `TokenSale`（代币兑换）
  - `buyTokens()`：`payable`，用 ETH 兑换竞标代币。
  - `withdrawETH(address to, uint256 amount)`：管理员提取合约中累计的 ETH。

- `TokenFaucet`（测试用水龙头）
  - `claim()`：每个地址每 24 小时可领取固定数量的测试代币（当前为 1000 单位）。

前端重构时，**请不要随意更改这些函数名或参数**。如需新增功能，应与合约侧协同修改与更新文档。

### 3. 推荐的前端页面/模块划分

新的前端（无论使用 React/Vue/Svelte）建议按照以下业务模块组织路由和组件：

- `Market / 市场页`：
  - 展示所有拍卖卡片（进行中/即将开始/已结束），基于 `NewTrade` 事件与状态读取。
  - 支持按状态/卖家/价格等过滤。
  - 点击某个拍卖进入“拍卖详情页”。
- `Auction Detail / 拍卖详情页`：
  - 显示拍卖参数、出价记录、当前最高价、倒计时。
  - 用户操作：
    - 出价（内部完成 `approve + deposit` 两步）。
    - 一口价购买（`buyNow`）。
    - 流拍/未中标后的退款（`refund`）。
  - 卖家操作（当 `seller == currentAccount` 时显示）：
    - 设置保留价、一口价。
    - 手动结算：
      - 拍卖结束后结算（`finalizeAuctionAndTransferCarbon`）。
      - 拍卖进行中基于当前最高价提前结算（`sellerFinalizeEarly`）。
- `My Auctions / 我的拍卖`：
  - 基于 `NewTrade` 事件筛选 `seller == currentAccount` 的所有挂单。
  - 显示每场拍卖的状态（进行中/已结束/流拍/成交）、累计收入（基于 `getAuctionAmount` 与事件）。
- `My Bids / 我的出价`：
  - 基于 `BidPlaced` 事件筛选 `bidder == currentAccount` 的所有参与拍卖。
  - 标记是否最高价、是否已结束、是否可退款。
- `Assets / 资产中心`：
  - 显示当前地址的 ETH、USDT、可用/冻结碳积分、待提现金额。
  - 提供：
    - ETH→USDT 的兑换入口（`TokenSale.buyTokens()`）。
    - 测试环境下的每日水龙头领取入口（`TokenFaucet.claim()`，例如每 24 小时 1000 USDTMock）。
    - 一键提现（`withdrawAuctionAmount()`）。
 - `Admin / 管理后台`（仅 `currentAccount == owner()` 时显示）：
   - 发行/销毁碳积分。
   - 调整手续费 `feeBasisPoints`。
   - 管理黑/白名单与白名单开关。
   - 查看平台汇总指标（如成交总额、成交笔数等，可通过事件聚合计算；手续费收入也可在需要时以类似方式统计）。

上述模块可以在当前的 `frontend/main.js` 基础上实现，也可以作为 React/Vue 路由结构的直接参考。实际项目中，推荐参考 `carbontrader-prime/` 目录下的 React 前端实现。

### 4. 前端重构时的注意事项

- 权限与角色识别：
  - 管理员：`currentAccount === await carbonTrader.owner()`。
  - 某拍卖卖家：`getTrade(tradeId).seller === currentAccount`。
  - 某拍卖买家：`getDeposit(tradeId) > 0` 或在 `BidPlaced` 事件中出现。
  - 不应通过“前端角色选择”来决定权限，所有权限判断以合约返回为准。
- 业务逻辑位置：
  - 保留价、一口价、手动结算、黑/白名单、手续费等逻辑已在合约中实现，前端应避免另写一套影子规则。
  - 前端只负责展示和调用，不应在 UI 层做与合约矛盾的判断。
- 安全与密钥：
  - 所有交易应通过用户钱包（如 MetaMask）签名，不在前端硬编码私钥。
  - RPC 地址与合约地址可通过环境变量或配置文件注入，不在代码中写死生产环境密钥。

前端开发在重构 UI 时，可以自由选择 React/Vue/Svelte 等技术栈，并完全重写 `frontend/` 或 `carbontrader-prime/` 目录下的实现，只要遵守以上合约接口与业务规则约定即可。 

### 5. 前端交互总览（按模块）

以下为当前 React 前端（`carbontrader-prime/`）已经实现的主要交互行为，按业务模块归档，便于产品和前端对齐。

#### 全局 / 配置

- 顶部导航：`Market` / `Dashboard` / `Admin`（仅当当前地址为 `owner()` 时显示 `Admin`）。
- 未连接钱包时：
  - 首页显示欢迎页和 `Connect Wallet` 按钮。
  - 底部有 `Configure Contracts` 文本入口，点击后打开配置弹窗。
- 配置弹窗 `System Configuration`：
  - 输入并保存：`CarbonTrader Address`、`USDT Token Address`、`TokenSale Address`、`Faucet Address`。
  - 点击 `Save Configuration` 会将配置写入 `localStorage` 并刷新页面。

#### Market（市场）

- 列表：每个挂单卡片显示：
  - `Trade ID`：自动生成 `CT-xxxxxx`，6 位递增数字，从 `100001` 起。
  - `Seller`：卖家地址缩写。
  - 状态：`Active / Ended / Finalized`。
  - `Carbon Amount`：整笔挂单的碳积分总量。
  - 右侧价格卡：
    - 若已有出价：
      - 标题 `Current Total Bid`；
      - 显示当前最高总价（USDT）；
      - 下方小字：`≈ 单价 USDT / credit`。
    - 若无出价：
      - 标题 `Starting Ask (Total)`；
      - 显示起拍总价（创建时填写的价格，存入 `priceOfUnit` 字段）；
      - 下方小字 `No bids yet`。
  - 下方 3 个价格卡：
    - `Reserve Price`：总保留价，单位 USDT，未设置则为 `-`。
    - `Buy Now Price`：总一口价，单位 USDT，未设置则为 `-`。
    - `Buy Now Status`：`Disabled / Available / Used`。
- 按钮交互：
  - 普通买家（`account !== seller` 且拍卖进行中、未最终化）：
    - `Place Bid`：弹出出价 Modal，输入“总出价金额（USDT）”，前端内部完成 `approve + deposit` 两步。
    - `Buy Now`：若一口价可用，点击会自动检查/补足 `approve` 后调用 `buyNow` 完成一口价成交。
  - 卖家：
    - 主按钮显示为 `You are Seller`，禁用，用于提示卖家不能给自己出价。
    - 若拍卖未结束且已有出价：额外出现 `End Auction Now` 按钮，调用 `sellerFinalizeEarly`，按照当前最高出价提前完成结算。
  - 已结束且有最高价：任何人可点击 `Settle Auction` 按钮，调用 `finalizeAuctionAndTransferCarbon` 结算（业务上通常由卖家或平台运营触发）。

#### Top Up（获取 USDT）

- `Dashboard` 顶部的 `USDT Balance` 卡片提供 `Top Up` 入口，点击打开 `Acquire USDT` 弹窗：
  - 输入 `Amount of ETH to Spend`，点击 `Swap ETH for USDT` 调用 `TokenSale.buyTokens()`。
  - 弹窗中提示文案说明：可通过水龙头每 24h 领取 1000 USDTMock。
  - `Claim Daily Faucet` 按钮：调用 `Faucet.claim()`，成功后刷新当前账户的余额与资产信息。

#### Dashboard – 顶部概览

- 顶部四个统计卡：
  - `Carbon Credits`：可用碳积分（`getAllowance(account)`）。
  - `Frozen Credits`：冻结碳积分（挂单中，`getFrozenAllowance(account)`）。
  - `USDT Balance`：当前账户 USDT 余额。
  - `Pending Revenue`：卖家未提现收入（`getAuctionAmount(account)`），当值大于 0 时右下角会出现 `Claim` 按钮，调用 `withdrawAuctionAmount()` 将该账户所有可提金额一次性提现。

#### Dashboard – My Auctions / My Bids

- 顶部标签切换：
  - `My Auctions`：只显示 `seller === account` 的拍卖。
  - `My Bids`：只显示 `myDeposits[tradeId] > 0` 的拍卖（当前地址在该拍卖下有押金）。
- 表格列：
  - `Trade ID`：可点击，点击整行（除 Action 列按钮外）会打开 `Trade Detail` 弹窗。
  - `Role`：`Seller / Highest Bidder / Bidder`。
  - `Amount`：
    - 在 `My Auctions` 视图中，显示碳积分总量，例如 `100 Credits`。
    - 在 `My Bids` 视图中，显示 `My Deposit`，即当前地址在该拍卖下的押金（USDT）。
  - `Status`：`Active / Ended / Finalized`。
  - `Action`：
    - 卖家 + `My Auctions`：
      - 未出价且未最终化：显示 `Cancel Listing` 按钮，调用 `cancelTrade`，退回冻结碳积分。
      - 已出价 + 未结束 + 未最终化：显示 `End Early` 按钮，调用 `sellerFinalizeEarly` 提前结算。
      - 已出价 + 已结束 + 未最终化：显示 `Settle Auction` 按钮，调用 `finalizeAuctionAndTransferCarbon` 到期结算。
    - 买家（`My Bids`）：
      - 当当前地址在该拍卖下有可退押金（非最高出价者，或拍卖已 `Finalized`）：显示 `Refund Deposit` 按钮，调用 `refund` 取回押金。
    - 当对当前账户没有任何可用操作时，显示 `No actions` 提示。
- 行点击：点击整行（除 `Action` 列按钮）会打开 `Trade Detail` 弹窗，展示该拍卖详情。

#### Trade Detail 弹窗

- 打开方式：
  - 在 `Dashboard` 的 `My Auctions` 或 `My Bids` 表格中点击某一行的 `Trade ID` 或其他非 Action 区域。
- 内容概览：
  - 基本信息：`tradeId`，卖家地址（短地址），碳积分数量。
  - 起止时间：`startTime` / `endTime`，以本地日期时间格式显示。
  - 价格信息：保留价、一口价、当前状态（`Active / Ended / Finalized`）。
  - 竞价信息：最高价与最高出价人（若无则显示 `No bids yet` / `-`）。
  - 当前账户视角：
    - `My Role`：`Seller / Bidder / -`。
    - `My Deposit`：当前地址在该拍卖下的押金（USDT）。
- 底部操作按钮（仅对卖家显示，且依赖状态）：
  - 未最终化且无出价：显示 `Cancel Listing`，调用 `cancelTrade` 取消上架。
  - 未最终化、已结束、有出价：显示 `Settle Auction`，调用 `finalizeAuctionAndTransferCarbon`。
  - 未最终化、未到期、有出价：显示 `End Early`，调用 `sellerFinalizeEarly`。

#### Admin – Issue Credits

- `Issue Credits` 卡片：
  - `User Address`：目标用户地址。
  - `Amount`：发行或销毁的碳积分数量。
  - `Issue` 按钮：调用 `issueAllowance(user, amount)`，为指定地址发行碳积分。
  - `Destroy` 按钮：调用 `destroyAllowance(user, amount)`，销毁指定地址的部分碳积分。
- 白名单 / 黑名单管理（同卡片下方）：
  - `Manage Address` 输入框（重用上面的用户地址字段）。
  - 四个按钮：
    - `Add to Whitelist`：调用 `addToWhitelist(address)`。
    - `Remove from Whitelist`：调用 `removeFromWhitelist(address)`。
    - `Add to Blacklist`：调用 `addToBlacklist(address)`。
    - `Remove from Blacklist`：调用 `removeFromBlacklist(address)`。

#### Admin – System Controls

- `Whitelist Mode` 区块：
  - 显示当前白名单模式状态：`Currently Enabled / Currently Disabled`（来自 `whitelistEnabled()`）。
  - 右侧按钮 `Enable / Disable`：点击后调用 `setWhitelistEnabled(bool)` 切换模式。
- `Platform Fee` 区块：
  - 显示当前费率：`feeBasisPoints` 基点和折算百分比（例如 `100 bps ≈ 1.00%`）。
  - `New Fee (bps)` 输入框：限制在 `0–1000` 范围，点击 `Update` 调用 `setFeeBasisPoints(newFee)`。
- `Batch Finalize Ended Trades` 按钮：
  - 前端基于内存中的 `trades` 过滤 `endTime < now && !finalized` 的 `tradeId` 数组；
  - 调用 `batchFinalize(tradeIds[])` 并在成功后刷新数据。

#### Admin – Accounts Console / 平台统计

- 左侧输入区：
  - 多行地址输入框，支持用空格、换行、逗号或分号分隔多个地址。
  - 点击 `Load Accounts` 后：
    - 过滤出合法地址（以 `0x` 开头、长度 42），去重。
    - 对每个地址并行查询：
      - ETH 余额（`provider.getBalance(addr)`）；
      - USDT 余额（`token.balanceOf(addr)`）；
      - 可用碳积分（`carbon.getAllowance(addr)`）；
      - 冻结碳积分（`carbon.getFrozenAllowance(addr)`）；
      - 待提现金额（`carbon.getAuctionAmount(addr)`）。
    - 结果渲染到右侧表格。
- 右侧顶部平台统计：
  - 基于 `TradeFinalized` 事件聚合成交总额与成交笔数：
    - 总成交额：将所有 `paidAmount > 0` 的事件求和，按 USDT 展示。
    - 成交笔数：`TradeFinalized` 事件总数量。
- 下方表格：
  - 每行对应一个地址，展示：
    - `Address`（短地址）；
    - `ETH`（四位小数）；
    - `USDT` 余额；
    - `Carbon`（可用碳积分）；
    - `Frozen`（冻结碳积分）；
    - `Withdrawable`（待提现金额，USDT）。
## CarbonTrader 合约防御机制说明手册

本节描述当前版本中与 `CarbonTrader`、`TokenSale` 等核心合约相关的业务规则与安全防御设计，便于后续产品化和安全审计。

### 1. 权限模型

- **管理员（Owner）**
  - 定义：部署 `CarbonTrader`、`TokenSale` 和 `TokenFaucet` 时的 `msg.sender`，保存在合约的不可变状态变量 `OWNER` / `owner` 中。
  - 能力：
    - `issueAllowance(user, amount)`：为任意地址发行碳积分。
    - `freezeAllowance(user, amount)`：将指定用户的可用碳积分转入冻结池。
    - `unfreezeAllowance(user, amount)`：将指定用户的冻结碳积分转回可用池。
    - `destroyAllowance(user, amount)` / `destroyAllAllowance(user)`：销毁指定用户部分或全部碳积分。
    - `batchFinalize(tradeIds[])`：批量结算已结束的拍卖。
    - `setFeeBasisPoints(newFee)`：设置平台手续费（基点制，100 = 1%，最大 1000 = 10%）。
    - `setWhitelistEnabled(enabled)` / `addToWhitelist` / `removeFromWhitelist`：开启/关闭白名单模式并维护白名单。
    - `addToBlacklist` / `removeFromBlacklist`：维护黑名单。
    - `TokenSale.withdrawETH(to, amount)`：从代币销售合约中提取累计的 ETH。
  - 防御点：
    - 所有上述函数均使用 `onlyOwner` 修饰，内部调用 `_onlyOwner` 检查：
      - 非 Owner 调用时直接 `revert CarbonTrader_NotOwner()`。

- **黑名单 / 白名单（_checkAllowed）**
  - 合约中维护：
    - `mapping(address => bool) blacklisted`：黑名单；
    - `mapping(address => bool) whitelisted` 与 `bool whitelistEnabled`：白名单及其开关。
  - 在以下操作前会调用 `_checkAllowed(msg.sender)`：
    - `createTrade`（卖家创建拍卖）；
    - `deposit`（买家出价）；
    - `buyNow`（一口价买入）；
    - `withdrawAuctionAmount`（卖家提现成交收入）。
  - 行为：
    - 若地址在黑名单中：`revert CarbonTrader_Blacklisted()`；
    - 若白名单模式开启且地址不在白名单中：`revert CarbonTrader_NotWhitelisted()`。

- **普通用户**
  - 能力：
    - 使用 `TokenSale.buyTokens()`（或直接向 `TokenSale` 转 ETH）购买竞标代币。
    - 使用 `createTrade()` 创建自己的拍卖（作为卖家）。
    - 使用 `deposit()` 在他人拍卖中出价（作为买家）。
    - 使用 `refund()` 取回非最高出价押金。
    - 使用 `finalizeAuctionAndTransferCarbon(tradeId)` 对单个拍卖进行结算（按最高出价结算，调用者不限）。
    - 使用 `withdrawAuctionAmount()` 提现自己累计的成交收入（仅对卖家本人地址有效）。
  - 防御点：
    - 无法调用任何 `onlyOwner` 函数（发行/冻结/销毁/批量结算/TokenSale 提现）。

### 2. 拍卖业务规则与防御

#### 2.1 挂单与碳积分冻结

- 发行碳积分：
  - 管理员通过 `issueAllowance(user, amount)` 将碳积分记入 `userToAllowance[user]`，表示该用户的“可用碳积分”。

- 创建拍卖（上架）：
  - 卖家调用 `createTrade(tradeId, amount, startamount, priceOfUnit, startTime, endTime)`：
    - 参数检查：
      - `amount > 0` 且 `amount <= userToAllowance[msg.sender]`。
      - `startamount > 0`。
      - `priceOfUnit > 0`。
      - `startTime < endTime`。
      - 若该 `tradeId` 已存在且未最终化，则 `revert CarbonTrader_TradeAlreadyExists()`。
    - 状态更新：
      - `userToAllowance[seller] -= amount;`
      - `userToFrozenAllowance[seller] += amount;`
      - 即：创建拍卖时自动将卖家的相应碳积分从可用池转入冻结池，避免重复挂单。

#### 2.2 出价与押金规则

- 出价函数：`deposit(tradeId, amount, info)`
  - 防御条件：
    - 先通过 `_checkAllowed(msg.sender)` 进行黑/白名单检查。
    - 若 `tradeId` 不存在：`revert CarbonTrader_TradeNotExist()`。
    - 若拍卖已最终化：`revert CarbonTrader_TradeFinalized()`。
    - 若 `block.timestamp < startTime`：`revert CarbonTrader_AuctionNotStarted()`。
    - 若 `block.timestamp >= endTime`：`revert CarbonTrader_AuctionEnded()`。
    - 若 `msg.sender == seller`：`revert CarbonTrader_SellerCannotBidOwnAuction()`（禁止卖家给自己拍卖出价）。
  - 价格与金额规则：
    - `amount > currentTrade.highestBid` 且 `amount > prevBid[msg.sender]`，否则：
      - `revert CarbonTrader_BidTooLow()`。
    - 支付逻辑：
      - 只对“新增部分”收款：`delta = amount - prevBid`。
      - 调用 `token.transferFrom(msg.sender, address(this), delta)`，失败则 `revert CarbonTrader_NotEnoughDeposit()`。
  - 状态更新：
    - `deposit[msg.sender] = amount`。
    - `highestBidder = msg.sender`，`highestBid = amount`。
    - 事件：`BidPlaced(tradeId, bidder, amount, info)`，其中 `info` 仅作为链上日志字段使用，当前版本合约不再额外持久化加密投标信息。

#### 2.3 退款规则

- 退款函数：`refund(tradeId)`
  - 防御条件：
    - 若 `tradeId` 不存在：`revert CarbonTrader_TradeNotExist()`。
    - 若当前地址在该拍卖下押金为 0：`revert CarbonTrader_NoDeposit()`。
    - 若当前地址是 `highestBidder` 且拍卖尚未 `finalized`：
      - `revert CarbonTrader_StillHighestBidder()`，防止最高出价者在拍卖进行中撤出押金。
  - 退款逻辑：
    - 将 `deposit[msg.sender]` 置 0，调用 `token.transfer(msg.sender, depositAmount)`。
    - 若转账失败，恢复押金并 `revert CarbonTrader_RefoundFailed()`。
    - 事件：`BidRefunded(tradeId, bidder, amount)`。

#### 2.4 拍卖结算规则

- 单个结算：`finalizeAuctionAndTransferCarbon(tradeId)`
  - 当前实现允许任何地址触发（如果需要限制为卖家/管理员，可以在未来版本中加入额外权限检查）。
  - 防御条件：
    - 若 `tradeId` 不存在：`revert CarbonTrader_TradeNotExist()`。
    - 若已最终化：`revert CarbonTrader_TradeFinalized()`。
    - 若 `block.timestamp < endTime`：`revert CarbonTrader_AuctionNotStarted()`。
    - 若没有任何出价（`highestBidder == 0` 或 `highestBid == 0`）：`revert CarbonTrader_NoBids()`。
    - 若卖家冻结碳积分不足：`revert CarbonTrader_ParamError()`。
  - 结算逻辑：
    - 若设置了保留价 `reservePrice` 且 `highestBid < reservePrice`：
      - 判定为流拍：卖家冻结碳积分解冻回可用池；
      - 所有出价人的押金保留在合约中，任何人（包括最高出价者）可通过 `refund` 取回；
      - 事件中的 `winner` 记录为 `address(0)`。
    - 否则，按最高出价正常成交：
      - 将卖家冻结的碳积分全部转给最高出价者：
        - `userToFrozenAllowance[seller] -= amount;`
        - `userToAllowance[winner] += amount;`
      - 计算平台手续费并累积到拍卖收益中：
        - 手续费：`fee = highestBid * feeBasisPoints / 10000`（基点表示，100 = 1%）；
        - 卖家收入：`sellerAmount = highestBid - fee`；
        - `auctionAmount[seller] += sellerAmount;`
        - `auctionAmount[feeRecipient] += fee;`
    - 清除最高出价者押金：
      - `deposit[winner] = 0;`
    - 标记拍卖最终化：
      - `finalized = true;`
      - `highestBid = 0;`
    - 事件：`TradeFinalized(tradeId, winner, paidAmount, carbonAmount)`。
  - 提前结算（仅卖家）：`sellerFinalizeEarly(tradeId)`
    - 条件：
      - `msg.sender` 必须是该拍卖的 `seller`；
      - 拍卖尚未 `finalized`；
      - 至少有一笔有效出价（`highestBidder != address(0)` 且 `highestBid > 0`）。
    - 行为：
      - 复用与 `finalizeAuctionAndTransferCarbon` 相同的内部结算逻辑，只是不再要求 `block.timestamp >= endTime`；
      - 可在拍卖进行中基于当前最高价提前完成成交或判定流拍。

- 批量结算：`batchFinalize(string[] tradeIds)`（仅 Owner）
  - 管理员可以对多个已结束拍卖调用内部 `_finalize(tradeId)`（仍然带有时间与出价检查）。
  - 适用于“定时批量结算”或“平台一键结算”场景（链上仍需要外部账户发起交易，合约自身不能自动定时）。

#### 2.5 卖家提现

- 提现函数：`withdrawAuctionAmount()`
  - 提现主体为调用者地址本身，外部无法替卖家提款。
  - 逻辑：
    - 读取 `auctionAmount[msg.sender]`，清零后调用 `token.transfer(msg.sender, withdrawAmount)`。
    - 若转账失败，恢复 `auctionAmount` 并 `revert CarbonTrader_TransferFailed()`。

#### 2.6 卖家取消拍卖

- 取消函数：`cancelTrade(tradeId)`
  - 适用场景：拍卖创建后尚无人出价时，卖家希望撤下挂单。
  - 防御条件：
    - 若 `tradeId` 不存在：`revert CarbonTrader_TradeNotExist()`。
    - 若当前调用者不是该拍卖卖家：`revert CarbonTrader_NotSellerOrOwner()`。
    - 若拍卖已最终化：`revert CarbonTrader_TradeFinalized()`。
    - 若已经有任何出价（`highestBidder != address(0)` 或 `highestBid != 0`）：`revert CarbonTrader_NoBids()`（当前版本复用此错误表示“无法取消已有出价的拍卖”）。
    - 若卖家冻结碳积分不足：`revert CarbonTrader_ParamError()`。
  - 取消逻辑：
    - 将卖家冻结的碳积分从冻结池退回可用池：
      - `userToFrozenAllowance[seller] -= amount;`
      - `userToAllowance[seller] += amount;`
    - 将该拍卖标记为 `finalized = true`，避免后续误用同一 ID 继续进行。

### 3. 代币兑换（TokenSale）规则

- 合约：`TokenSale`
  - 作用：允许任意用户使用本链的 ETH 兑换竞标代币（当前为 `ERC20Mock` USDT）。
  - 核心参数：
    - `RATE = 1000 * 1e18`：默认 1 ETH 兑换 1000 代币（18 位精度）。
    - `feeBasisPoints`（CarbonTrader）默认值为 100，表示 1% 手续费，可由 Owner 在 0–1000（0–10%）范围内调整。
  - 购买流程：
    - 用户调用 `buyTokens()` 或直接向合约转入 ETH：
      - 要求 `msg.value > 0`，否则 revert `"No ETH sent"`。
      - 计算铸币数量 `amount = msg.value * RATE / 1e18`。
      - 调用代币合约的 `mint(msg.sender, amount)`（要求代币合约实现 `IMintableERC20` 接口）。
      - 事件：`TokensPurchased(buyer, ethPaid, tokensMinted)`。
  - 提现流程：
    - 仅 Owner 调用 `withdrawETH(to, amount)`：
      - 若 `amount == 0` 或大于合约当前余额，则转出全部余额；
      - 事件：`EthWithdrawn(to, amount)`。

### 4. 常见错误码与业务含义

- 访问控制类：
  - `CarbonTrader_NotOwner()`：非管理员调用仅限 Owner 的函数。
  - `CarbonTrader_NotSellerOrOwner()`：若启用，对非卖家/Owner 触发限制。

- 拍卖状态类：
  - `CarbonTrader_TradeNotExist()`：传入的 `tradeId` 未创建。
  - `CarbonTrader_TradeAlreadyExists()`：同一 `tradeId` 已存在未最终化拍卖，禁止覆盖。
  - `CarbonTrader_TradeFinalized()`：拍卖已结算，禁止重复操作。
  - `CarbonTrader_AuctionNotStarted()`：在 `startTime` 前出价或在 `endTime` 前尝试结算。
  - `CarbonTrader_AuctionEnded()`：在 `endTime` 之后仍尝试出价。
  - `CarbonTrader_NoBids()`：结算时发现没有任何有效出价。

- 出价与押金类：
  - `CarbonTrader_BidTooLow()`：出价金额不大于当前最高价或不大于本人当前出价。
  - `CarbonTrader_NoDeposit()`：当前调用者在该拍卖中没有押金记录。
  - `CarbonTrader_StillHighestBidder()`：最高出价者在拍卖未结束时尝试退款。
  - `CarbonTrader_SellerCannotBidOwnAuction()`：卖家在自己创建的拍卖中出价。
  - `CarbonTrader_BuyNowDisabled()`：当前拍卖未设置一口价，但调用了 `buyNow`。

- 资金与转账类：
  - `CarbonTrader_NotEnoughDeposit()`：`transferFrom` 时 ERC20 转账失败，通常是授权不足或余额不足。
  - `CarbonTrader_RefoundFailed()`：退款时 ERC20 转账失败，押金已恢复。
  - `CarbonTrader_FinalizeAuctionFailed()`：旧版本用于结算时的额外支付失败（当前版本已简化为单一最高出价结算）。
  - `CarbonTrader_TransferFailed()`：卖家提现时 ERC20 转账失败，已恢复 `auctionAmount`。

- 参数与逻辑类：
  - `CarbonTrader_ParamError()`：创建拍卖或结算过程中发现参数不合法（例如冻结碳积分不足）。

### 5. 后续可考虑增加的业务规则（建议）

以下为商业化阶段可进一步增加的规则建议（尚未在当前合约中实现）：

- **时间延长机制（Anti-Sniping）**
  - 若在拍卖即将结束前有新出价，可以自动延长 `endTime` 若干秒，防止“狙击式出价”。

- **多资产支持**
  - 支持多种 ERC20 代币作为结算货币，通过路由合约或配置映射来管理不同币种的拍卖。

这些规则的实现会显著增加合约复杂度和审计需求，建议在当前基础逻辑稳定后分阶段引入。 
