const state = {
  inventory: null,
  products: [],
  route: "/",
  search: ""
};

const views = {
  home: document.getElementById("homeView"),
  catalog: document.getElementById("catalogView"),
  dropship: document.getElementById("dropshipView"),
  api: document.getElementById("apiView"),
  admin: document.getElementById("adminView"),
  product: document.getElementById("productView")
};

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

function money(value) {
  return typeof value === "number" ? `$${value.toFixed(value % 1 ? 2 : 0)}` : "-";
}

function formatDate(value) {
  if (!value) return "尚未导入";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function statValue(name) {
  const summary = state.inventory?.summary || {};
  return summary[name] ?? "-";
}

function showView(name) {
  Object.values(views).forEach((view) => {
    view.hidden = true;
  });
  views[name].hidden = false;
  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-nav") === state.route);
  });
}

function routeFromPath(pathname) {
  if (pathname.startsWith("/products/")) return "product";
  if (pathname === "/catalog") return "catalog";
  if (pathname === "/dropship") return "dropship";
  if (pathname === "/api-center") return "api";
  if (pathname === "/admin") return "admin";
  return "home";
}

function navigate(path, push = true) {
  state.route = path;
  if (push) history.pushState({}, "", path);
  renderRoute();
}

function renderRoute() {
  const route = routeFromPath(location.pathname);
  state.route = location.pathname;
  if (route === "home") renderHome();
  if (route === "catalog") renderCatalog();
  if (route === "dropship") renderDropship();
  if (route === "api") renderApiCenter();
  if (route === "admin") renderAdmin();
  if (route === "product") renderProduct(decodeURIComponent(location.pathname.replace("/products/", "")));
  showView(route);
}

function capability(title, body) {
  return `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
}

function homeStat(label, value, caption) {
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(caption)}</small></div>`;
}

