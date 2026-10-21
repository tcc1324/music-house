const express = require('express')
const path = require('path')
const ncm = require('NeteaseCloudMusicApi')

const app = express()
const PORT = parseInt(process.env.PORT || "3100", 10)
const urlCache = new Map()   // 播放地址缓存 2 分钟
const searchCache = new Map() // 搜索结果缓存 5 分钟

app.use(express.static(path.join(__dirname, 'web')))

function pickSongs(body) {
  const r = (body && body.result) || {}
  const songs = r.songs || []
  return songs.map(s => ({
    id: s.id,
    name: s.name || '',
    artist: (s.ar || s.artists || []).map(a => a.name).filter(Boolean).join(' / '),
    album: (s.al && s.al.name) || (s.album && s.album.name) || '',
    cover: (() => {
      const p = (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || ''
      if (!p) return ''
      return p.replace(/^http:\/\//, 'https://') + '?param=160y160'
    })(),
    duration: s.dt || s.duration || 0
  }))
}

// 搜索
app.get('/api/search', async (req, res) => {
  const kw = String(req.query.kw || '').trim()
  if (!kw) return res.json({ ok: false, msg: '想听什么？先输入歌名或歌手吧' })
  const limit = Math.min(parseInt(req.query.limit || '30', 10) || 30, 50)
  const key = kw + '|' + limit

  const c = searchCache.get(key)
  if (c && Date.now() - c.t < 5 * 60 * 1000) return res.json(c.v)

  let last = null
  for (let i = 0; i < 3; i++) {
    try {
      const r = await ncm.cloudsearch({ keywords: kw, limit, type: 1 })
      const songs = pickSongs(r.body)
      const v = { ok: true, songs, total: (r.body.result && r.body.result.songCount) || songs.length }
      searchCache.set(key, { t: Date.now(), v })
      return res.json(v)
    } catch (e) { last = e }
    await new Promise(r => setTimeout(r, 700))
  }
  res.json({ ok: false, msg: '网络有点飘，再点一次试试？' })
})

// 取播放地址
app.get('/api/url', async (req, res) => {
  const id = parseInt(req.query.id, 10)
  const level = String(req.query.level || 'standard')
  if (!id) return res.json({ ok: false, msg: '缺少歌曲 id' })

  const key = id + '|' + level
  const c = urlCache.get(key)
  if (c && Date.now() - c.t < 2 * 60 * 1000 && c.v.ok) return res.json(c.v)

  for (let i = 0; i < 4; i++) {
    try {
      const r = await ncm.song_url_v1({ id, level })
      const d = r.body.data && r.body.data[0]
      if (d && d.url) {
        const v = { ok: true, url: d.url.replace(/^http:\/\//, 'https://'), br: d.br || 0, size: d.size || 0 }
        urlCache.set(key, { t: Date.now(), v })
        return res.json(v)
      }
      if (d && !d.url) {
        return res.json({ ok: false, msg: '这首没有可播放的地址（可能是 VIP 或已下架）' })
      }
    } catch (e) { /* 重试 */ }
    await new Promise(r => setTimeout(r, 600))
  }
  res.json({ ok: false, msg: '取播放地址失败，稍等一下再点' })
})

// 歌词（顺带做的，可选展示）
app.get('/api/lyric', async (req, res) => {
  const id = parseInt(req.query.id, 10)
  if (!id) return res.json({ ok: false })
  try {
    const r = await ncm.lyric({ id })
    const lrc = (r.body && (r.body.lrc && r.body.lrc.lyric)) || ''
    res.json({ ok: true, lrc })
  } catch (e) {
    res.json({ ok: false })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log('🎵 音乐小屋试听版已启动: http://127.0.0.1:' + PORT)
})
