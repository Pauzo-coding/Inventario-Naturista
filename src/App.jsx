import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ✏️ Cambia este PIN por el que quieras usar
const ACCESS_PIN = process.env.REACT_APP_ACCESS_PIN || "1234";

const generateId = () => Math.random().toString(36).slice(2, 9);
const formatPrice = (val) => "$" + Number(val || 0).toLocaleString("es-CO");

// ─────────────────────────────────────────
// PANTALLA DE LOGIN
// ─────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const handleKey = (digit) => {
    if (pin.length < 6) setPin(p => p + digit);
  };

  const handleDelete = () => setPin(p => p.slice(0, -1));

  const handleSubmit = useCallback(() => {
    if (pin === ACCESS_PIN) {
      onLogin();
    } else {
      setShake(true);
      setError("PIN incorrecto");
      setPin("");
      setTimeout(() => { setShake(false); setError(""); }, 700);
    }
  }, [pin, onLogin]);

  useEffect(() => {
    if (pin.length === ACCESS_PIN.length) handleSubmit();
  }, [pin, handleSubmit]);

  const ls = {
    wrap: { minHeight: "100vh", background: "linear-gradient(135deg,#2d4a1e 0%,#3d5a2e 50%,#4a6e35 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia',serif" },
    card: { background: "rgba(255,255,255,0.95)", borderRadius: "28px", padding: "40px 36px", width: "300px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center", animation: shake ? "shake 0.4s" : "none" },
    logo: { fontSize: "48px", marginBottom: "8px" },
    title: { fontSize: "22px", fontWeight: "bold", color: "#2d2a20", margin: "0 0 4px" },
    subtitle: { fontSize: "13px", color: "#8a8068", marginBottom: "28px" },
    dotsRow: { display: "flex", justifyContent: "center", gap: "12px", marginBottom: "28px" },
    dot: (filled) => ({ width: "14px", height: "14px", borderRadius: "50%", background: filled ? "#3d5a2e" : "transparent", border: "2px solid #3d5a2e", transition: "background 0.15s" }),
    grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "16px" },
    btn: { background: "#f5f0e8", border: "1.5px solid #d4c9a8", borderRadius: "14px", padding: "16px", fontSize: "22px", fontWeight: "bold", color: "#2d2a20", cursor: "pointer", fontFamily: "'Georgia',serif", transition: "all 0.15s" },
    delBtn: { background: "#f5f0e8", border: "1.5px solid #d4c9a8", borderRadius: "14px", padding: "16px", fontSize: "16px", color: "#8a8068", cursor: "pointer", fontFamily: "'Georgia',serif" },
    error: { color: "#c0392b", fontSize: "13px", height: "18px", marginTop: "4px" },
  };

  return (
    <div style={ls.wrap}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      <div style={ls.card}>
        <div style={ls.logo}>🌿</div>
        <h1 style={ls.title}>Inventario Naturista</h1>
        <p style={ls.subtitle}>Ingresa tu PIN para continuar</p>

        <div style={ls.dotsRow}>
          {Array.from({ length: ACCESS_PIN.length }).map((_, i) => (
            <div key={i} style={ls.dot(i < pin.length)} />
          ))}
        </div>

        <div style={ls.grid}>
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} style={ls.btn} onClick={() => handleKey(String(d))}>{d}</button>
          ))}
          <div />
          <button style={ls.btn} onClick={() => handleKey("0")}>0</button>
          <button style={ls.delBtn} onClick={handleDelete}>⌫</button>
        </div>

        <div style={ls.error}>{error}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("inv_auth") === "1");
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [view, setView] = useState("inventory");
  const [editId, setEditId] = useState(null);
  const [editStock, setEditStock] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editReason, setEditReason] = useState("venta");
  const [newProduct, setNewProduct] = useState({ name: "", stock: "", minStock: "", unit: "unid.", price: "" });
  const [search, setSearch] = useState("");

  const handleLogin = () => {
    sessionStorage.setItem("inv_auth", "1");
    setAuthed(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("inv_auth");
    setAuthed(false);
  };

  // Cargar datos desde Supabase
  useEffect(() => {
    if (!authed) return;
    (async () => {
      setLoading(true);
      const [{ data: prods }, { data: hist }] = await Promise.all([
        supabase.from("products").select("*").order("id"),
        supabase.from("history").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setProducts(prods || []);
      setHistory(hist || []);
      setLoading(false);
    })();
  }, [authed]);

  const flashSaved = () => { setSavedMsg(true); setTimeout(() => setSavedMsg(false), 1500); };

  const addHistoryEntry = async (productName, oldStock, newStock, reason) => {
    const entry = { product_name: productName, change: newStock - oldStock, reason, old_stock: oldStock, new_stock: newStock };
    const { data } = await supabase.from("history").insert(entry).select().single();
    if (data) setHistory(prev => [data, ...prev]);
  };

  const applyEdit = async (product) => {
    const ns = parseInt(editStock), np = parseFloat(editPrice);
    if (isNaN(ns) || ns < 0) return;
    setSaving(true);
    const updates = { stock: ns, price: !isNaN(np) && np >= 0 ? np : product.price };
    await supabase.from("products").update(updates).eq("id", product.id);
    await addHistoryEntry(product.name, product.stock, ns, editReason);
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updates } : p));
    setEditId(null); setEditStock(""); setEditPrice("");
    setSaving(false); flashSaved();
  };

  const deleteProduct = async (id) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts(prev => prev.filter(p => p.id !== id));
    flashSaved();
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || newProduct.stock === "" || newProduct.minStock === "") return;
    setSaving(true);
    const prod = { name: newProduct.name.trim(), stock: parseInt(newProduct.stock) || 0, min_stock: parseInt(newProduct.minStock) || 1, unit: newProduct.unit || "unid.", price: parseFloat(newProduct.price) || 0 };
    const { data } = await supabase.from("products").insert(prod).select().single();
    if (data) {
      setProducts(prev => [...prev, data]);
      await addHistoryEntry(data.name, 0, data.stock, "ingreso inicial");
    }
    setNewProduct({ name: "", stock: "", minStock: "", unit: "unid.", price: "" });
    setView("inventory");
    setSaving(false); flashSaved();
  };

  if (!authed) return <LoginScreen onLogin={handleLogin} />;

  const lowStock = products.filter(p => p.stock <= p.min_stock);
  const outOfStock = products.filter(p => p.stock === 0);
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const totalValue = products.reduce((acc, p) => acc + p.stock * p.price, 0);

  const stockColor = (p) => p.stock === 0 ? "#c0392b" : p.stock <= p.min_stock ? "#e67e22" : "#27ae60";
  const stockLabel = (p) => p.stock === 0 ? "Sin stock" : p.stock <= p.min_stock ? "Bajo" : "OK";

  const s = {
    app: { minHeight: "100vh", background: "linear-gradient(135deg,#f5f0e8 0%,#e8f0e3 50%,#f0ede3 100%)", fontFamily: "'Georgia',serif", color: "#2d2a20" },
    header: { background: "linear-gradient(90deg,#3d5a2e,#5a7a3a)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(61,90,46,0.3)" },
    headerTitle: { color: "#f5f0e0", fontSize: "20px", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "10px" },
    headerRight: { display: "flex", alignItems: "center", gap: "10px" },
    badge: { background: "#e74c3c", color: "#fff", borderRadius: "50%", width: "22px", height: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" },
    savedBadge: { background: "rgba(255,255,255,0.25)", color: "#f5f0e0", borderRadius: "20px", padding: "3px 10px", fontSize: "12px" },
    logoutBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#f5f0e0", borderRadius: "20px", padding: "5px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "'Georgia',serif" },
    nav: { display: "flex", gap: "4px", padding: "10px 20px", background: "#f5f0e0", borderBottom: "2px solid #d4c9a8", overflowX: "auto" },
    navBtn: (a) => ({ padding: "7px 14px", borderRadius: "20px", border: "none", background: a ? "#3d5a2e" : "transparent", color: a ? "#f5f0e0" : "#3d5a2e", fontFamily: "'Georgia',serif", fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", fontWeight: a ? "bold" : "normal" }),
    container: { maxWidth: "760px", margin: "0 auto", padding: "18px 16px" },
    summaryBar: { background: "rgba(61,90,46,0.1)", border: "1.5px solid rgba(61,90,46,0.2)", borderRadius: "14px", padding: "12px 20px", marginBottom: "16px", display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: "10px" },
    summaryItem: { textAlign: "center" },
    summaryLabel: { fontSize: "10px", color: "#5a7040", textTransform: "uppercase", letterSpacing: "0.5px" },
    summaryValue: { fontSize: "17px", fontWeight: "bold", color: "#3d5a2e" },
    card: { background: "rgba(255,255,255,0.7)", borderRadius: "16px", padding: "14px 16px", marginBottom: "10px", border: "1px solid rgba(212,201,168,0.6)", boxShadow: "0 2px 12px rgba(61,90,46,0.08)" },
    row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" },
    productName: { fontWeight: "bold", fontSize: "14px", flex: 1, minWidth: "130px" },
    pill: (p) => ({ background: stockColor(p) + "22", color: stockColor(p), border: `1px solid ${stockColor(p)}55`, borderRadius: "12px", padding: "2px 9px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap" }),
    priceRow: { display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" },
    priceBox: (a) => ({ background: a + "12", border: `1px solid ${a}33`, borderRadius: "10px", padding: "6px 14px" }),
    priceLabel: { fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "0.4px" },
    priceValue: (a) => ({ fontSize: "15px", fontWeight: "bold", color: a }),
    stockChip: (p) => ({ display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto", background: stockColor(p) + "10", border: `1px solid ${stockColor(p)}33`, borderRadius: "10px", padding: "5px 10px" }),
    stockNum: (p) => ({ fontSize: "18px", fontWeight: "bold", color: stockColor(p) }),
    actionBtn: (c) => ({ background: c, color: "#fff", border: "none", borderRadius: "8px", padding: "5px 11px", cursor: "pointer", fontFamily: "'Georgia',serif", fontSize: "13px" }),
    input: { border: "1.5px solid #c4b98a", borderRadius: "8px", padding: "5px 9px", fontFamily: "'Georgia',serif", fontSize: "13px", background: "#fffdf5", color: "#2d2a20", width: "72px" },
    select: { border: "1.5px solid #c4b98a", borderRadius: "8px", padding: "5px 8px", fontFamily: "'Georgia',serif", fontSize: "12px", background: "#fffdf5", color: "#2d2a20" },
    sectionTitle: { fontSize: "15px", fontWeight: "bold", color: "#3d5a2e", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" },
    searchInput: { width: "100%", border: "1.5px solid #c4b98a", borderRadius: "24px", padding: "9px 18px", fontFamily: "'Georgia',serif", fontSize: "14px", background: "rgba(255,255,255,0.8)", color: "#2d2a20", marginBottom: "14px", boxSizing: "border-box" },
    histItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #e8e0cc", gap: "8px" },
    formGroup: { marginBottom: "13px" },
    label: { display: "block", fontSize: "12px", color: "#5a5040", marginBottom: "4px", fontWeight: "bold" },
    fullInput: { width: "100%", border: "1.5px solid #c4b98a", borderRadius: "8px", padding: "8px 12px", fontFamily: "'Georgia',serif", fontSize: "14px", background: "#fffdf5", color: "#2d2a20", boxSizing: "border-box" },
    primaryBtn: { background: saving ? "#aaa" : "linear-gradient(90deg,#3d5a2e,#5a7a3a)", color: "#f5f0e0", border: "none", borderRadius: "24px", padding: "11px 28px", fontFamily: "'Georgia',serif", fontSize: "15px", cursor: saving ? "not-allowed" : "pointer", fontWeight: "bold", width: "100%", marginTop: "6px" },
    alertCard: (c) => ({ background: c + "15", border: `1.5px solid ${c}55`, borderRadius: "14px", padding: "12px 16px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }),
    emptyMsg: { textAlign: "center", color: "#8a8068", padding: "36px 0", fontStyle: "italic" },
    loadingWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f5f0e8,#e8f0e3)", fontFamily: "'Georgia',serif", color: "#3d5a2e", fontSize: "18px" },
  };

  if (loading) return <div style={s.loadingWrap}>🌿 Cargando inventario...</div>;

  return (
    <div style={s.app}>
      <div style={s.header}>
        <h1 style={s.headerTitle}>🌿 Inventario Naturista</h1>
        <div style={s.headerRight}>
          {savedMsg && <span style={s.savedBadge}>💾 Guardado</span>}
          {lowStock.length > 0 && <span style={s.badge}>{lowStock.length}</span>}
          <button style={s.logoutBtn} onClick={handleLogout}>Salir 🔒</button>
        </div>
      </div>

      <nav style={s.nav}>
        {[{ key: "inventory", label: "📦 Inventario" }, { key: "alerts", label: `⚠️ Alertas (${lowStock.length})` }, { key: "history", label: "📋 Historial" }, { key: "add", label: "➕ Agregar" }].map(({ key, label }) => (
          <button key={key} style={s.navBtn(view === key)} onClick={() => setView(key)}>{label}</button>
        ))}
      </nav>

      <div style={s.container}>

        {/* ── INVENTARIO ── */}
        {view === "inventory" && (
          <div>
            <div style={s.summaryBar}>
              <div style={s.summaryItem}><div style={s.summaryLabel}>Productos</div><div style={s.summaryValue}>{products.length}</div></div>
              <div style={s.summaryItem}><div style={s.summaryLabel}>Con alerta</div><div style={{ ...s.summaryValue, color: lowStock.length > 0 ? "#e67e22" : "#27ae60" }}>{lowStock.length}</div></div>
              <div style={s.summaryItem}><div style={s.summaryLabel}>Valor total</div><div style={s.summaryValue}>{formatPrice(totalValue)}</div></div>
            </div>

            <input style={s.searchInput} placeholder="🔍 Buscar producto..." value={search} onChange={e => setSearch(e.target.value)} />
            {filteredProducts.length === 0 && <p style={s.emptyMsg}>No se encontraron productos.</p>}

            {filteredProducts.map(product => (
              <div key={product.id} style={s.card}>
                <div style={s.row}>
                  <span style={s.productName}>{product.name}</span>
                  <span style={s.pill(product)}>{stockLabel(product)}</span>
                </div>
                <div style={s.priceRow}>
                  <div style={s.priceBox("#5a7a3a")}><div style={s.priceLabel}>Precio / unidad</div><div style={s.priceValue("#3d5a2e")}>{formatPrice(product.price)}</div></div>
                  <div style={s.priceBox("#2471a3")}><div style={s.priceLabel}>Total en stock</div><div style={s.priceValue("#1a5276")}>{formatPrice(product.price * product.stock)}</div></div>
                  <div style={{ ...s.stockChip(product), marginLeft: "auto" }}>
                    <span style={s.stockNum(product)}>{product.stock}</span>
                    <span style={{ fontSize: "12px", color: "#8a8068" }}>{product.unit}</span>
                    <span style={{ fontSize: "10px", color: "#bbb" }}>mín:{product.min_stock}</span>
                  </div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  {editId === product.id ? (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
                      <div><div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>Nuevo stock</div><input style={s.input} type="number" min="0" value={editStock} onChange={e => setEditStock(e.target.value)} autoFocus /></div>
                      <div><div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>Precio ($)</div><input style={s.input} type="number" min="0" value={editPrice} onChange={e => setEditPrice(e.target.value)} /></div>
                      <div><div style={{ fontSize: "10px", color: "#888", marginBottom: "3px" }}>Motivo</div>
                        <select style={s.select} value={editReason} onChange={e => setEditReason(e.target.value)}>
                          <option value="venta">Venta</option><option value="ingreso">Ingreso</option><option value="ajuste">Ajuste</option><option value="merma">Merma</option>
                        </select>
                      </div>
                      <button style={s.actionBtn("#27ae60")} onClick={() => applyEdit(product)} disabled={saving}>✓ Guardar</button>
                      <button style={s.actionBtn("#95a5a6")} onClick={() => setEditId(null)}>✗</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button style={s.actionBtn("#5a7a3a")} onClick={() => { setEditId(product.id); setEditStock(String(product.stock)); setEditPrice(String(product.price)); }}>Actualizar</button>
                      <button style={s.actionBtn("#c0392b")} onClick={() => deleteProduct(product.id)}>🗑</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ALERTAS ── */}
        {view === "alerts" && (
          <div>
            {outOfStock.length > 0 && (<div>
              <p style={s.sectionTitle}>🔴 Sin stock — Pedir urgente</p>
              {outOfStock.map(p => (
                <div key={p.id} style={s.alertCard("#c0392b")}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: "bold" }}>{p.name}</div><div style={{ fontSize: "12px", color: "#777", marginTop: "2px" }}>Mínimo: {p.min_stock} {p.unit} · {formatPrice(p.price)} c/u</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ color: "#c0392b", fontWeight: "bold", fontSize: "22px" }}>0</div><div style={{ fontSize: "11px", color: "#aaa" }}>{p.unit}</div></div>
                </div>
              ))}
            </div>)}
            {lowStock.filter(p => p.stock > 0).length > 0 && (<div style={{ marginTop: "16px" }}>
              <p style={s.sectionTitle}>🟠 Stock bajo — Reabastecer pronto</p>
              {lowStock.filter(p => p.stock > 0).map(p => (
                <div key={p.id} style={s.alertCard("#e67e22")}>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: "bold" }}>{p.name}</div><div style={{ fontSize: "12px", color: "#777", marginTop: "2px" }}>Faltan {p.min_stock - p.stock} {p.unit} · {formatPrice(p.price)} c/u</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ color: "#e67e22", fontWeight: "bold", fontSize: "22px" }}>{p.stock}</div><div style={{ fontSize: "11px", color: "#aaa" }}>{p.unit}</div></div>
                </div>
              ))}
            </div>)}
            {lowStock.length === 0 && <p style={s.emptyMsg}>✅ Todo el inventario está en buen nivel.</p>}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {view === "history" && (
          <div style={s.card}>
            <p style={s.sectionTitle}>📋 Historial de movimientos</p>
            {history.length === 0 && <p style={s.emptyMsg}>Aún no hay movimientos registrados.</p>}
            {history.map(h => (
              <div key={h.id} style={s.histItem}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>{h.product_name}</div>
                  <div style={{ fontSize: "12px", color: "#8a8068", marginTop: "2px" }}>{h.reason?.charAt(0).toUpperCase() + h.reason?.slice(1)} · {new Date(h.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</div>
                  <div style={{ fontSize: "11px", color: "#bbb", marginTop: "1px" }}>{h.old_stock} → {h.new_stock}</div>
                </div>
                <div style={{ fontWeight: "bold", fontSize: "19px", color: h.change >= 0 ? "#27ae60" : "#c0392b", minWidth: "46px", textAlign: "right" }}>{h.change >= 0 ? "+" : ""}{h.change}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── AGREGAR ── */}
        {view === "add" && (
          <div style={s.card}>
            <p style={s.sectionTitle}>🌱 Agregar nuevo producto</p>
            <div style={s.formGroup}><label style={s.label}>Nombre del producto</label><input style={s.fullInput} placeholder="Ej: Jengibre en polvo 200g" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} /></div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ ...s.formGroup, flex: 1 }}><label style={s.label}>Stock actual</label><input style={s.fullInput} type="number" min="0" placeholder="0" value={newProduct.stock} onChange={e => setNewProduct(p => ({ ...p, stock: e.target.value }))} /></div>
              <div style={{ ...s.formGroup, flex: 1 }}><label style={s.label}>Stock mínimo</label><input style={s.fullInput} type="number" min="1" placeholder="5" value={newProduct.minStock} onChange={e => setNewProduct(p => ({ ...p, minStock: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ ...s.formGroup, flex: 1 }}><label style={s.label}>Precio por unidad ($)</label><input style={s.fullInput} type="number" min="0" placeholder="0" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} /></div>
              <div style={{ ...s.formGroup, flex: 1 }}><label style={s.label}>Unidad</label>
                <select style={s.fullInput} value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}>
                  <option value="unid.">Unidades</option><option value="cajas">Cajas</option><option value="kg">Kilogramos</option><option value="litros">Litros</option><option value="paq.">Paquetes</option>
                </select>
              </div>
            </div>
            <button style={s.primaryBtn} onClick={handleAddProduct} disabled={saving}>{saving ? "Guardando..." : "Agregar al inventario"}</button>
          </div>
        )}

      </div>
    </div>
  );
}
