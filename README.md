# Texas Poker Assistant · 德州扑克助手

[![Deploy](https://github.com/jerryliruijie/texaspokerassistant/actions/workflows/deploy.yml/badge.svg)](https://github.com/jerryliruijie/texaspokerassistant/actions/workflows/deploy.yml)

**[打开网页版 →](https://jerryliruijie.github.io/texaspokerassistant/)**

手机优先的德州扑克速查工具，包含起手牌、牌型排名与牌桌位置。React + TypeScript + Vite；纯前端，无账号或后端。支持 iPhone、安卓及桌面浏览器。

## 功能

- **起手牌 / Starting Hands**：2–8 人桌、完整起手牌矩阵、四档强弱配色、摊牌权益、发牌概率与平均间隔。全屏矩阵支持滑动，手牌摘要与行列坐标固定可见。
- **牌型 / Hand Rankings**：从皇家同花顺到高张，中英术语、扑克牌图示、同类牌型比较和踢脚牌说明。
- **位置 / Positions**：椭圆牌桌、双语座位说明、翻前／翻后行动顺序，覆盖双人桌与三人桌的特殊规则。
- 手机优先的炭黑与香槟金界面；保留切页状态、支持浏览器前进后退，数据与字体均随网站打包。

<p>
  <img src="docs/screenshots/hands.png" alt="起手牌矩阵" width="250" />
  <img src="docs/screenshots/rankings.png" alt="牌型排名" width="250" />
  <img src="docs/screenshots/positions.png" alt="牌桌位置" width="250" />
</p>

## 自动部署

网站通过 [GitHub Actions](https://github.com/jerryliruijie/texaspokerassistant/actions/workflows/deploy.yml) 发布到 GitHub Pages：

1. 提交并推送代码到 `main`，自动触发 `npm ci`、规则与数据测试、TypeScript 检查及 Vite 构建。
2. 所有检查通过后，自动发布新网站；构建或测试失败时保留上一版。
3. Pull Request 只执行检查，不发布；也可在 Actions 页面选择 **Run workflow** 手动重新部署。

```sh
git add .
git commit -m "Update poker assistant"
git push origin main
```

本地保存文件不会直接发布，需要提交并推送到 GitHub。发布路径从 Pages 配置自动获取，无需上传 `dist/` 或维护 `gh-pages` 分支，也无需额外配置访问令牌。后续绑定自有域名时，在仓库 **Settings → Pages** 配置域名与 DNS，再运行部署。

部署流程：[.github/workflows/deploy.yml](.github/workflows/deploy.yml)。配置依据 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) 与 [Vite 部署说明](https://vite.dev/guide/static-deploy.html)。

## 启动

需要 Node.js 20.19+ 或 22.12+。

```sh
npm install
npm run dev
```

浏览器打开终端打印的地址。手机与电脑连接同一 Wi-Fi 后，可访问终端打印的 Network 地址；需允许开发服务器通过本机防火墙。

```sh
npm test
npm run build
npm run preview
```

第一版是浏览器应用，不注册 Service Worker，不提供安装或离线承诺。浏览器本地仅保存人数、页面和选中起手牌；禁用本地存储时也可使用。扑克牌和图标由 CSS / SVG 绘制，字体本地打包，不依赖远程资源。

启动开发服务器后，可复跑浏览器验收（需要本机已安装 Chrome）：

```sh
npx playwright-cli -s=pocket open http://localhost:5173 --browser chrome
npx playwright-cli -s=pocket run-code --filename scripts/browser-qa.js
npx playwright-cli -s=pocket close
```

脚本检查 360 / 390 / 430px 手机宽度、740 / 750px 短屏及 844×390 横屏，覆盖矩阵分档配色、区间说明、固定矩阵表头、浏览器前进后退、跨页滚动位置与展开状态、全部座位配置及本地状态恢复。截图保存到 `output/playwright/`。

切换页面保留本次使用中的滚动位置、牌型展开、选中座位和翻前／翻后设置；再次点击当前导航回到顶部。浏览器返回先关闭矩阵或说明弹层，再返回上一页面。放大矩阵采用全屏独立滚动，顶部摘要和行列坐标保持可见；位置详情在牌桌下方直接更新，说明可展开。

矩阵使用四档固定颜色，按摊牌权益相对 `1 / 人数` 的比例划分：远高 ≥ 1.5 倍、略高 1.1–1.5 倍、接近 0.9–1.1 倍、低于 < 0.9 倍。主界面与放大矩阵使用同一套分档；人数变化时重新分类。

## 胜率数据

`src/data/equity.json` 包含 169 类起手牌 × 2–8 人桌的摊牌权益。每类起手牌使用 200,000 次蒙特卡洛模拟，固定种子 `20261011`；引擎为 [HenryRLee/PokerHandEvaluator](https://github.com/HenryRLee/PokerHandEvaluator) 0.6.0。

对手手牌均匀随机、无放回发牌，共享五张公共牌，所有玩家看到河牌。权益为独赢概率加平局中的底池份额；不包含弃牌、抽水、位置或策略建议。一次采样使用同一组对手的前缀生成各人数权益，因此人数增加时权益不增加。表格显示一位小数，数值是模拟估计。

每种起手牌选用一个花色代表，标准 52 张牌下对随机对手的权益具有花色对称性。发到概率按该类别的全部花色组合计算：对子 6 种，同花 4 种，非同花 12 种，总计 1,326 种。平均等待手数是数学期望。

重新生成数据需要 Python 3.10+（当前使用 Python 3.12）及 evaluator：

```sh
python -m pip install --target .tools/python -r scripts/requirements.txt
npm run data:generate
npm run data:generate -- --verify
```

`--verify` 使用独立随机种子对 AA、AKs、AKo、JTs、22、72o 各复算 50,000 次，检查 42 个结果是否在保守六倍标准误差界限内，并验证最小顺子、公共牌平局和多人底池分摊。可用 `--workers 4 --samples 200000 --seed 20261011` 指定生成参数；提交数据不得少于每类 200,000 次。

## 位置口径

从按钮开始顺时针排座。四人桌 UTG 兼 CO，五人桌 UTG 兼 HJ，六人桌 UTG 兼 LJ，七人桌 UTG+1 兼 LJ；详情展示别名。双人桌按钮兼小盲，翻前先行动、翻后后行动；三人桌翻前按钮先行动。行动图假设所有玩家在局中，展示一轮的起始顺序。

规则参考：[牌型](https://www.pokerstars.com/poker/games/rules/hand-rankings/)、[位置](https://www.pokerstars.com/poker/learn/lesson/position/)、[双人桌](https://www.pokerstars.com/poker/learn/news/strategy-to-play-heads-up-poker/)。