function renderHome() {
  document.title = "SourceFlow 香水批发 | 一件代发采购平台";
  const products = state.products.filter((item) => item.commerce);
  const stocked = products.filter((item) => item.available !== false && Number(item.inventory || 0) > 0);
  const heroProducts = products.filter((item) => homeImageUrl(item)).slice(0, 6);
  const featured = homePickProducts(products, 8);
  const valuePicks = stocked
    .slice()
    .sort((a, b) => homeWholesalePrice(a) - homeWholesalePrice(b))
    .slice(0, 4);
  const brandCards = homeTopBrands(products, 10).map(homeBrandCard).join("");
  const categories = homeCategories(products);
  const researchCounts = state.inventory?.summary?.researchStatusCounts || {};
  const deepCount = (researchCounts["manual-verified"] || 0) + (researchCounts.researched || 0);
  const totalStock = products.reduce((sum, item) => sum + Number(item.inventory || 0), 0);

  views.home.innerHTML = `
    <div class="home-storefront">
      <section class="home-hero">
        <div class="home-hero-copy">
          <p class="eyebrow">PERFUME WHOLESALE & DROPSHIP</p>
          <h1>香水批发货盘，一件起代发</h1>
          <p>面向独立站卖家、内容电商团队和跨境卖家，提供可直接上架的香水 SKU、批发阶梯价、库存同步 API、产品资料 API 和 CSV/JSON 上架包。</p>
          <div class="hero-actions">
            <a class="primary-action" href="/catalog" data-nav="/catalog">浏览香水货盘</a>
            <a href="/api/catalog-pack?format=csv">下载上架包</a>
            <a href="/dropship" data-nav="/dropship">查看一件代发</a>
          </div>
          <div class="home-proof-row">
            <span>现货批发</span>
            <span>白标发货</span>
            <span>产品内容已补齐</span>
            <span>API 自动同步</span>
          </div>
        </div>
        <div class="perfume-showcase" aria-label="香水批发精选商品">
          ${homeHeroShowcase(heroProducts)}
        </div>
      </section>

      <section class="wholesale-stat-row" aria-label="平台数据">
        ${homeStat("Active SKU", statValue("productCount"), "可售香水货盘")}
        ${homeStat("Inventory", totalStock.toLocaleString("en-US"), "可同步库存")}
        ${homeStat("Listing Pack", state.products.length, "可下载上架资料")}
        ${homeStat("Deep Content", deepCount || "-", "香调与卖点资料")}
      </section>

      <section class="home-section">
        <div class="section-title">
          <div>
            <p class="eyebrow">SHOP BY CATEGORY</p>
            <h2>按香水买家场景采购</h2>
          </div>
          <a href="/catalog" data-nav="/catalog">进入全部目录</a>
        </div>
        <div class="category-grid">${categories.map(homeCategoryCard).join("")}</div>
      </section>

      <section class="home-section">
        <div class="section-title">
          <div>
            <p class="eyebrow">NEW ARRIVALS</p>
            <h2>热门新品与批发主推</h2>
            <p>参考香水零售站常见的新品、品牌、男女香水入口，但这里直接给卖家看批发价、库存和上架资料。</p>
          </div>
          <a href="/api/catalog-pack?format=json">下载 JSON 产品包</a>
        </div>
        <div class="home-product-grid">${featured.map(homeProductCard).join("")}</div>
      </section>

      <section class="home-split">
        <div class="home-section">
          <div class="section-title">
            <div>
              <p class="eyebrow">TOP BRANDS</p>
              <h2>热门品牌货盘</h2>
            </div>
          </div>
          <div class="brand-cloud">${brandCards}</div>
        </div>
        <div class="home-section dark-feature">
          <p class="eyebrow">DROPSHIP READY</p>
          <h2>不囤货，也能先上架测试</h2>
          <p>卖家拿到订单后，通过 API 或表格提交 SKU、数量和收件信息；我们按供货政策完成代发、售后规则和库存回写。</p>
          <div class="dark-actions">
            <a class="primary-action" href="/dropship" data-nav="/dropship">了解代发流程</a>
            <a href="/api-center" data-nav="/api-center">查看 API</a>
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="section-title">
          <div>
            <p class="eyebrow">BUNDLE & SAVE</p>
            <h2>低门槛起批商品</h2>
            <p>适合独立站、TikTok Shop、Amazon 或 Shopify 店铺先做测品。</p>
          </div>
        </div>
        <div class="deal-strip">${valuePicks.map(homeDealCard).join("")}</div>
      </section>
    </div>
  `;
}

function homeHeroShowcase(products) {
  const primary = products[0];
  const rest = products.slice(1, 6);
  if (!primary) return `<div class="showcase-empty">等待产品图片导入</div>`;
  return `
    <a class="showcase-main" href="/products/${encodeURIComponent(primary.sku)}" data-route="/products/${escapeHtml(primary.sku)}">
      <img src="${escapeHtml(homeImageUrl(primary))}" alt="${escapeHtml(homeName(primary))}" />
      <span>from ${money(homeWholesalePrice(primary))}</span>
      <strong>${escapeHtml(homeName(primary))}</strong>
    </a>
    <div class="showcase-stack">
      ${rest.map((item) => `
        <a href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}" title="${escapeHtml(homeName(item))}">
          <img src="${escapeHtml(homeImageUrl(item))}" alt="${escapeHtml(homeName(item))}" loading="lazy" />
        </a>
      `).join("")}
    </div>
  `;
}

