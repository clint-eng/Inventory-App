const STORAGE_KEY = "pest-control-inventory";
const REQUEST_KEY = "pest-control-dd-request";
const TECHNICIAN_KEY = "pest-control-technicians";
const SETUP_KEY = "pest-control-setup";
const AUTH_KEY = "pest-control-auth-session";

const authScreen = document.getElementById("auth-screen");
const loginForm = document.getElementById("login-form");
const logoutButton = document.getElementById("logout-button");
const sessionBadge = document.getElementById("session-badge");

const homeScreen = document.getElementById("home-screen");
const countsView = document.getElementById("counts-view");
const requestsView = document.getElementById("requests-view");
const setupView = document.getElementById("setup-view");
const dashboardView = document.getElementById("dashboard-view");
const tasksView = document.getElementById("tasks-view");
const serviceProductsView = document.getElementById("service-products-view");
const scannerView = document.getElementById("scanner-view");

const form = document.getElementById("product-form");
const inventoryBody = document.getElementById("inventory-body");
const rowTemplate = document.getElementById("row-template");
const emptyState = document.getElementById("empty-state");
const table = document.getElementById("inventory-table");
const lowStockToggle = document.getElementById("show-low-stock");

const technicianForm = document.getElementById("technician-form");
const transferForm = document.getElementById("transfer-form");
const transferTechnician = document.getElementById("transfer-technician");
const transferProduct = document.getElementById("transfer-product");
const technicianBody = document.getElementById("technician-body");
const technicianTable = document.getElementById("technician-table");
const technicianEmpty = document.getElementById("technician-empty");

const ddBody = document.getElementById("dd-body");
const ddTable = document.getElementById("dd-table");
const ddEmptyState = document.getElementById("dd-empty-state");
const ddRowTemplate = document.getElementById("dd-row-template");
const requestList = document.getElementById("request-list");
const requestEmpty = document.getElementById("request-empty");
const copyRequestButton = document.getElementById("copy-request");

const companyForm = document.getElementById("company-form");
const companyDisplay = document.getElementById("company-display");
const warehouseForm = document.getElementById("warehouse-form");
const warehouseList = document.getElementById("warehouse-list");
const truckForm = document.getElementById("truck-form");
const truckList = document.getElementById("truck-list");
const setupTechnicianForm = document.getElementById("setup-technician-form");
const setupTechnicianList = document.getElementById("setup-technician-list");
const supplierForm = document.getElementById("supplier-form");
const supplierList = document.getElementById("supplier-list");
const setupProductForm = document.getElementById("setup-product-form");
const setupProductList = document.getElementById("setup-product-list");
const runSummaryReportButton = document.getElementById("run-summary-report");
const runInventoryReportButton = document.getElementById("run-inventory-report");
const runOrdersReportButton = document.getElementById("run-orders-report");
const reportOutput = document.getElementById("report-output");

const dashboardApprovedProducts = document.getElementById("dashboard-approved-products");
const dashboardTechnicians = document.getElementById("dashboard-technicians");
const dashboardLocations = document.getElementById("dashboard-locations");
const dashboardProductsInLocation = document.getElementById("dashboard-products-in-location");
const dashboardCurrentOrders = document.getElementById("dashboard-current-orders");
const dashboardTrucks = document.getElementById("dashboard-trucks");
const dashboardWarehouses = document.getElementById("dashboard-warehouses");
const tasksList = document.getElementById("tasks-list");
const serviceProductsList = document.getElementById("service-products-list");

let authSession = loadState(AUTH_KEY, null);
let products = loadState(STORAGE_KEY, []);
let technicianRequest = loadState(REQUEST_KEY, []);
let technicians = loadState(TECHNICIAN_KEY, []);
let setupData = loadState(SETUP_KEY, {
  company: null,
  warehouses: [],
  trucks: [],
  technicians: [],
  suppliers: [],
  products: [],
});

for (const tile of document.querySelectorAll('[data-view-target]')) {
  tile.addEventListener("click", () => {
    if (!isAllowedView(tile.dataset.viewTarget)) return;
    showView(tile.dataset.viewTarget);
  });
}

