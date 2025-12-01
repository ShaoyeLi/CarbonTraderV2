// 简单工具函数
function appendLog(targetId, message) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const time = new Date().toLocaleTimeString();
  el.textContent += `[${time}] ${message}\n`;
  el.scrollTop = el.scrollHeight;
}

function shortAddr(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

let provider;
let signer;
let currentAccount;
let carbonTrader;
let token;
let tokenSale;
let tokenDecimals = 18;
let batchFinalizableTradeIds = [];
let savedConfig = null;
let currentView = "market";
let contractOwner = null;
let whitelistEnabledState = false;

// CarbonTrader 合约 ABI（精简版，只保留本前端用到的函数）
const carbonTraderAbi = [
  {
    type: "event",
    name: "NewTrade",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "tradeId", type: "string", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "startamount", type: "uint256", indexed: false },
      { name: "priceOfUnit", type: "uint256", indexed: false },
      { name: "startTime", type: "uint256", indexed: false },
      { name: "endTime", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BidPlaced",
    inputs: [
      { name: "tradeId", type: "string", indexed: false },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "info", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BidRefunded",
    inputs: [
      { name: "tradeId", type: "string", indexed: false },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "TradeFinalized",
    inputs: [
      { name: "tradeId", type: "string", indexed: false },
      { name: "winner", type: "address", indexed: false },
      { name: "paidAmount", type: "uint256", indexed: false },
      { name: "carbonAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "issueAllowance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getAllowance",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "freezeAllowance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "unfreezeAllowance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getFrozenAllowance",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getAuctionAmount",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "whitelistEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "destroyAllowance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "destroyAllAllowance",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setFeeBasisPoints",
    stateMutability: "nonpayable",
    inputs: [{ name: "newFee", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setWhitelistEnabled",
    stateMutability: "nonpayable",
    inputs: [{ name: "enabled", type: "bool" }],
    outputs: [],
  },
  {
    type: "function",
    name: "addToWhitelist",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeFromWhitelist",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "addToBlacklist",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeFromBlacklist",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "createTrade",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tradeId", type: "string" },
      { name: "_amount", type: "uint256" },
      { name: "_startamount", type: "uint256" },
      { name: "_priceOfUnit", type: "uint256" },
      { name: "_startTime", type: "uint256" },
      { name: "_endTime", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setTradePrices",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tradeId", type: "string" },
      { name: "_reservePrice", type: "uint256" },
      { name: "_buyNowPrice", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "buyNow",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getTrade",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getTradeStatus",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
      { name: "", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getTradePrices",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint256" },
      { name: "", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tradeId", type: "string" },
      { name: "amount", type: "uint256" },
      { name: "info", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getDeposit",
    stateMutability: "view",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeAuctionAndTransferCarbon",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeId", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "batchFinalize",
    stateMutability: "nonpayable",
    inputs: [{ name: "tradeIds", type: "string[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawAuctionAmount",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
];

// ERC20 只用到少量方法
const erc20Abi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

// TokenSale 合约 ABI（ETH -> 竞标代币）
const tokenSaleAbi = [
  {
    type: "function",
    name: "buyTokens",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
];

// 连接 MetaMask
async function connectWallet() {
  try {
    if (!window.ethereum) {
      alert("请先安装 MetaMask");
      return;
    }

    // 向钱包请求当前选择的账户列表
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    if (!accounts || !accounts.length) {
      appendLog("global-log", "未检测到钱包账户");
      return;
    }
    currentAccount = accounts[0];

    provider = new ethers.BrowserProvider(window.ethereum);
    // 明确指定当前地址对应的 signer，避免使用旧的默认 signer
    signer = await provider.getSigner(currentAccount);

    const network = await provider.getNetwork();
    document.getElementById(
      "wallet-info"
    ).textContent = `已连接账户：${currentAccount}（${shortAddr(
      currentAccount
    )}）， chainId = ${network.chainId}`;
    appendLog(
      "global-log",
      `钱包已连接：${currentAccount}, chainId=${network.chainId}`
    );
    // 如果之前保存过合约地址，自动尝试连接合约，避免每次刷新都手动点
    if (
      savedConfig &&
      savedConfig.carbonAddr &&
      savedConfig.tokenAddr &&
      !carbonTrader
    ) {
      document.getElementById("input-carbon-address").value =
        savedConfig.carbonAddr;
      document.getElementById("input-token-address").value =
        savedConfig.tokenAddr;
      if (savedConfig.saleAddr) {
        document.getElementById("input-sale-address").value =
          savedConfig.saleAddr;
      }
      try {
        await connectContracts();
      } catch (e) {
        appendLog(
          "global-log",
          `自动连接合约失败，请手动重试: ${e.message || e}`
        );
      }
    }
    updateAdminNavVisibility();
    renderWhitelistToggle();
    // 如果已连接合约，更新合约实例的 signer
    if (carbonTrader) carbonTrader = carbonTrader.connect(signer);
    if (token) token = token.connect(signer);
    if (tokenSale) tokenSale = tokenSale.connect(signer);
    // 钱包连接后自动刷新账户列表和中控台（如果已连接合约）
    loadAccounts();
    if (carbonTrader && token) {
      refreshDashboard();
    }
  } catch (err) {
    console.error(err);
    appendLog("global-log", `连接钱包失败: ${err.message || err}`);
  }
}

// 使用 ETH 购买竞标代币
async function buyTokensWithEth() {
  if (!tokenSale) {
    alert("请先在合约地址区块填写 TokenSale 地址并点击连接合约");
    return;
  }
  try {
    const ethStr = document.getElementById("input-buy-eth-amount").value;
    const value = ethers.parseEther(ethStr || "0");
    if (value <= 0n) {
      appendLog("buy-result", "请输入大于 0 的 ETH 数量");
      return;
    }
    const tx = await tokenSale.buyTokens({ value });
    appendLog(
      "buy-result",
      `购买交易发送中: ${tx.hash}，支付 ETH=${ethStr}`
    );
    await tx.wait();
    appendLog("buy-result", "购买成功，请在余额区块查询 USDT 余额。");
  } catch (err) {
    console.error(err);
    appendLog("buy-result", `购买失败: ${err.message || err}`);
  }
}

function applyVisibility() {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    const viewsAttr = card.getAttribute("data-view") || "all";
    const viewMatch =
      viewsAttr === "all" || viewsAttr.split(/\s+/).includes(currentView);
    card.style.display = viewMatch ? "" : "none";
  });
}

function setView(view) {
  currentView = view;
  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) =>
      btn.dataset.viewTarget === view
        ? btn.classList.add("active")
        : btn.classList.remove("active")
    );
  applyVisibility();
}

function updateAdminNavVisibility() {
  const navAdmin = document.getElementById("nav-admin");
  if (!navAdmin) return;
  if (!currentAccount || !contractOwner) {
    navAdmin.style.display = "none";
    if (currentView === "admin") setView("market");
    return;
  }
  const isOwner =
    currentAccount.toLowerCase() === contractOwner.toLowerCase();
  navAdmin.style.display = isOwner ? "" : "none";
  if (!isOwner && currentView === "admin") setView("market");
}

function renderWhitelistToggle() {
  const toggle = document.getElementById("toggle-whitelist");
  const status = document.getElementById("whitelist-status");
  if (!toggle || !status) return;

  const isOwner =
    currentAccount &&
    contractOwner &&
    currentAccount.toLowerCase() === contractOwner.toLowerCase();

  toggle.checked = whitelistEnabledState;
  toggle.disabled = !isOwner;
  status.textContent = whitelistEnabledState
    ? isOwner
      ? "已开启（仅白名单地址可参与）"
      : "已开启（您需要在白名单中）"
    : "已关闭（所有非黑名单地址均可参与）";
}

async function loadWhitelistStatus() {
  if (!carbonTrader) return;
  try {
    const enabled = await carbonTrader.whitelistEnabled();
    whitelistEnabledState = enabled;
    renderWhitelistToggle();
  } catch (err) {
    // 读取失败时保持默认 false，不影响其它功能
    console.error("读取 whitelistEnabled 失败:", err);
  }
}

async function handleAccountsChanged() {
  if (!window.ethereum) return;
  try {
    const accounts = await window.ethereum.request({
      method: "eth_accounts",
    });
    if (!accounts || !accounts.length) {
      currentAccount = null;
      signer = null;
      appendLog("global-log", "钱包账户已清空或未连接");
      updateAdminNavVisibility();
      renderWhitelistToggle();
      return;
    }
    currentAccount = accounts[0];

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner(currentAccount);
    appendLog(
      "global-log",
      `账户已切换：${currentAccount}`
    );
    updateAdminNavVisibility();
    renderWhitelistToggle();
    // 更新已连接合约实例的 signer，确保后续交易从当前账户发出
    if (carbonTrader) carbonTrader = carbonTrader.connect(signer);
    if (token) token = token.connect(signer);
    if (tokenSale) tokenSale = tokenSale.connect(signer);
    // 自动刷新账户列表
    loadAccounts();
    // 如果已连接合约，自动刷新中控台
    if (carbonTrader && token) {
      refreshDashboard();
    }
  } catch (err) {
    console.error("处理账户切换失败:", err);
  }
}

// 列出当前钱包可见账户
async function loadAccounts() {
  if (!provider) {
    alert("请先连接钱包");
    return;
  }
  try {
    const accounts = await provider.listAccounts();
    const listEl = document.getElementById("accounts-list");
    listEl.innerHTML = "";
    if (!accounts.length) {
      listEl.textContent = "当前钱包没有可用账户（或尚未授权）。";
      return;
    }
    accounts.forEach((acc, idx) => {
      const addr = typeof acc === "string" ? acc : acc.address;
      const row = document.createElement("div");
      row.className = "account-row";
      const span = document.createElement("span");
      span.textContent = `${idx}: ${addr}`;
      const btn = document.createElement("button");
      btn.textContent = "复制";
      btn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(addr);
          appendLog("global-log", `已复制地址: ${addr}`);
        } catch (e) {
          appendLog("global-log", `复制失败: ${e.message || e}`);
        }
      };
      row.appendChild(span);
      row.appendChild(btn);
      listEl.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    appendLog("global-log", `获取账户列表失败: ${err.message || err}`);
  }
}

// 连接合约
async function connectContracts() {
  try {
    if (!provider || !signer || !currentAccount) {
      alert("请先连接钱包");
      return;
    }
    const carbonAddr =
      document.getElementById("input-carbon-address").value.trim();
    const tokenAddr =
      document.getElementById("input-token-address").value.trim();
    const saleAddr =
      document.getElementById("input-sale-address").value.trim();
    if (!carbonAddr || !tokenAddr) {
      alert("请填写合约和代币地址");
      return;
    }
    carbonTrader = new ethers.Contract(carbonAddr, carbonTraderAbi, signer);
    token = new ethers.Contract(tokenAddr, erc20Abi, signer);
    if (saleAddr) {
      tokenSale = new ethers.Contract(saleAddr, tokenSaleAbi, signer);
    } else {
      tokenSale = null;
    }

    // 读取 token 基本信息
    tokenDecimals = Number(await token.decimals());
    const symbol = await token.symbol();
    const ownerAddr = await carbonTrader.owner();
    contractOwner = ownerAddr;

    // 保存配置到本地，方便刷新后自动恢复
    savedConfig = { carbonAddr, tokenAddr, saleAddr };
    try {
      window.localStorage.setItem(
        "carbonTraderConfig",
        JSON.stringify(savedConfig)
      );
    } catch (_) {
      // 忽略本地存储失败
    }

    document.getElementById(
      "contract-info"
    ).textContent = `已连接 CarbonTrader: ${carbonAddr}, owner=${ownerAddr}, token: ${symbol} (${tokenAddr}), tokenSale=${saleAddr || "-"}, decimals = ${tokenDecimals}`;
    appendLog(
      "global-log",
      `合约已连接: CarbonTrader=${carbonAddr}, owner=${ownerAddr}, token=${symbol}(${tokenAddr})`
    );
    updateAdminNavVisibility();
    loadWhitelistStatus();
  } catch (err) {
    console.error(err);
    appendLog("global-log", `连接合约失败: ${err.message || err}`);
  }
}

// ERC20 balance
async function queryErc20Balance() {
  if (!token || !provider) {
    alert("请先连接合约");
    return;
  }
  try {
    const addrInput = document.getElementById(
      "input-erc20-balance-address"
    ).value;
    const addr = addrInput || currentAccount;
    const bal = await token.balanceOf(addr);
    const human = ethers.formatUnits(bal, tokenDecimals);
    const text = `地址 ${addr} 的余额: ${human}`;
    document.getElementById("erc20-balance-result").textContent = text;
    appendLog("global-log", text);
  } catch (err) {
    console.error(err);
    appendLog("global-log", `查询 USDT 余额失败: ${err.message || err}`);
  }
}

// 中控台：列出当前钱包中所有账户的 ETH / USDT / 碳积分 / 已结算金额
async function refreshDashboard() {
  if (!provider || !carbonTrader || !token) {
    alert("请先连接钱包和合约");
    return;
  }
  try {
    const accounts = await provider.listAccounts();
    const dashboardEl = document.getElementById("dashboard");
    dashboardEl.innerHTML = "";
    if (!accounts.length) {
      dashboardEl.textContent = "当前钱包没有可用账户。";
      return;
    }

    const table = document.createElement("table");
    table.className = "dashboard-table";
    const thead = document.createElement("thead");
    thead.innerHTML =
      "<tr><th>#</th><th>地址</th><th>ETH</th><th>USDT</th><th>碳积分</th><th>冻结碳积分</th><th>待提现金额</th></tr>";
    table.appendChild(thead);
    const tbody = document.createElement("tbody");

    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      const addr = typeof acc === "string" ? acc : acc.address;

      const [ethBal, usdtBal, allowance, frozen, auctionAmt] =
        await Promise.all([
          provider.getBalance(addr),
          token.balanceOf(addr),
          carbonTrader.getAllowance(addr),
          carbonTrader.getFrozenAllowance(addr),
          carbonTrader.getAuctionAmount(addr),
        ]);

      const tr = document.createElement("tr");
      tr.innerHTML = [
        `<td>${i}</td>`,
        `<td>${shortAddr(addr)}</td>`,
        `<td>${ethers.formatEther(ethBal)}</td>`,
        `<td>${ethers.formatUnits(usdtBal, tokenDecimals)}</td>`,
        `<td>${allowance.toString()}</td>`,
        `<td>${frozen.toString()}</td>`,
        `<td>${ethers.formatUnits(auctionAmt, tokenDecimals)}</td>`,
      ].join("");
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    dashboardEl.appendChild(table);
  } catch (err) {
    console.error(err);
    appendLog(
      "global-log",
      `刷新中控台失败: ${err.message || err}`
    );
  }
}

// ERC20 approve
async function approveErc20() {
  if (!token || !carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const amountStr = document.getElementById(
      "input-erc20-approve-amount"
    ).value;
    const amount = ethers.parseUnits(amountStr || "0", tokenDecimals);
    const spender = await carbonTrader.getAddress();
    const tx = await token.approve(spender, amount);
    appendLog(
      "erc20-approve-result",
      `发送 approve 交易中: ${tx.hash}，等待确认...`
    );
    await tx.wait();
    appendLog(
      "erc20-approve-result",
      `approve 成功，允许 ${spender} 使用 ${amountStr} token`
    );
    appendLog("global-log", `approve 成功: ${tx.hash}`);
  } catch (err) {
    console.error(err);
    appendLog("erc20-approve-result", `approve 失败: ${err.message || err}`);
  }
}

// 管理员函数
async function issueAllowance() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-issue-address").value;
    const amountStr = document.getElementById("input-issue-amount").value;
    const amount = BigInt(amountStr || "0");
    const tx = await carbonTrader.issueAllowance(user, amount);
    appendLog("admin-result", `issueAllowance 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog(
      "admin-result",
      `issueAllowance 成功，给 ${user} 发行 ${amountStr} 碳积分`
    );
  } catch (err) {
    console.error(err);
    appendLog("admin-result", `issueAllowance 失败: ${err.message || err}`);
  }
}

async function adminGetAllowance() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    const bal = await carbonTrader.getAllowance(user);
    appendLog("admin-result", `getAllowance: ${user} = ${bal.toString()}`);
  } catch (err) {
    console.error(err);
    appendLog("admin-result", `getAllowance 失败: ${err.message || err}`);
  }
}

async function adminGetFrozen() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    const bal = await carbonTrader.getFrozenAllowance(user);
    appendLog("admin-result", `getFrozenAllowance: ${user} = ${bal.toString()}`);
  } catch (err) {
    console.error(err);
    appendLog(
      "admin-result",
      `getFrozenAllowance 失败: ${err.message || err}`
    );
  }
}

async function adminFreeze() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    const amountStr = document.getElementById("input-admin-amount").value;
    const amount = BigInt(amountStr || "0");
    const tx = await carbonTrader.freezeAllowance(user, amount);
    appendLog("admin-result", `freezeAllowance 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("admin-result", `freezeAllowance 成功`);
  } catch (err) {
    console.error(err);
    appendLog("admin-result", `freezeAllowance 失败: ${err.message || err}`);
  }
}

async function adminUnfreeze() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    const amountStr = document.getElementById("input-admin-amount").value;
    const amount = BigInt(amountStr || "0");
    const tx = await carbonTrader.unfreezeAllowance(user, amount);
    appendLog("admin-result", `unfreezeAllowance 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("admin-result", `unfreezeAllowance 成功`);
  } catch (err) {
    console.error(err);
    appendLog("admin-result", `unfreezeAllowance 失败: ${err.message || err}`);
  }
}

async function adminDestroyPart() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    const amountStr = document.getElementById("input-admin-amount").value;
    const amount = BigInt(amountStr || "0");
    const tx = await carbonTrader.destroyAllowance(user, amount);
    appendLog("admin-result", `destroyAllowance 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("admin-result", `destroyAllowance 成功`);
  } catch (err) {
    console.error(err);
    appendLog("admin-result", `destroyAllowance 失败: ${err.message || err}`);
  }
}

async function adminDestroyAll() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    const tx = await carbonTrader.destroyAllAllowance(user);
    appendLog("admin-result", `destroyAllAllowance 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("admin-result", `destroyAllAllowance 成功`);
  } catch (err) {
    console.error(err);
    appendLog(
      "admin-result",
      `destroyAllAllowance 失败: ${err.message || err}`
    );
  }
}

async function adminSetFee() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const feeStr = document.getElementById("input-fee-bps").value;
    const fee = BigInt(feeStr || "0");
    const tx = await carbonTrader.setFeeBasisPoints(fee);
    appendLog("admin-result", `setFeeBasisPoints 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("admin-result", `setFeeBasisPoints 成功，当前费率=${feeStr} 基点`);
  } catch (err) {
    console.error(err);
    appendLog("admin-result", `setFeeBasisPoints 失败: ${err.message || err}`);
  }
}

async function adminSetWhitelistEnabled(enabled) {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tx = await carbonTrader.setWhitelistEnabled(enabled);
    appendLog(
      "admin-result",
      `setWhitelistEnabled(${enabled}) 发送中: ${tx.hash}`
    );
    await tx.wait();
    appendLog(
      "admin-result",
      `setWhitelistEnabled(${enabled}) 成功`
    );
    whitelistEnabledState = enabled;
    renderWhitelistToggle();
  } catch (err) {
    console.error(err);
    appendLog(
      "admin-result",
      `setWhitelistEnabled 失败: ${err.message || err}`
    );
  }
}

async function adminUpdateList(kind, action) {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const user = document.getElementById("input-admin-user").value;
    if (!user) {
      appendLog("admin-result", "请先填写名单管理地址");
      return;
    }
    let tx;
    if (kind === "whitelist" && action === "add") {
      tx = await carbonTrader.addToWhitelist(user);
    } else if (kind === "whitelist" && action === "remove") {
      tx = await carbonTrader.removeFromWhitelist(user);
    } else if (kind === "blacklist" && action === "add") {
      tx = await carbonTrader.addToBlacklist(user);
    } else if (kind === "blacklist" && action === "remove") {
      tx = await carbonTrader.removeFromBlacklist(user);
    } else {
      return;
    }
    appendLog(
      "admin-result",
      `${kind} ${action} 发送中: ${tx.hash}`
    );
    await tx.wait();
    appendLog(
      "admin-result",
      `${kind} ${action} 成功: ${user}`
    );
  } catch (err) {
    console.error(err);
    appendLog(
      "admin-result",
      `${kind} ${action} 失败: ${err.message || err}`
    );
  }
}

// 创建交易 / 查询交易
async function createTrade() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-trade-id").value;
    const amount = BigInt(
      document.getElementById("input-trade-amount").value || "0"
    );
    // 起拍数量在当前合约逻辑中未参与计算，这里直接等于 amount 以满足参数约束
    const startamount = amount;
    const priceOfUnit = BigInt(
      document.getElementById("input-trade-price").value || "0"
    );
    let startTimeStr = document.getElementById("input-trade-start-time").value;
    let endTimeStr = document.getElementById("input-trade-end-time").value;
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;
    const startTime = BigInt(startTimeStr || String(now));
    const endTime = BigInt(endTimeStr || String(now + oneDay));

    const tx = await carbonTrader.createTrade(
      tradeId,
      amount,
      startamount,
      priceOfUnit,
      startTime,
      endTime
    );
    appendLog("trade-result", `createTrade 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog(
      "trade-result",
      `createTrade 成功，tradeId=${tradeId}, amount=${amount.toString()}`
    );

    // 挂单成功后，如前端填写了保留价/一口价，则自动调用 setTradePrices
    const reserveStr = document.getElementById("input-reserve-price").value;
    const buyNowStr = document.getElementById("input-buynow-price").value;
    if (
      (reserveStr && Number(reserveStr) > 0) ||
      (buyNowStr && Number(buyNowStr) > 0)
    ) {
      try {
        const reserve = ethers.parseUnits(
          reserveStr || "0",
          tokenDecimals
        );
        const buyNowPrice = ethers.parseUnits(
          buyNowStr || "0",
          tokenDecimals
        );
        const tx2 = await carbonTrader.setTradePrices(
          tradeId,
          reserve,
          buyNowPrice
        );
        appendLog(
          "trade-result",
          `setTradePrices 发送中: ${tx2.hash}`
        );
        await tx2.wait();
        appendLog(
          "trade-result",
          `setTradePrices 成功，reserve=${reserveStr || 0}, buyNow=${
            buyNowStr || 0
          }`
        );
      } catch (err2) {
        console.error(err2);
        appendLog(
          "trade-result",
          `setTradePrices 自动调用失败: ${err2.message || err2}`
        );
      }
    }
  } catch (err) {
    console.error(err);
    appendLog("trade-result", `createTrade 失败: ${err.message || err}`);
  }
}

async function setTradePricesFrontend() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-trade-id").value;
    const reserveStr = document.getElementById("input-reserve-price").value;
    const buyNowStr = document.getElementById("input-buynow-price").value;
    const reserve = ethers.parseUnits(reserveStr || "0", tokenDecimals);
    const buyNowPrice = ethers.parseUnits(buyNowStr || "0", tokenDecimals);
    const tx = await carbonTrader.setTradePrices(
      tradeId,
      reserve,
      buyNowPrice
    );
    appendLog("trade-result", `setTradePrices 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog(
      "trade-result",
      `setTradePrices 成功，reserve=${reserveStr}, buyNow=${buyNowStr}`
    );
  } catch (err) {
    console.error(err);
    appendLog("trade-result", `setTradePrices 失败: ${err.message || err}`);
  }
}

async function getTrade() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-trade-id").value;
    const res = await carbonTrader.getTrade(tradeId);
    const [seller, amount, startamount, price, startTime, endTime] = res;
    const text = [
      `seller      : ${seller}`,
      `amount      : ${amount.toString()}`,
      `startamount : ${startamount.toString()}`,
      `priceOfUnit : ${price.toString()}`,
      `startTime   : ${startTime.toString()}`,
      `endTime     : ${endTime.toString()}`,
    ].join("\n");
    document.getElementById("trade-result").textContent = text;
    appendLog("global-log", `getTrade(${tradeId})\n${text}`);
  } catch (err) {
    console.error(err);
    appendLog("trade-result", `getTrade 失败: ${err.message || err}`);
  }
}

// 押金 / 退款
async function doDeposit() {
  if (!carbonTrader || !token) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-deposit-trade-id").value;
    const amountStr = document.getElementById("input-deposit-amount").value;
    const amount = ethers.parseUnits(amountStr || "0", tokenDecimals);
    const info = "";
    if (!tradeId) {
      appendLog("deposit-result", "请填写交易 ID");
      return;
    }

    // 查询当前出价和需要增加的金额（delta）
    const prevBid = await carbonTrader.getDeposit(tradeId);
    if (amount <= prevBid) {
      appendLog(
        "deposit-result",
        "新出价必须大于当前出价，请提高押金金额。"
      );
      return;
    }
    const delta = amount - prevBid;

    // 检查 allowance 是否足够覆盖本次新增金额
    const spender = await carbonTrader.getAddress();
    const allowance = await token.allowance(currentAccount, spender);

    if (allowance < delta) {
      appendLog(
        "deposit-result",
        "当前授权额度不足，先发送 approve 交易..."
      );
      const approveTx = await token.approve(spender, delta);
      appendLog(
        "deposit-result",
        `approve 发送中: ${approveTx.hash}，等待确认...`
      );
      await approveTx.wait();
      appendLog("deposit-result", "approve 成功，开始发送出价交易...");
    }

    const tx = await carbonTrader.deposit(tradeId, amount, info);
    appendLog("deposit-result", `deposit 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog(
      "deposit-result",
      `deposit 成功，tradeId=${tradeId}, amount=${amountStr}`
    );
  } catch (err) {
    console.error(err);
    appendLog("deposit-result", `deposit 失败: ${err.message || err}`);
  }
}

async function getDeposit() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-deposit-trade-id").value;
    const res = await carbonTrader.getDeposit(tradeId);
    const human = ethers.formatUnits(res, tokenDecimals);
    appendLog(
      "deposit-result",
      `getDeposit: tradeId=${tradeId}, amount=${human}`
    );
  } catch (err) {
    console.error(err);
    appendLog("deposit-result", `getDeposit 失败: ${err.message || err}`);
  }
}

async function refund() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-deposit-trade-id").value;
    const tx = await carbonTrader.refund(tradeId);
    appendLog("deposit-result", `refund 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("deposit-result", `refund 成功`);
  } catch (err) {
    console.error(err);
    appendLog("deposit-result", `refund 失败: ${err.message || err}`);
  }
}

async function buyNowFrontend() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById("input-deposit-trade-id").value;
    if (!tradeId) {
      appendLog("deposit-result", "请填写交易 ID");
      return;
    }
    const tx = await carbonTrader.buyNow(tradeId);
    appendLog("deposit-result", `buyNow 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("deposit-result", `buyNow 成功，tradeId=${tradeId}`);
  } catch (err) {
    console.error(err);
    appendLog("deposit-result", `buyNow 失败: ${err.message || err}`);
  }
}

// 成交和提现
async function finalizeAuction() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tradeId = document.getElementById(
      "input-finalize-trade-id"
    ).value;
    const tx = await carbonTrader.finalizeAuctionAndTransferCarbon(tradeId);
    appendLog("finalize-result", `finalize 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("finalize-result", `finalize 成功`);
  } catch (err) {
    console.error(err);
    appendLog("finalize-result", `finalize 失败: ${err.message || err}`);
  }
}

// 市场：读取 NewTrade 和 BidPlaced 事件
async function refreshMarket() {
  if (!carbonTrader || !provider) {
    alert("请先连接合约");
    return;
  }
  try {
    const marketEl = document.getElementById("market-list");
    marketEl.innerHTML = "加载中...";
    batchFinalizableTradeIds = [];

    // 获取所有 NewTrade 事件
    const newTradeEvents = await carbonTrader.queryFilter(
      carbonTrader.filters.NewTrade(),
      0,
      "latest"
    );

    // 获取所有 BidPlaced 事件
    const bidPlacedEvents = await carbonTrader.queryFilter(
      carbonTrader.filters.BidPlaced(),
      0,
      "latest"
    );

    // 将 BidPlaced 事件按 tradeId 分组
    const bidsByTrade = {};
    bidPlacedEvents.forEach((ev) => {
      const { tradeId, bidder, amount, info } = ev.args;
      const key = tradeId;
      if (!bidsByTrade[key]) bidsByTrade[key] = [];
      bidsByTrade[key].push({
        bidder,
        amount,
        info,
      });
    });

    marketEl.innerHTML = "";
    if (!newTradeEvents.length) {
      marketEl.textContent = "还没有任何交易。";
      return;
    }

    // 并行查询每个 trade 的状态（最高价、是否已结束）
    const statusList = await Promise.all(
      newTradeEvents.map((ev) =>
        carbonTrader.getTradeStatus(ev.args.tradeId)
      )
    );
    // 并行查询每个 trade 的保留价与一口价
    const priceList = await Promise.all(
      newTradeEvents.map((ev) =>
        carbonTrader.getTradePrices(ev.args.tradeId)
      )
    );

    const isOwner =
      currentAccount &&
      contractOwner &&
      currentAccount.toLowerCase() === contractOwner.toLowerCase();

    newTradeEvents.forEach((ev, idx) => {
      const {
        seller,
        tradeId,
        amount,
        startamount,
        priceOfUnit,
        startTime,
        endTime,
      } = ev.args;
      const [highestBidder, highestBid, finalized] = statusList[idx];
      const [reservePrice, buyNowPrice, buyNowUsed] = priceList[idx];
      const div = document.createElement("div");
      div.className = "market-item";
      const h = document.createElement("h3");
      h.textContent = `#${idx} ${tradeId}（卖家：${shortAddr(seller)}）`;
      h.style.cursor = "pointer";
      h.title = "点击进入出价页面";
      h.addEventListener("click", () => openBidForTrade(tradeId));
      const isSeller =
        currentAccount &&
        seller &&
        currentAccount.toLowerCase() === seller.toLowerCase();
      let highestBidderDisplay;
      if (highestBidder === ethers.ZeroAddress) {
        highestBidderDisplay = "-";
      } else if (isOwner || isSeller) {
        highestBidderDisplay = shortAddr(highestBidder);
      } else {
        highestBidderDisplay = "已有出价者";
      }

      const infoLines = [
        `amount: ${amount.toString()}`,
        `priceOfUnit: ${priceOfUnit.toString()}`,
        `startTime: ${startTime.toString()}`,
        `endTime: ${endTime.toString()}`,
        `reservePrice: ${
          reservePrice === 0n
            ? "-"
            : ethers.formatUnits(reservePrice, tokenDecimals)
        }`,
        `buyNowPrice: ${
          buyNowPrice === 0n
            ? "-"
            : ethers.formatUnits(buyNowPrice, tokenDecimals)
        }`,
        `highestBidder: ${highestBidderDisplay}`,
        `highestBid: ${ethers.formatUnits(highestBid, tokenDecimals)}`,
        `finalized: ${finalized}`,
        `buyNowUsed: ${buyNowUsed}`,
      ];
      const p = document.createElement("div");
      p.textContent = infoLines.join("  |  ");
      div.appendChild(h);
      div.appendChild(p);

      const nowSec = Math.floor(Date.now() / 1000);
      const canAutoFinalize =
        !finalized &&
        highestBid > 0n &&
        nowSec >= Number(endTime);
      if (canAutoFinalize) {
        batchFinalizableTradeIds.push(tradeId);
        const tag = document.createElement("div");
        tag.textContent = "状态：已结束，可结算";
        div.appendChild(tag);
      }

      const bids = bidsByTrade[tradeId] || [];
      const bidsDiv = document.createElement("div");
      bidsDiv.className = "market-bids";
      if (!bids.length) {
        bidsDiv.textContent = "暂无出价。";
      } else {
        bids.forEach((b, i) => {
          const line = document.createElement("div");
          const amountHuman = ethers.formatUnits(b.amount, tokenDecimals);
          let info = "";
          if (isOwner) {
            info = `info="${b.info}"`;
          } else {
            info = "info=已加密";
          }
          line.textContent = `投标 ${i}: bidder=${shortAddr(
            b.bidder
          )}, deposit=${amountHuman}, ${info}`;
          bidsDiv.appendChild(line);
        });
      }
      div.appendChild(bidsDiv);

      const actions = document.createElement("div");
      actions.style.marginTop = "4px";
      const bidBtn = document.createElement("button");
      bidBtn.textContent = "去出价 / 查看详情";
      bidBtn.className = "nav-btn";
      bidBtn.style.padding = "4px 8px";
      bidBtn.addEventListener("click", () => openBidForTrade(tradeId));
      actions.appendChild(bidBtn);
      div.appendChild(actions);

      marketEl.appendChild(div);
    });

    appendLog(
      "global-log",
      `市场刷新完成：交易数=${newTradeEvents.length}, 出价数=${bidPlacedEvents.length}`
    );
  } catch (err) {
    console.error(err);
    appendLog("global-log", `刷新市场失败: ${err.message || err}`);
  }
}

async function withdrawAuctionAmount() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  try {
    const tx = await carbonTrader.withdrawAuctionAmount();
    appendLog("finalize-result", `withdrawAuctionAmount 发送中: ${tx.hash}`);
    await tx.wait();
    appendLog("finalize-result", `withdrawAuctionAmount 成功`);
  } catch (err) {
    console.error(err);
    appendLog(
      "finalize-result",
      `withdrawAuctionAmount 失败: ${err.message || err}`
    );
  }
}