function homeCategories(products) {
  const women = products.filter((item) => /women/i.test(homeGender(item))).length;
  const men = products.filter((item) => /men/i.test(homeGender(item)) && !/women/i.test(homeGender(item))).length;
  const unisex = products.filter((item) => /unisex/i.test(homeGender(item))).length;
  const arabian = products.filter((item) => /(lattafa|armaf|rasasi|afnan|al haramain|paris corner|maison alhambra|arabian|oud)/i.test(`${homeBrand(item)} ${homeFamily(item)} ${homeName(item)}`)).length;
  const vanilla = products.filter((item) => /(vanilla|gourmand|sweet|candy|amber)/i.test(`${homeFamily(item)} ${(item.commerce?.fragrance?.accords || []).join(" ")}`)).length;
  const fresh = products.filter((item) => /(fresh|citrus|blue|aquatic|aromatic)/i.test(`${homeFamily(item)} ${(item.commerce?.fragrance?.accords || []).join(" ")}`)).length;
  return [
    ["女士香水", "Women", women, "甜美、花香、果香与日常通勤款"],
    ["男士香水", "Men", men, "木质、馥奇、蓝调与商务香"],
    ["中东香水", "Oud", arabian, "Lattafa、Armaf、Rasasi 等热卖线"],
    ["中性香水", "Uni", unisex, "男女皆可销售的安全测品"],
    ["香草甜香", "Vanilla", vanilla, "高转化的甜香与美食调"],
    ["清新蓝调", "Fresh", fresh, "夏季、运动、日常场景"]
  ];
}

function homeCategoryCard([title, mark, count, text]) {
  return `
    <a class="category-card" href="/catalog" data-nav="/catalog">
      <span>${escapeHtml(mark)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(count)} SKU</small>
      <p>${escapeHtml(text)}</p>
    </a>
  `;
}

function homePickProducts(products, limit) {
  const preferredBrands = ["Lattafa", "Armaf", "Rasasi", "Paris Corner", "Afnan", "Kayali", "Bharara", "Maison Alhambra"];
  const picked = [];
  preferredBrands.forEach((brand) => {
    const match = products.find((item) => !picked.includes(item) && homeBrand(item).toLowerCase().includes(brand.toLowerCase()) && homeImageUrl(item));
    if (match) picked.push(match);
  });
  products.forEach((item) => {
    if (picked.length < limit && !picked.includes(item) && homeImageUrl(item)) picked.push(item);
  });
  return picked.slice(0, limit);
}

function homeProductCard(item) {
  return `
    <article class="home-product-card">
      <a class="home-product-image" href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}">
        <img src="${escapeHtml(homeImageUrl(item))}" alt="${escapeHtml(homeName(item))}" loading="lazy" />
        <span>${item.available === false ? "Out" : "In stock"}</span>
      </a>
      <div>
        <small>${escapeHtml(homeBrand(item))}</small>
        <h3><a href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}">${escapeHtml(homeName(item))}</a></h3>
        <p>${escapeHtml(item.commerce?.shortDescription || homeFamily(item) || item.capacity || "Wholesale perfume SKU")}</p>
        <div class="home-card-foot">
          <strong>from ${money(homeWholesalePrice(item))}</strong>
          <code>${escapeHtml(item.sku)}</code>
        </div>
      </div>
    </article>
  `;
}

