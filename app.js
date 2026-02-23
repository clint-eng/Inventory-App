const STORAGE_KEY = "pest-control-inventory";
const REQUEST_KEY = "pest-control-dd-request";
const SETUP_KEY = "pest-control-setup";
const AUTH_KEY = "pest-control-auth-session";

let products = loadState(STORAGE_KEY, []);
let orders = loadState(REQUEST_KEY, []);
let setupData = loadState(SETUP_KEY, { products: [] });
let authSession = loadState(AUTH_KEY, null);

boot();

function boot() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    bindLogin(loginForm);
    return;
  }

  const rolePage = document.body.dataset.rolePage;
  if (!authSession) {
    location.href = "index.html";
    return;
  }

  if (authSession.role !== rolePage) {
    location.href = authSession.role === "admin" ? "admin.html" : "technician.html";
    return;
  }

  bindCommonSession();

  if (rolePage === "admin") {
    bindAdminPage();
  }

  if (rolePage === "technician") {
    bindTechnicianPage();
  }
}

function bindLogin(form) {
  if (authSession?.role) {
    location.href = authSession.role === "admin" ? "admin.html" : "technician.html";
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const role = document.getElementById("login-role").value;
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!role || !email || !password) return;
    if (role === "admin" && password !== "admin123") return;
    if (role === "technician" && password !== "tech123") return;

    authSession = { role, email };
    localStorage.setItem(AUTH_KEY, JSON.stringify(authSession));
    location.href = role === "admin" ? "admin.html" : "technician.html";
  });
}

function bindCommonSession() {
  const sessionBadge = document.getElementById("session-badge");
  const logoutButton = document.getElementById("logout-button");
  sessionBadge.textContent = `${authSession.role.toUpperCase()}: ${authSession.email}`;
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(AUTH_KEY);
    location.href = "index.html";
  });
}

function bindAdminPage() {
  const productForm = document.getElementById("product-form");
  const inventoryList = document.getElementById("inventory-list");
  const setupProductForm = document.getElementById("setup-product-form");
  const setupProductList = document.getElementById("setup-product-list");
  const ordersList = document.getElementById("orders-list");
  const summaryBtn = document.getElementById("run-summary-report");
  const inventoryBtn = document.getElementById("run-inventory-report");
  const ordersBtn = document.getElementById("run-orders-report");
  const reportOutput = document.getElementById("report-output");

  productForm.addEventListener("submit", (event) => {
    event.preventDefault();
    products.push({
      id: crypto.randomUUID(),
      name: getValue("name"),
      category: getValue("category"),
      quantity: Number(getValue("quantity")),
      unit: getValue("unit"),
      minimum: Number(getValue("minimum")),
      expiration: getValue("expiration"),
    });
    persist();
    productForm.reset();
    renderSimpleList(inventoryList, products.map((p) => `${p.name} | ${p.quantity} ${p.unit} | Min ${p.minimum}`));
  });

  setupProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const imageFile = document.getElementById("setup-product-image").files?.[0] || null;
    const image = imageFile ? await toDataUrl(imageFile) : null;

    setupData.products.push({
      id: crypto.randomUUID(),
      name: getValue("setup-product-name"),
      sku: getValue("setup-product-sku"),
      supplier: getValue("setup-product-supplier"),
      image,
    });
    persist();
    setupProductForm.reset();
    renderProductList(setupProductList, setupData.products);
  });

  summaryBtn.addEventListener("click", () => {
    renderReport(reportOutput, "Summary Report", [
      `Inventory products: ${products.length}`,
      `Setup approved products: ${setupData.products.length}`,
      `Current orders: ${orders.length}`,
    ]);
  });

  inventoryBtn.addEventListener("click", () => {
    renderReport(reportOutput, "Inventory Report", products.map((p) => `${p.name} | ${p.quantity} ${p.unit} | Min ${p.minimum}`));
  });

  ordersBtn.addEventListener("click", () => {
    renderReport(reportOutput, "Orders Report", orders.map((o) => `${o.name} | ${o.requestQty}`));
  });

  renderSimpleList(inventoryList, products.map((p) => `${p.name} | ${p.quantity} ${p.unit} | Min ${p.minimum}`));
  renderProductList(setupProductList, setupData.products);
  renderSimpleList(ordersList, orders.map((o) => `${o.name} | ${o.requestQty} ${o.unit}`));
}

function bindTechnicianPage() {
  const serviceProductsList = document.getElementById("service-products-list");
  const ordersList = document.getElementById("orders-list");
  const tasksList = document.getElementById("tasks-list");
  const orderForm = document.getElementById("order-form");
  const orderProduct = document.getElementById("order-product");

  const sourceProducts = setupData.products.length > 0
    ? setupData.products.map((p) => ({ id: p.id, name: p.name, unit: "unit", image: p.image }))
    : products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, image: null }));

  orderProduct.innerHTML = "";
  for (const product of sourceProducts) {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = product.name;
    orderProduct.appendChild(option);
  }

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = sourceProducts.find((p) => p.id === orderProduct.value);
    const qty = Number(document.getElementById("order-qty").value);
    if (!selected || !Number.isInteger(qty) || qty <= 0) return;

    orders.push({
      productId: selected.id,
      name: selected.name,
      requestQty: qty,
      unit: selected.unit || "unit",
    });

    persist();
    orderForm.reset();
    renderSimpleList(ordersList, orders.map((o) => `${o.name} | ${o.requestQty} ${o.unit}`));
    renderSimpleList(tasksList, buildTasks());
  });

  renderProductList(serviceProductsList, sourceProducts.map((p) => ({ ...p, sku: p.id, supplier: "Approved" })));
  renderSimpleList(ordersList, orders.map((o) => `${o.name} | ${o.requestQty} ${o.unit}`));
  renderSimpleList(tasksList, buildTasks());
}

function buildTasks() {
  const tasks = [];
  tasks.push(...orders.map((o) => `Follow-up order: ${o.name} (${o.requestQty})`));
  tasks.push(...products.filter((p) => p.quantity <= p.minimum).map((p) => `Low stock: ${p.name}`));
  return tasks.length ? tasks : ["No active tasks."];
}

function renderReport(container, title, lines) {
  if (!lines.length) {
    container.classList.add("empty-state");
    container.innerHTML = `<strong>${title}</strong><br/>No report data available.`;
    return;
  }
  container.classList.remove("empty-state");
  container.innerHTML = `<strong>${title}</strong><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}

function renderSimpleList(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty-li";
    li.textContent = "No records yet.";
    container.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  }
}

function renderProductList(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty-li";
    li.textContent = "No records yet.";
    container.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "product-entity-item";
    const image = item.image ? `<img src="${item.image}" class="product-thumb" alt="${item.name}" />` : "";
    li.innerHTML = `${image}<span>${item.name} — SKU: ${item.sku || "n/a"} — Supplier: ${item.supplier || "n/a"}</span>`;
    container.appendChild(li);
  }
}

function getValue(id) {
  return document.getElementById(id).value.trim();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  localStorage.setItem(REQUEST_KEY, JSON.stringify(orders));
  localStorage.setItem(SETUP_KEY, JSON.stringify(setupData));
}

function loadState(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}