for (const backButton of document.querySelectorAll('[data-go-home]')) {
  backButton.addEventListener("click", () => showView("home-screen"));
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const role = document.getElementById("login-role").value;
  const email = getValue("login-email");
  const password = document.getElementById("login-password").value;

  if (!role || !email || !password) return;

  if (role === "admin" && password !== "admin123") return;
  if (role === "technician" && password !== "tech123") return;

  authSession = { role, email };
  localStorage.setItem(AUTH_KEY, JSON.stringify(authSession));
  applyAuthState();
  showView("home-screen");
  loginForm.reset();
});

logoutButton.addEventListener("click", () => {
  authSession = null;
  localStorage.removeItem(AUTH_KEY);
  applyAuthState();
});

form.addEventListener("submit", (event) => {
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
  persistAndRender();
  form.reset();
});

technicianForm.addEventListener("submit", (event) => {
  event.preventDefault();
  technicians.push({
    id: crypto.randomUUID(),
    name: getValue("technician-name"),
    email: getValue("technician-email"),
    truckId: getValue("truck-id"),
    inventory: {},
  });
  persistAndRender();
  technicianForm.reset();
});

transferForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const technicianId = transferTechnician.value;
  const productId = transferProduct.value;
  const qty = Number(document.getElementById("transfer-qty").value);
  if (!technicianId || !productId || !Number.isInteger(qty) || qty <= 0) return;

  const product = products.find((item) => item.id === productId);
  const tech = technicians.find((item) => item.id === technicianId);
  if (!product || !tech || product.quantity < qty) return;

  product.quantity -= qty;
  tech.inventory[productId] = (tech.inventory[productId] || 0) + qty;
  persistAndRender();
  transferForm.reset();
});

lowStockToggle.addEventListener("change", renderProducts);

inventoryBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const row = event.target.closest("tr");
  const productId = row?.dataset.id;
  if (!productId) return;

  if (button.dataset.action === "delete") {
    products = products.filter((product) => product.id !== productId);
    technicianRequest = technicianRequest.filter((item) => item.productId !== productId);
    technicians = technicians.map((tech) => {
      const updated = { ...tech, inventory: { ...tech.inventory } };
      delete updated.inventory[productId];
      return updated;
    });
  }

  if (button.dataset.action === "consume") {
    products = products.map((product) =>
      product.id === productId ? { ...product, quantity: Math.max(0, product.quantity - 1) } : product,
    );
  }

  persistAndRender();
});

ddBody.addEventListener("click", (event) => {
  const button = event.target.closest('button[data-action="add-request"]');
  if (!button) return;

  const row = event.target.closest("tr");
  const productId = row?.dataset.id;
  if (!productId) return;

  const input = row.querySelector('[data-col="request-input"]');
  const requestedAmount = Number(input.value);
  if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) return;

  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = technicianRequest.find((item) => item.productId === productId);
  if (existing) existing.requestQty += requestedAmount;
  else technicianRequest.push({ productId, name: product.name, unit: product.unit, requestQty: requestedAmount });

  persistAndRender();
});

requestList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button?.dataset.productId) return;
  technicianRequest = technicianRequest.filter((item) => item.productId !== button.dataset.productId);
  persistAndRender();
});

copyRequestButton.addEventListener("click", async () => {
  const summary = buildRequestSummary();
  if (!summary) return;

  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(summary);
    copyRequestButton.textContent = "Copied!";
  } catch {
    copyRequestButton.textContent = "Copy Failed";
  }

  setTimeout(() => {
    copyRequestButton.textContent = "Copy Request Summary";
  }, 1200);
});

companyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setupData.company = {
    name: getValue("company-name"),
    address: getValue("company-address"),
    phone: getValue("company-phone"),
  };
  persistAndRender();
});

warehouseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setupData.warehouses.push({ id: crypto.randomUUID(), name: getValue("warehouse-name"), location: getValue("warehouse-location") });
  persistAndRender();
  warehouseForm.reset();
});

truckForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setupData.trucks.push({ id: crypto.randomUUID(), truckId: getValue("setup-truck-id"), plate: getValue("setup-truck-plate") });
  persistAndRender();
  truckForm.reset();
});

setupTechnicianForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setupData.technicians.push({
    id: crypto.randomUUID(),
    name: getValue("setup-technician-name"),
    phone: getValue("setup-technician-phone"),
    email: getValue("setup-technician-email"),
  });
  persistAndRender();
  setupTechnicianForm.reset();
});

supplierForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setupData.suppliers.push({ id: crypto.randomUUID(), name: getValue("supplier-name"), contact: getValue("supplier-contact") });
  persistAndRender();
  supplierForm.reset();
});

setupProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const imageFile = document.getElementById("setup-product-image").files?.[0] || null;
  const imageDataUrl = imageFile ? await toDataUrl(imageFile) : null;

  setupData.products.push({
    id: crypto.randomUUID(),
    name: getValue("setup-product-name"),
    sku: getValue("setup-product-sku"),
    supplier: getValue("setup-product-supplier"),
    image: imageDataUrl,
  });
  persistAndRender();
  setupProductForm.reset();
});


runSummaryReportButton.addEventListener("click", () => {
  const summaryLines = [
    `Products in office inventory: ${products.length}`,
    `Approved setup products: ${setupData.products.length}`,
    `Technicians: ${technicians.length}`,
    `Warehouses: ${setupData.warehouses.length}`,
    `Trucks: ${setupData.trucks.length}`,
    `Current orders: ${technicianRequest.length}`,
  ];
  renderReport("Summary Report", summaryLines);
});

runInventoryReportButton.addEventListener("click", () => {
  const rows = products.map(
    (item) => `${item.name} | Qty: ${item.quantity} ${item.unit} | Min: ${item.minimum} | Status: ${getStatus(item).label}`,
  );
  renderReport("Inventory Report", rows);
});

runOrdersReportButton.addEventListener("click", () => {
  const rows = technicianRequest.map((item) => `${item.name} | Requested: ${item.requestQty} ${item.unit}`);
  renderReport("Orders Report", rows);
});

renderAll();
applyAuthState();

function applyAuthState() {
  const isSignedIn = Boolean(authSession?.role);
  authScreen.hidden = isSignedIn;
  logoutButton.hidden = !isSignedIn;
  sessionBadge.hidden = !isSignedIn;

  if (!isSignedIn) {
    showView("auth-screen");
    return;
  }

  sessionBadge.textContent = `${authSession.role.toUpperCase()}: ${authSession.email}`;

  for (const tile of document.querySelectorAll('[data-view-target]')) {
    tile.hidden = !isAllowedView(tile.dataset.viewTarget);
  }

  showView("home-screen");
}

function isAllowedView(viewId) {
  if (!authSession) return false;
  if (authSession.role === "admin") return true;
  return viewId !== "setup-view";
}

function showView(id) {
  authScreen.hidden = id !== "auth-screen";
  homeScreen.hidden = id !== "home-screen";
  countsView.hidden = id !== "counts-view";
  requestsView.hidden = id !== "requests-view";
  setupView.hidden = id !== "setup-view";
  dashboardView.hidden = id !== "dashboard-view";
  tasksView.hidden = id !== "tasks-view";
  serviceProductsView.hidden = id !== "service-products-view";
  scannerView.hidden = id !== "scanner-view";
}

function getValue(id) {
  return document.getElementById(id).value.trim();
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

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  localStorage.setItem(REQUEST_KEY, JSON.stringify(technicianRequest));
  localStorage.setItem(TECHNICIAN_KEY, JSON.stringify(technicians));
  localStorage.setItem(SETUP_KEY, JSON.stringify(setupData));
  renderAll();
}

function renderAll() {
  renderProducts();
  renderTransferSelectors();
  renderTechnicianInventory();
  renderTechnicianSubset();
  renderRequestList();
  renderSetup();
  renderDashboard();
  renderServiceSubsections();
}

function renderProducts() {
  inventoryBody.innerHTML = "";
  const view = lowStockToggle.checked ? products.filter((p) => p.quantity <= p.minimum) : products;

  for (const product of view) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = product.id;
    row.querySelector('[data-col="name"]').textContent = `${product.name} (${product.unit})`;
    row.querySelector('[data-col="category"]').textContent = product.category;
    row.querySelector('[data-col="quantity"]').textContent = product.quantity;
    row.querySelector('[data-col="minimum"]').textContent = product.minimum;
    row.querySelector('[data-col="expiration"]').textContent = formatDate(product.expiration);

    const status = getStatus(product);
    row.querySelector('[data-col="status"]').innerHTML = `<span class="status ${status.className}">${status.label}</span>`;

    inventoryBody.appendChild(row);
  }

  emptyState.hidden = view.length > 0;
  table.hidden = view.length === 0;
}

