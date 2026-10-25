import React, { useEffect, useState } from "react";
import { api, imageUrl, downloadWallpaper } from "./api.js";
const categories = ["Nature", "City", "Abstract", "Space", "Anime", "Car", "Other"];
export default function App() {
  const [items, setItems] = useState([]), [q, setQ] = useState("");
  const [category, setCategory] = useState("all"), [page, setPage] = useState(1);
  const [total, setTotal] = useState(0), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0), [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("visitor"), [key, setKey] = useState("");
  const [uploading, setUploading] = useState(false), [downloading, setDownloading] = useState(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, category, page, limit: 12 });
        const data = await api(`/wallpapers?${params}`, { signal: controller.signal });
        if (active) { setItems(data.wallpapers); setTotal(data.total); }
      } catch(e) { if (active) setError(`${e.message}. Check that the backend is running on port 5000.`); }
      finally { if (active) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [q, category, page, refresh]);
  async function uploadImage(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setNotice("");
    try {
      const body = new FormData(form);
      await api(mode === "admin" ? "/admin/wallpapers/upload" : "/wallpapers/upload", {
        method: "POST", body, headers: mode === "admin" ? { "x-admin-key": key } : {}
      });
      form.reset(); setKey(""); setQ(""); setCategory("all"); setPage(1);
      setRefresh(n => n + 1); setNotice("Wallpaper uploaded successfully!");
    } catch(e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  async function download(w) {
    setDownloading(w.id); setNotice("");
    try {
      await downloadWallpaper(w);
      setNotice("Download started. Check your browser downloads.");
      setRefresh(n => n + 1);
    } catch(e) { setNotice(e.message); }
    finally { setDownloading(null); }
  }
  return <div className="app">
    <header className="topbar"><a className="brand" href="/">◈ WallpaperHub</a>
      <button onClick={() => setUploading(v => !v)}>{uploading ? "Close upload" : "+ Upload wallpaper"}</button>
    </header>
    <section className="hero"><span className="eyebrow">MAKE YOUR SCREEN YOURS</span>
      <h1>A fresh view.<br/><em>Every day.</em></h1>
      <p>Discover wallpapers, share your own, and download your next favorite.</p>
      <input className="search" aria-label="Search wallpapers" placeholder="Search wallpapers…" value={q}
        onChange={e => { setQ(e.target.value); setPage(1); }} />
    </section>
    {uploading && <section className="panel">
      <h2>Upload a wallpaper</h2><p>JPG, PNG or WebP · Maximum 10 MB · Saved as WebP</p>
      <label>Upload mode<select value={mode} onChange={e => setMode(e.target.value)}>
        <option value="visitor">Visitor upload (no login)</option><option value="admin">Admin manual upload</option>
      </select></label>
      <form onSubmit={uploadImage}>
        <label>Title<input name="title" maxLength="100" required placeholder="e.g. Misty Mountains" /></label>
        <label>Category<select name="category">{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Image<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
        {mode === "admin" && <label>Admin key<input type="password" value={key} onChange={e => setKey(e.target.value)} required autoComplete="off" /></label>}
        <p>Upload only images you own or have permission to share.</p>
        <button disabled={busy}>{busy ? "Uploading…" : "Upload image"}</button>
      </form>
    </section>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <nav className="categories" aria-label="Categories">{["all", ...categories].map(c => <button key={c}
      className={category === c ? "active" : ""} onClick={() => { setCategory(c); setPage(1); }}>{c === "all" ? "All wallpapers" : c}</button>)}</nav>
    <div className="section-title"><h2>The collection</h2><span>{total} wallpapers</span></div>
    {loading ? <p className="status">Loading wallpapers…</p> : error ? <div className="notice" role="alert">{error}<button onClick={() => setRefresh(n => n + 1)}>Retry</button></div> :
      !items.length ? <p className="status">No wallpapers yet. Upload your first image!</p> :
      <main className="grid">{items.map(w => <article className="card" key={w.id}>
        <a href={imageUrl(w.image_url)} target="_blank" rel="noreferrer"><img src={imageUrl(w.thumbnail_url)} alt={w.title} loading="lazy" /></a>
        <div className="card-body"><span className="tag">{w.category}</span><h3>{w.title}</h3>
          <p>{w.uploader || "Demo"} · {w.downloads || 0} downloads</p>
          {w.local_file ? <button disabled={downloading !== null} onClick={() => download(w)}>{downloading === w.id ? "Downloading…" : "↓ Download"}</button> :
            <a className="external" href={imageUrl(w.image_url)} target="_blank" rel="noreferrer">View old demo image ↗</a>}
        </div></article>)}</main>}
    <div className="pagination"><button disabled={page === 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button>
      <span>Page {page}</span><button disabled={page * 12 >= total || loading} onClick={() => setPage(p => p + 1)}>Next</button></div>
    <footer>WallpaperHub · Local development edition · Visitor uploads are public and not verified accounts.</footer>
  </div>;
}
