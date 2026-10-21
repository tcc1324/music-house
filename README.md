# 音乐小屋 · 后端（聆遇游乐园）

一个很小的 Node 服务：给游乐园的「音乐小屋」提供 **搜歌** 和 **取播放地址**。
搜索结果直接带封面、时长；页面（`web/index.html`）由本服务一起托管，**同源、无跨域问题**。

## 目录

```
server.js              express 服务（端口默认 3100，可用环境变量 PORT 覆盖）
web/index.html         试听页面（搜歌 + 播放条）
ecosystem.config.js    pm2 配置（开机自启、崩溃自动重启）
package.json
```

## 接口

| 接口 | 说明 |
|---|---|
| `GET /api/search?kw=周杰伦&limit=30` | 搜索，返回 `{ok, total, songs:[{id,name,artist,album,cover,duration}]}` |
| `GET /api/url?id=347230` | 取播放地址，返回 `{ok, url, br, size}`；地址已转成 https |
| `GET /api/lyric?id=347230` | 歌词（LRC 文本） |
| `GET /` | 试听页面 |

搜索缓存 5 分钟、播放地址缓存 2 分钟；请求失败会自动重试。

## 部署到腾讯云轻量应用服务器（Ubuntu）

```bash
# 1. 装 Node 20 和 git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 2. 拉代码、装依赖
git clone https://github.com/tcc1324/music-house.git
cd music-house
npm i --no-audit --no-fund

# 3. 用 pm2 常驻（关掉终端也不停，重启自动拉起）
sudo npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # 按提示再执行它给出的那一行命令
```

**4. 放行端口**：腾讯云控制台 → 轻量应用服务器 → 防火墙 → 添加规则
`TCP` 端口 `3100`，来源 `全部`。

**5. 打开** `http://服务器公网IP:3100` 就能用了。

常用命令：

```bash
pm2 status                 # 看运行状态
pm2 logs music-house       # 看日志
pm2 restart music-house    # 改完代码重启
git pull && npm i && pm2 restart music-house   # 更新
```

## 换端口

```bash
PORT=8080 pm2 start server.js --name music-house
```

## 已知限制

- **VIP / 无版权曲**：`/api/url` 会返回空地址，前端提示「这首没有可播放的地址」。网易的规矩，绕不过去。
- **网易对海外 IP 有地区风控**：境外服务器常能搜歌但拿不到播放地址。**务必用国内节点**。
- **https**：若游乐园线上页面（https）要调用本服务，后端也必须是 https，否则浏览器按混合内容拦截。用 `http://IP:端口` 时只建议直接打开本服务自带的试听页。
- 数据来源是网易的私有接口，可能随时变动，属自用试听性质。