function renderTransferSelectors() {
  transferTechnician.innerHTML = '<option value="">Select technician</option>';
  for (const tech of technicians) {
    const option = document.createElement("option");
    option.value = tech.id;
    option.textContent = `${tech.name} (${tech.truckId})`;
    transferTechnician.appendChild(option);
  }

  transferProduct.innerHTML = '<option value="">Select product</option>';
  for (const product of products) {
    const option = document.createElement("option");
    option.value = product.id;
    option.textContent = `${product.name} - ${product.quantity} ${product.unit}`;
    transferProduct.appendChild(option);
  }
}

function renderTechnicianInventory() {
  technicianBody.innerHTML = "";

  for (const tech of technicians) {
    let totalUnits = 0;
    let distinctItems = 0;
    const detailParts = [];

    for (const [productId, qty] of Object.entries(tech.inventory)) {
      if (qty <= 0) continue;
      const product = products.find((item) => item.id === productId);
      if (!product) continue;

      totalUnits += qty;
      distinctItems += 1;
      detailParts.push(`${product.name}: ${qty} ${product.unit}`);
    }

    const row = document.createElement("tr");
    row.innerHTML = `<td>${tech.name}</td><td>${tech.email || "—"}</td><td>${tech.truckId}</td><td>${totalUnits}</td><td>${distinctItems}</td><td>${detailParts.length ? detailParts.join(" • ") : "No assigned inventory"}</td>`;
    technicianBody.appendChild(row);
  }

  technicianEmpty.hidden = technicians.length > 0;
  technicianTable.hidden = technicians.length === 0;
}

function renderTechnicianSubset() {
  ddBody.innerHTML = "";
  const subset = products.filter((product) => product.quantity <= product.minimum);

  for (const product of subset) {
    const row = ddRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.id = product.id;

    const suggested = Math.max(product.minimum * 2 - product.quantity, 1);
    row.querySelector('[data-col="name"]').textContent = `${product.name} (${product.unit})`;
    row.querySelector('[data-col="quantity"]').textContent = product.quantity;
    row.querySelector('[data-col="minimum"]').textContent = product.minimum;
    row.querySelector('[data-col="suggested"]').textContent = suggested;
    row.querySelector('[data-col="request-input"]').value = suggested;

    ddBody.appendChild(row);
  }

  ddEmptyState.hidden = subset.length > 0;
  ddTable.hidden = subset.length === 0;
}

