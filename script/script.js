// ---------- Utilities & State ----------
const app = document.body;
const LS_KEY = "shoplistbill.items.v1";
const THEME_KEY = "shoplistbill.theme";


const state = {
  items: [],
  editingIndex: null,
};

const unitToBase = (qty, unit) => {
  // base units: kg for weight, l for volume, unit for count
  if (!qty || qty <= 0) return 0;
  switch (unit) {
    case "kg":
      return qty; // kg base
    case "g":
      return qty / 1000; // g -> kg
    case "l":
      return qty; // l base
    case "ml":
      return qty / 1000; // ml -> l
    case "unit":
      return qty; // count base
    default:
      return 0;
  }
};

const areSameDimension = (u1, u2) => {
  const dim = (u) =>
    ({ kg: "mass", g: "mass", l: "vol", ml: "vol", unit: "count" }[u] || null);
  return dim(u1) === dim(u2);
};

const formatQty = (qtyMain, unitMain, qtySub, unitSub) => {
  let parts = [];
  if (qtyMain && qtyMain > 0)
    parts.push(
      `${stripTrailingZeros(qtyMain)} ${labelUnit(unitMain, qtyMain)}`
    );
  if (qtySub && qtySub > 0 && unitSub !== "none")
    parts.push(`${stripTrailingZeros(qtySub)} ${labelUnit(unitSub, qtySub)}`);
  return parts.join(" + ");
};

const labelUnit = (u, q = 1) => ({
  kg: q == 1 ? "Kg" : "Kg",
  g: "Gram",
  l: q == 1 ? "Liter" : "Liter",
  ml: "MilliLiter",
  unit: q == 1 ? "Unit" : "Units",
}[u] || "");

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const stripTrailingZeros = (n) => {
  const s = Number(n).toFixed(3); // up to 3 decimals
  return s.replace(/\.000$/, "").replace(/(\.\d*?)0+$/, "$1");
};

// ---------- DOM Helpers ----------
const els = {
  itemName: document.getElementById("itemName"),
  qtyMain: document.getElementById("qtyMain"),
  unitMain: document.getElementById("unitMain"),
  qtySub: document.getElementById("qtySub"),
  unitSub: document.getElementById("unitSub"),
  priceAmount: document.getElementById("priceAmount"),
  priceBasisQty: document.getElementById("priceBasisQty"),
  priceBasisUnit: document.getElementById("priceBasisUnit"),
  itemsBody: document.getElementById("itemsBody"),
  billSummary: document.getElementById("billSummary"),
  billDate: document.getElementById("billDate"),
  resetAll: document.getElementById("resetAll"),
  printBill: document.getElementById("printBill"),
  themeToggle: document.getElementById("themeToggle"),
  qrImg: document.getElementById("qrImg"),
};

// ---------- Load / Save ----------
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.items));
}
function load() {
  try {
    state.items = JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    state.items = [];
  }
}

function saveTheme() {
  localStorage.setItem(THEME_KEY, app.getAttribute("data-theme"));
}
function loadTheme() {
  const t = localStorage.getItem(THEME_KEY);
  if (t) app.setAttribute("data-theme", t);
  els.themeToggle.innerHTML =
    app.getAttribute("data-theme") === "light"
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
}