function homeTopBrands(products, limit) {
  const counts = new Map();
  products.forEach((item) => {
    const brand = homeBrand(item);
    if (!brand || brand === "Fragrance") return;
    counts.set(brand, (counts.get(brand) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function homeBrandCard([brand, count]) {
  return `
    <a href="/catalog" data-nav="/catalog">
      <strong>${escapeHtml(brand)}</strong>
      <span>${escapeHtml(count)} SKU</span>
    </a>
  `;
}

function homeDealCard(item) {
  return `
    <a class="deal-card" href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}">
      <img src="${escapeHtml(homeImageUrl(item))}" alt="${escapeHtml(homeName(item))}" loading="lazy" />
      <div>
        <span>${escapeHtml(homeBrand(item))}</span>
        <strong>${escapeHtml(homeName(item))}</strong>
        <small>${escapeHtml(item.inventory)} stock - from ${money(homeWholesalePrice(item))}</small>
      </div>
    </a>
  `;
}

function homeImageUrl(item) {
  return item.image?.thumbUrl || item.image?.url || item.image?.supplierImage?.thumbUrl || item.image?.supplierImage?.url || "";
}

function homeName(item) {
  return item.commerce?.displayName || item.commerce?.title || item.perfumeName || item.sku;
}

function homeBrand(item) {
  return item.commerce?.brand || item.brand || "Fragrance";
}

function homeGender(item) {
  return item.commerce?.fragrance?.gender || "";
}

function homeFamily(item) {
  return item.commerce?.fragrance?.family || "";
}

function homeWholesalePrice(item) {
  const ecommercePrice = item.commerce?.ecommerce?.wholesaleFrom;
  if (typeof ecommercePrice === "number") return ecommercePrice;
  const tierPrices = (item.priceTiers || []).map((tier) => tier.unitPrice).filter((value) => typeof value === "number");
  return tierPrices.length ? Math.min(...tierPrices) : 0;
}

function renderCatalog() {
  document.title = "产品目录 | SourceFlow";
  const query = state.search.trim().toLowerCase();
  const filtered = state.products.filter((item) => {
    if (!query) return true;
    const commerce = item.commerce || {};
    return [item.sku, item.perfumeName, item.capacity, commerce.displayName, commerce.fragrance?.family, ...(commerce.fragrance?.accords || [])]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  views.catalog.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Catalog</p>
        <h1>产品目录</h1>
        <p>面向批发与一件代发卖家的全量可售 SKU。点击产品可查看资料页、单品 API 和下载上架包。</p>
      </div>
      <input id="searchInput" type="search" placeholder="搜索 SKU / 商品名 / 香调" value="${escapeHtml(state.search)}" />
    </section>
    <div class="catalog-summary"><strong>${filtered.length}</strong><span>/ ${state.products.length} products</span></div>
    <div class="product-grid">${filtered.map(renderProductCard).join("") || `<div class="empty-state">没有匹配的产品。</div>`}</div>
  `;
  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.search = event.target.value;
    renderCatalog();
  });
}

function renderProductCard(item) {
  const commerce = item.commerce;
  const image = item.image?.thumbUrl || item.image?.url || "";
  return `
    <article class="product-card">
      <a class="product-image" href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(commerce?.displayName || item.perfumeName)}" loading="lazy" />` : ""}
        <span>${item.available ? "In stock" : "Out"}</span>
      </a>
      <div class="product-card-body">
        <div class="sku-row"><code>${escapeHtml(item.sku)}</code><strong>${item.inventory} stock</strong></div>
        <h3><a href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}">${escapeHtml(commerce?.displayName || item.perfumeName)}</a></h3>
        <p>${escapeHtml(commerce?.shortDescription || item.perfumeName)}</p>
        <div class="card-meta">
          <span>${escapeHtml(item.capacity)}</span>
          <span>${escapeHtml(commerce?.fragrance?.family || "Fragrance")}</span>
          <span>from ${money(commerce?.ecommerce?.wholesaleFrom)}</span>
        </div>
        <div class="card-actions">
          <a class="primary-action" href="/products/${encodeURIComponent(item.sku)}" data-route="/products/${escapeHtml(item.sku)}">资料页</a>
          <a href="/api/products/${encodeURIComponent(item.sku)}/pack">下载包</a>
        </div>
      </div>
    </article>
  `;
}

function renderDropship() {
  document.title = "一件代发 | SourceFlow";
  views.dropship.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Dropship Fulfillment</p>
        <h1>一件代发能力</h1>
        <p>卖家可以先上架测试，不需要囤货。订单产生后，通过 API 或人工导入把 SKU、收件信息和数量提交给我们履约。</p>
      </div>
    </section>
    <section class="process-grid">
      ${step("1", "下载资料包", "获取标题、图片、描述、香调、卖点、库存和阶梯价。")}
      ${step("2", "卖家上架销售", "适合 Shopify、WooCommerce、Amazon、TikTok Shop 或独立站。")}
      ${step("3", "订单提交 API", "用 SKU 和收件信息提交代发请求，后续可接入物流状态。")}
      ${step("4", "售后按政策处理", "丢件、错发、漏发、破损等规则来自供应链政策。")}
    </section>
    <section class="content-band">
      <h2>代发政策摘要</h2>
      <div class="policy-list">${renderPolicyItems()}</div>
    </section>
  `;
}

function step(index, title, body) {
  return `<article><span>${index}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`;
}

function renderApiCenter() {
  document.title = "API Center | SourceFlow Sync";
  const origin = location.origin;
  const endpoints = [
    ["GET", "/api/sync/status", "Seller-store sync guide: import, changes, webhooks, inventory locks, and orders"],
    ["GET", "/api/changes?since=:revision", "Poll changed SKUs with inventory, pricing, and listing data since a revision"],
    ["POST", "/api/webhooks/subscriptions", "Register a seller webhook URL for product, inventory, and price updates"],
    ["POST", "/api/webhooks/subscriptions/:id/test", "Send a signed test webhook event to a seller endpoint"],
    ["POST", "/api/inventory/locks", "Lock stock before seller checkout to prevent overselling"],
    ["POST", "/api/inventory/locks/:id/release", "Release a lock after cancellation or payment timeout"],
    ["GET", "/api/agent/inventory", "给 AGENT 使用的库存与资料紧凑接口"],
    ["GET", "/api/products", "分页读取产品与 commerce 资料"],
    ["GET", "/api/products/:sku", "读取单个 SKU 的完整产品资料"],
    ["GET", "/api/products/:sku/pack", "下载单品上架资料包"],
    ["GET", "/api/stock?sku=YKW-LA-FEN", "读取单 SKU 库存、价格和代发字段"],
    ["GET", "/api/catalog-pack?format=csv", "下载可导入平台的 CSV 上架包"],
    ["GET", "/api/catalog-pack?format=json", "下载 JSON 全量产品资料包"],
    ["POST", "/api/dropship/quote", "一件代发报价预估"],
    ["POST", "/api/dropship/orders", "提交一件代发订单草稿"],
    ["GET", "/api/policy", "读取供货与售后政策"]
  ];
  views.api.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">API Center</p>
        <h1>库存、产品资料与一件代发 API</h1>
        <p>公开给卖家系统、自动化 AGENT 和独立站后端使用。当前为本地接口，正式开放前建议加鉴权、订单签名和访问限流。</p>
      </div>
      <a class="primary-action" href="/api/docs" target="_blank" rel="noreferrer">打开 API JSON</a>
    </section>
    <section class="api-grid">
      ${endpoints.map(([method, path, desc]) => endpoint(method, `${origin}${path}`, desc)).join("")}
    </section>
  `;
}

function endpoint(method, url, desc) {
  return `<article class="endpoint-card"><span>${method}</span><code>${escapeHtml(url)}</code><p>${escapeHtml(desc)}</p></article>`;
}

function renderAdmin() {
  document.title = "Admin | SourceFlow";
  views.admin.innerHTML = `
    <section class="page-head admin-head">
      <div>
        <p class="eyebrow">Admin</p>
        <h1>库存与资料管理</h1>
        <p>管理入口只放在角落，避免打扰采购卖家。这里用于上传供应链 Excel、导入桌面文件和检查同步状态。</p>
      </div>
      <div class="admin-status">
        <span>Revision</span>
        <strong>${escapeHtml(state.inventory?.revision || "--")}</strong>
        <small>${formatDate(state.inventory?.source?.importedAt)}</small>
      </div>
    </section>
    <section class="admin-panel visible">
      <div>
        <h2>上传库存表</h2>
        <p>支持 .xlsx / .xls / .csv。上传后会刷新库存、价格、政策和 API 数据。产品详情资料由 product-content.js 单独维护。</p>
      </div>
      <form id="uploadForm" class="compact-upload">
        <input id="fileInput" name="file" type="file" accept=".xlsx,.xls,.csv" />
        <label for="fileInput" id="fileLabel">选择货盘文件</label>
        <button type="submit">上传更新</button>
        <button id="importDefault" type="button">导入桌面文件</button>
      </form>
      <pre id="uploadResult" class="result">等待上传...</pre>
    </section>
  `;
  bindAdminForm();
}

function bindAdminForm() {
  const form = document.getElementById("uploadForm");
  const fileInput = document.getElementById("fileInput");
  const fileLabel = document.getElementById("fileLabel");
  const result = document.getElementById("uploadResult");
  const importDefault = document.getElementById("importDefault");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileLabel.textContent = file ? file.name : "选择货盘文件";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    result.textContent = "正在解析并更新库存...";
    try {
      const response = await fetchJson("/api/upload", { method: "POST", body });
      result.textContent = JSON.stringify(response, null, 2);
      await loadData();
    } catch (error) {
      result.textContent = error.message;
    }
  });

  importDefault.addEventListener("click", async () => {
    result.textContent = "正在导入桌面 Inventory.xlsx ...";
    try {
      const response = await fetchJson("/api/import-default", { method: "POST" });
      result.textContent = JSON.stringify(response, null, 2);
      await loadData();
      renderAdmin();
    } catch (error) {
      result.textContent = error.message;
    }
  });
}

function renderProduct(sku) {
  const item = state.products.find((product) => product.sku.toLowerCase() === sku.toLowerCase() || product.slug === sku.toLowerCase());
  if (!item) {
    document.title = "Product not found | SourceFlow";
    views.product.innerHTML = `<section class="page-head"><h1>没有找到产品</h1><a href="/catalog" data-nav="/catalog">返回目录</a></section>`;
    return;
  }
  const commerce = item.commerce;
  document.title = `${commerce?.displayName || item.sku} | SourceFlow`;
  const image = item.image?.url || item.image?.thumbUrl || "";
  const notes = commerce?.fragrance?.notes || {};
  const tiers = (item.priceTiers || []).map((tier) => `<div><span>${escapeHtml(tier.label)}</span><strong>${money(tier.unitPrice)}</strong></div>`).join("");
  const bullets = (commerce?.listingBullets || []).map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("");
  const community = commerce?.community;
  const sourcing = commerce?.sourcing || {};
  const isDeep = sourcing.researchStatus === "manual-verified" || sourcing.researchStatus === "researched";

  views.product.innerHTML = `
    <section class="product-detail">
      <div class="detail-media">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(commerce?.displayName || item.perfumeName)}" />` : ""}
        <div class="source-links">
          <a href="/api/products/${encodeURIComponent(item.sku)}" target="_blank" rel="noreferrer">产品资料 API</a>
          <a href="/api/products/${encodeURIComponent(item.sku)}/pack">下载单品包</a>
          ${item.image?.pageUrl ? `<a href="${escapeHtml(item.image.pageUrl)}" target="_blank" rel="noreferrer">图片来源页</a>` : ""}
        </div>
      </div>
      <article class="detail-copy">
        <p class="eyebrow">${escapeHtml(item.sku)} · ${escapeHtml(item.capacity)}</p>
        <h1>${escapeHtml(commerce?.title || item.perfumeName)}</h1>
        <div class="research-status ${isDeep ? "verified" : "pending"}">
          <strong>${isDeep ? "深度香水资料已接入" : "等待深度香水资料复核"}</strong>
          <span>${escapeHtml(sourcing.researchStatus || "catalog-generated")} · ${escapeHtml(sourcing.dataConfidence || "low")}</span>
          ${sourcing.reviewNote ? `<p>${escapeHtml(sourcing.reviewNote)}</p>` : ""}
        </div>
        <p class="detail-lede">${escapeHtml(commerce?.longDescription || "")}</p>
        <div class="detail-badges">
          <span>一件代发</span><span>批发价</span><span>${escapeHtml(commerce?.fragrance?.gender || "Unisex")}</span><span>${escapeHtml(commerce?.fragrance?.family || "Fragrance")}</span>
        </div>
        <h3>上架卖点</h3>
        <ul class="bullet-list">${bullets}</ul>
        <h3>香调结构</h3>
        <div class="notes-grid">${renderNoteBlock("Top", notes.top)}${renderNoteBlock("Middle", notes.middle)}${renderNoteBlock("Base", notes.base)}</div>
        ${renderSourceLinks(sourcing)}
        ${community ? renderCommunity(community) : ""}
        <h3>批发价格</h3>
        <div class="tier-grid">${tiers}</div>
      </article>
    </section>
  `;
}

function renderSourceLinks(sourcing = {}) {
  const links = (sourcing.sourceLinks || []).map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("");
  if (!links && !sourcing.sourcePage) return "";
  return `
    <section class="source-panel">
      <h3>资料来源</h3>
      <div class="source-links detail-sources">
        ${sourcing.sourcePage ? `<a href="${escapeHtml(sourcing.sourcePage)}" target="_blank" rel="noreferrer">图片/资料来源页</a>` : ""}
        ${links}
      </div>
    </section>
  `;
}

function renderCommunity(community) {
  const gallery = (community.gallery || []).map((img) => `<a href="${escapeHtml(img.url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(img.thumbUrl || img.url)}" alt="${escapeHtml(img.alt || "Product image")}" loading="lazy" /></a>`).join("");
  const likedFor = (community.reviewInsights?.likedFor || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const watchouts = (community.reviewInsights?.watchouts || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const angles = (community.reviewInsights?.merchandisingAngles || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const recs = (community.recommendations || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const research = (community.photoResearchLinks || []).map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("");
  return `
    <section class="community-section">
      <div class="community-head"><div><h3>社区口碑与素材研究</h3><p>评论已归纳为原创摘要，用户实拍图请确认授权后再用于上架。</p></div><div class="rating-box"><strong>${escapeHtml(community.stats?.rating || "-")}</strong><span>/ ${escapeHtml(community.stats?.ratingScale || 5)} · ${escapeHtml(community.stats?.voteCount || "-")} votes</span></div></div>
      <div class="community-gallery">${gallery}</div>
      <div class="photo-research"><h4>用户实拍图研究入口</h4><div class="source-links detail-sources">${research}</div></div>
      <div class="insight-block"><h4>评论摘要</h4><p>${escapeHtml(community.reviewInsights?.summary || "")}</p></div>
      <div class="feedback-grid"><div><h4>常见好评点</h4><ul>${likedFor}</ul></div><div><h4>上架注意点</h4><ul>${watchouts}</ul></div></div>
      <div class="tag-block"><h4>可用营销角度</h4><div>${angles}</div></div>
      <div class="tag-block"><h4>关联/相似香水</h4><div>${recs}</div></div>
      ${community.usageNotice ? `<p class="review-note">${escapeHtml(community.usageNotice)}</p>` : ""}
    </section>
  `;
}

function renderNoteBlock(label, values = []) {
  return `<div><span>${label}</span><strong>${escapeHtml((values || []).join(", ") || "-")}</strong></div>`;
}

function renderPolicyItems() {
  const bullets = state.inventory?.policy?.bullets?.length ? state.inventory.policy.bullets : ["暂无政策内容。"];
  return bullets.map((item) => `<div class="policy-item">${escapeHtml(item)}</div>`).join("");
}

async function loadData() {
  const health = await fetchJson("/api/health");
  state.inventory = {
    revision: health.revision,
    source: { importedAt: health.updatedAt },
    summary: {
      productCount: health.productCount,
      productImageCount: health.productImageCount,
      commerceProductCount: health.commerceProductCount,
      researchStatusCounts: health.researchStatusCounts
    },
    policy: { bullets: [] }
  };
  const products = await fetchJson("/api/products?limit=all");
  state.products = (products.items || []).filter((item) => item.commerce);
  const policy = await fetchJson("/api/policy");
  state.inventory.policy = policy.policy || state.inventory.policy;
}

function bindGlobalNavigation() {
  document.addEventListener("click", (event) => {
    const routeLink = event.target.closest("[data-route]");
    const navLink = event.target.closest("[data-nav]");
    const link = routeLink || navLink;
    if (!link) return;
    event.preventDefault();
    navigate(link.getAttribute(routeLink ? "data-route" : "data-nav"));
  });
  window.addEventListener("popstate", () => renderRoute());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

loadData()
  .then(() => {
    bindGlobalNavigation();
    renderRoute();
  })
  .catch((error) => {
    views.home.innerHTML = `<section class="page-head"><h1>加载失败</h1><p>${escapeHtml(error.message)}</p></section>`;
    showView("home");
  });