function renderRequestList() {
  requestList.innerHTML = "";

  for (const item of technicianRequest) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.name}: ${item.requestQty} ${item.unit}</span><button type="button" class="danger" data-product-id="${item.productId}">Remove</button>`;
    requestList.appendChild(li);
  }

  requestEmpty.hidden = technicianRequest.length > 0;
  requestList.hidden = technicianRequest.length === 0;
  copyRequestButton.hidden = technicianRequest.length === 0;
}

function renderSetup() {
  companyDisplay.textContent = setupData.company
    ? `${setupData.company.name} | ${setupData.company.address} | ${setupData.company.phone}`
    : "Company profile not set.";

  renderEntityList(warehouseList, setupData.warehouses, (item) => `${item.name} — ${item.location}`);
  renderEntityList(truckList, setupData.trucks, (item) => `${item.truckId} — Plate: ${item.plate}`);
  renderEntityList(setupTechnicianList, setupData.technicians, (item) => `${item.name} — ${item.phone} — ${item.email || "no-email"}`);
  renderEntityList(supplierList, setupData.suppliers, (item) => `${item.name} — ${item.contact}`);
  renderProductEntityList(setupProductList, setupData.products);
}

function renderEntityList(container, items, formatter) {
  container.innerHTML = "";
  if (items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-li";
    li.textContent = "No records yet.";
    container.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = formatter(item);
    container.appendChild(li);
  }
}


function renderDashboard() {
  renderProductEntityList(dashboardApprovedProducts, setupData.products);

  const mergedTechs = [
    ...setupData.technicians.map((item) => `${item.name} (${item.email || "no-email"})`),
    ...technicians.map((item) => `${item.name} (${item.email || "no-email"})`),
  ];
  renderSimpleList(dashboardTechnicians, dedupe(mergedTechs));

  const locationNames = dedupe([
    ...setupData.warehouses.map((item) => `Warehouse: ${item.name}`),
    ...technicians.map((item) => `Truck: ${item.truckId}`),
  ]);
  renderSimpleList(dashboardLocations, locationNames);

  const locationProducts = [];
  for (const warehouse of setupData.warehouses) {
    for (const product of products) {
      if (product.quantity > 0) {
        locationProducts.push(`${warehouse.name}: ${product.name} (${product.quantity} ${product.unit})`);
      }
    }
  }
  for (const tech of technicians) {
    for (const [productId, qty] of Object.entries(tech.inventory)) {
      if (qty <= 0) continue;
      const product = products.find((item) => item.id === productId);
      if (!product) continue;
      locationProducts.push(`Truck ${tech.truckId}: ${product.name} (${qty} ${product.unit})`);
    }
  }
  renderSimpleList(dashboardProductsInLocation, locationProducts);

  renderSimpleList(
    dashboardCurrentOrders,
    technicianRequest.map((item) => `${item.name}: ${item.requestQty} ${item.unit}`),
  );

  renderSimpleList(
    dashboardTrucks,
    setupData.trucks.map((item) => `${item.truckId} — Plate: ${item.plate}`),
  );

  renderSimpleList(
    dashboardWarehouses,
    setupData.warehouses.map((item) => `${item.name} — ${item.location}`),
  );
}

function renderSimpleList(container, items) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
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

function dedupe(items) {
  return [...new Set(items)];
}


function renderServiceSubsections() {
  const generatedTasks = [];

  if (technicianRequest.length > 0) {
    generatedTasks.push(...technicianRequest.map((item) => `Order follow-up: ${item.name} (${item.requestQty} ${item.unit})`));
  }

  for (const product of products) {
    if (product.quantity <= product.minimum) {
      generatedTasks.push(`Restock alert: ${product.name} is low (${product.quantity}/${product.minimum})`);
    }
  }

  if (generatedTasks.length === 0) {
    generatedTasks.push("No active tasks. You're all caught up.");
  }

  renderSimpleList(tasksList, generatedTasks);

  if (setupData.products.length > 0) {
    renderProductEntityList(serviceProductsList, setupData.products);
  } else {
    const approvedProducts = products.map((item) => `${item.name} (${item.category})`);
    renderSimpleList(serviceProductsList, approvedProducts);
  }
}


function renderReport(title, lines) {
  if (!lines || lines.length === 0) {
    reportOutput.classList.add("empty-state");
    reportOutput.innerHTML = `<strong>${title}</strong><br/>No report data available.`;
    return;
  }

  reportOutput.classList.remove("empty-state");
  reportOutput.innerHTML = `<strong>${title}</strong><ul>${lines.map((line) => `<li>${line}</li>`).join("")}</ul>`;
}


function renderProductEntityList(container, items) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-li";
    li.textContent = "No records yet.";
    container.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "product-entity-item";
    const image = item.image ? `<img src="${item.image}" alt="${item.name}" class="product-thumb" />` : "";
    li.innerHTML = `${image}<span>${item.name} — SKU: ${item.sku} — Supplier: ${item.supplier}</span>`;
    container.appendChild(li);
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

function buildRequestSummary() {
  if (technicianRequest.length === 0) return "";
  const lines = technicianRequest.map((item) => `- ${item.name}: ${item.requestQty} ${item.unit}`);
  return `Technician DD subset request to main office:\n${lines.join("\n")}`;
}

function formatDate(dateValue) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString();
}

function getStatus(product) {
  const expirationDate = new Date(`${product.expiration}T23:59:59`);
  const now = new Date();

  if (expirationDate < now) return { label: "Expired", className: "expired" };
  if (product.quantity <= product.minimum) return { label: "Low Stock", className: "low" };
  return { label: "In Stock", className: "ok" };
}