// 批量结算所有已结束且有最高价的交易（仅 Owner 可在合约侧成功）
async function batchFinalizeEndedTrades() {
  if (!carbonTrader) {
    alert("请先连接合约");
    return;
  }
  if (!batchFinalizableTradeIds.length) {
    appendLog("finalize-result", "没有可批量结算的交易，请先刷新市场。");
    return;
  }
  try {
    const tx = await carbonTrader.batchFinalize(batchFinalizableTradeIds);
    appendLog(
      "finalize-result",
      `批量结算交易发送中: ${tx.hash}，数量=${batchFinalizableTradeIds.length}`
    );
    await tx.wait();
    appendLog("finalize-result", "批量结算完成。");
  } catch (err) {
    console.error(err);
    appendLog(
      "finalize-result",
      `批量结算失败: ${err.message || err}`
    );
  }
}

function scrollToMarket() {
  const el = document.getElementById("market-list");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function openBidForTrade(tradeId) {
  const depositInput = document.getElementById("input-deposit-trade-id");
  const infoInput = document.getElementById("input-info-trade-id");
  const finalizeInput = document.getElementById("input-finalize-trade-id");
  if (depositInput) depositInput.value = tradeId;
  if (infoInput) infoInput.value = tradeId;
  if (finalizeInput) finalizeInput.value = tradeId;
  loadBidAuctionDetail(tradeId);
  setView("my-bids");
}

async function loadBidAuctionDetail(tradeId) {
  if (!carbonTrader) return;
  try {
    const summaryEl = document.getElementById("bid-auction-summary");
    if (summaryEl) {
      summaryEl.textContent = `正在加载 ${tradeId} 的详情...`;
    }
    const [trade, status, prices] = await Promise.all([
      carbonTrader.getTrade(tradeId),
      carbonTrader.getTradeStatus(tradeId),
      carbonTrader.getTradePrices(tradeId),
    ]);
    const [seller, amount, , priceOfUnit, startTime, endTime] = trade;
    const [highestBidder, highestBid, finalized] = status;
    const [reservePrice, buyNowPrice, buyNowUsed] = prices;

    const lines = [
      `Trade ID     : ${tradeId}`,
      `Seller       : ${seller}`,
      `Amount       : ${amount.toString()}`,
      `Price/Unit   : ${priceOfUnit.toString()}`,
      `StartTime    : ${startTime.toString()}`,
      `EndTime      : ${endTime.toString()}`,
      `ReservePrice : ${
        reservePrice === 0n
          ? "-"
          : ethers.formatUnits(reservePrice, tokenDecimals)
      }`,
      `BuyNowPrice  : ${
        buyNowPrice === 0n
          ? "-"
          : ethers.formatUnits(buyNowPrice, tokenDecimals)
      }`,
      `BuyNowUsed   : ${buyNowUsed}`,
      `HighestBid   : ${
        highestBid === 0n
          ? "0"
          : ethers.formatUnits(highestBid, tokenDecimals)
      }`,
      `HighestBidder: ${
        highestBidder === ethers.ZeroAddress ? "-" : highestBidder
      }`,
      `Finalized    : ${finalized}`,
    ];
    if (summaryEl) {
      summaryEl.textContent = lines.join(" | ");
    }
  } catch (err) {
    console.error(err);
    const summaryEl = document.getElementById("bid-auction-summary");
    if (summaryEl) {
      summaryEl.textContent = `加载详情失败: ${err.message || err}`;
    }
  }
}

// 绑定按钮
window.addEventListener("DOMContentLoaded", () => {
  // 读取本地保存的合约地址
  try {
    const raw = window.localStorage.getItem("carbonTraderConfig");
    if (raw) {
      savedConfig = JSON.parse(raw);
      if (savedConfig.carbonAddr) {
        document.getElementById("input-carbon-address").value =
          savedConfig.carbonAddr;
      }
      if (savedConfig.tokenAddr) {
        document.getElementById("input-token-address").value =
          savedConfig.tokenAddr;
      }
    }
  } catch (_) {
    savedConfig = null;
  }

  setView("market");

  document
    .getElementById("btn-connect-wallet")
    .addEventListener("click", connectWallet);
  document
    .getElementById("btn-load-accounts")
    .addEventListener("click", loadAccounts);
  document
    .getElementById("btn-connect-contracts")
    .addEventListener("click", connectContracts);

  document
    .getElementById("btn-erc20-balance")
    .addEventListener("click", queryErc20Balance);
  document
    .getElementById("btn-erc20-approve")
    .addEventListener("click", approveErc20);

  document
    .getElementById("btn-buy-tokens")
    .addEventListener("click", buyTokensWithEth);

  document
    .getElementById("btn-refresh-dashboard")
    .addEventListener("click", refreshDashboard);

  document
    .getElementById("btn-issue-allowance")
    .addEventListener("click", issueAllowance);
  document
    .getElementById("btn-get-allowance")
    .addEventListener("click", adminGetAllowance);
  document
    .getElementById("btn-get-frozen")
    .addEventListener("click", adminGetFrozen);
  document
    .getElementById("btn-freeze")
    .addEventListener("click", adminFreeze);
  document
    .getElementById("btn-unfreeze")
    .addEventListener("click", adminUnfreeze);
  document
    .getElementById("btn-destroy-part")
    .addEventListener("click", adminDestroyPart);
  document
    .getElementById("btn-destroy-all")
    .addEventListener("click", adminDestroyAll);

  document
    .getElementById("btn-set-fee")
    .addEventListener("click", adminSetFee);
  const toggleWhitelist = document.getElementById("toggle-whitelist");
  if (toggleWhitelist) {
    toggleWhitelist.addEventListener("change", (e) => {
      const desired = e.target.checked;
      const isOwner =
        currentAccount &&
        contractOwner &&
        currentAccount.toLowerCase() === contractOwner.toLowerCase();
      if (!isOwner) {
        // 不是管理员，恢复开关状态并提示
        e.target.checked = whitelistEnabledState;
        appendLog(
          "admin-result",
          "仅合约 Owner 可以修改白名单开关"
        );
        return;
      }
      if (desired === whitelistEnabledState) return;
      adminSetWhitelistEnabled(desired);
    });
  }
  document
    .getElementById("btn-add-whitelist")
    .addEventListener("click", () => adminUpdateList("whitelist", "add"));
  document
    .getElementById("btn-remove-whitelist")
    .addEventListener("click", () => adminUpdateList("whitelist", "remove"));
  document
    .getElementById("btn-add-blacklist")
    .addEventListener("click", () => adminUpdateList("blacklist", "add"));
  document
    .getElementById("btn-remove-blacklist")
    .addEventListener("click", () => adminUpdateList("blacklist", "remove"));

  document
    .getElementById("btn-create-trade")
    .addEventListener("click", createTrade);
  document
    .getElementById("btn-get-trade")
    .addEventListener("click", getTrade);
  document
    .getElementById("btn-set-trade-prices")
    .addEventListener("click", setTradePricesFrontend);

  document
    .getElementById("btn-deposit")
    .addEventListener("click", doDeposit);
  document
    .getElementById("btn-get-deposit")
    .addEventListener("click", getDeposit);
  document
    .getElementById("btn-refund")
    .addEventListener("click", refund);
  document
    .getElementById("btn-buynow")
    .addEventListener("click", buyNowFrontend);

  document
    .getElementById("btn-finalize")
    .addEventListener("click", finalizeAuction);
  document
    .getElementById("btn-withdraw")
    .addEventListener("click", withdrawAuctionAmount);

  document
    .getElementById("btn-refresh-market")
    .addEventListener("click", refreshMarket);

  document
    .getElementById("btn-batch-finalize")
    .addEventListener("click", batchFinalizeEndedTrades);

  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () =>
        setView(btn.dataset.viewTarget || "market")
      );
    });

  // 监听钱包账户切换事件，自动更新当前账户和中控台
  if (window.ethereum && window.ethereum.on) {
    window.ethereum.on("accountsChanged", () => {
      handleAccountsChanged();
    });
  }
});