// ---------- Add / Edit ----------
function handleSubmit(e) {
  e.preventDefault();
  const name = (els.itemName.value || "").trim();
  const qtyMain = parseFloat(els.qtyMain.value) || 0;
  const untMain = els.unitMain.value;
  const qtySub = parseFloat(els.qtySub.value) || 0;
  const unitSub = els.unitSub.value;
  const price = parseFloat(els.priceAmount.value) || 0;
  const pbQty = parseFloat(els.priceBasisQty.value) || 1;
  const pbUnit = els.priceBasisUnit.value;

  if (!name) {
    alert("Enter item name");
    return;
  }
  if (price <= 0) {
    alert("Enter a valid price");
    return;
  }
  if (qtyMain <= 0 && !(qtySub > 0)) {
    alert("Enter quantity");
    return;
  }
  if (!areSameDimension(untMain, pbUnit)) {
    alert("Price basis unit must match item unit type");
    return;
  }

  // Convert quantities to base of the chosen dimension
  const mainBase = unitToBase(qtyMain, untMain);
  const subBase = unitSub === "none" ? 0 : unitToBase(qtySub, unitSub);
  const totalBaseQty = mainBase + subBase; // base: kg/l/unit

  const basisBaseQty = unitToBase(pbQty, pbUnit);
  const pricePerBase = price / (basisBaseQty || 1); // ₹ per kg/l/unit
  const total = pricePerBase * totalBaseQty;

  const item = {
    name,
    qtyMain: qtyMain,
    unitMain: untMain,
    qtySub: qtySub,
    unitSub: unitSub,
    priceAmount: price,
    priceBasisQty: pbQty,
    priceBasisUnit: pbUnit,
    total: Number(total.toFixed(2)),
  };



  if (state.editingIndex !== null) {
    state.items[state.editingIndex] = item;
    state.editingIndex = null;
  } else {
    state.items.push(item);
  }
  save();
  render();
  e.target.reset();
  els.unitMain.value = "unit";
  els.priceBasisQty.value = 1;
  els.priceBasisUnit.value = "unit";
  els.unitSub.value = "none";
}

// ---------- Render ----------
function render() {
  els.itemsBody.innerHTML = "";
  let sum = 0;
  state.items.forEach((it, idx) => {
    sum += Number(it.total || 0);
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td>${formatQty(it.qtyMain, it.unitMain, it.qtySub, it.unitSub)}</td>
          <td>${currency(it.priceAmount)} / ${stripTrailingZeros(it.priceBasisQty)} ${labelUnit(it.priceBasisUnit, it.priceBasisQty)}</td>
          <td>${currency(it.total)}</td>
          <td>
            <div class="actions">
              <button class="icon-btn" title="Edit" aria-label="Edit" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn" title="Delete" aria-label="Delete" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>`;
    els.itemsBody.appendChild(tr);
  });

  els.billSummary.textContent = `Total: ${currency(sum)}`;
  els.billDate.textContent = new Date().toLocaleString();
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m])
  );
}

// ---------- Actions ----------
document.getElementById("itemForm").addEventListener("submit", handleSubmit); 

els.itemsBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const idx = Number(btn.dataset.idx);
  const act = btn.dataset.act;
  if (act === "del") {
    if (confirm("Delete this item?")) {
      state.items.splice(idx, 1);
      save();
      render();
    }
  }
  if (act === "edit") {
    const it = state.items[idx];
    els.itemName.value = it.name;
    els.qtyMain.value = it.qtyMain;
    els.unitMain.value = it.unitMain;
    els.qtySub.value = it.qtySub;
    els.unitSub.value = it.unitSub;
    els.priceAmount.value = it.priceAmount;
    els.priceBasisQty.value = it.priceBasisQty;
    els.priceBasisUnit.value = it.priceBasisUnit;
    state.editingIndex = idx;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Reset all
els.resetAll.addEventListener("click", () => {
  if (confirm("Clear the entire list?")) {
    state.items = [];
    save();
    render();
  }
});

// Print clean bill
els.printBill.addEventListener("click", () => {
  window.print();
});

// Theme toggle
els.themeToggle.addEventListener("click", () => {
  const next = app.getAttribute("data-theme") === "light" ? "dark" : "light";
  app.setAttribute("data-theme", next);
  els.themeToggle.innerHTML =
    next === "light"
      ? '<i class="fa-solid fa-moon"></i>'
      : '<i class="fa-solid fa-sun"></i>';
  saveTheme();
});

// QR to current page (Google Chart API)
function setQr() {
  const url = location.href;
  const src = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(
    url
  )}`;
  els.qrImg.src = src;
}

// On load
function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadTheme();
  load();
  render();
  setQr();
}
init();

