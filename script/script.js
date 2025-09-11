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

const formatQty = (qtyMain, unitMain) => {
  let parts = [];
  if (qtyMain && qtyMain > 0)
    parts.push(
      `${stripTrailingZeros(qtyMain)} ${labelUnit(unitMain, qtyMain)}`
    );
  return parts;
};

const labelUnit = (u, q = 1) => ({
  kg: q == 1 ? "Kg" : "Kg",
  g: "Gram",
  l: q == 1 ? "Liter" : "Liter",
  ml: "ML",
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
  priceAmount: document.getElementById("priceAmount"),
  priceBasisQty: document.getElementById("priceBasisQty"),
  priceBasisUnit: document.getElementById("priceBasisUnit"),
  itemsBody: document.getElementById("itemsBody"),
  clearBtn : document.getElementById("clearBtn"),
  billSummary: document.getElementById("billSummary"),
  billDate: document.getElementById("billDate"),
  resetAll: document.getElementById("resetAll"),
  clearData : document.getElementById("clearData"),
  whatappBtn : document.getElementById("whatappBtn"),
  printBill: document.getElementById("printBill"),
  themeToggle: document.getElementById("themeToggle"),
  hamburgerBtn : document.getElementById("hamburgerBtn"),
  headerActions : document.getElementById("headerActions"),
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
  console.log(e);
  e.preventDefault();
  const name = (els.itemName.value || "").trim();
  const qtyMain = parseFloat(els.qtyMain.value) || 0;
  const untMain = els.unitMain.value;
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
  if (qtyMain <= 0 || pbQty <= 0) {
    alert("Enter quantity");
    return;
  }
  if (!areSameDimension(untMain, pbUnit)) {
    alert("Price basis unit must match item unit type");
    return;
  }

  // Convert quantities to base of the chosen dimension
  const mainBase = unitToBase(qtyMain, untMain);

  const basisBaseQty = unitToBase(pbQty, pbUnit);
  const pricePerBase = price / (basisBaseQty || 1); // ₹ per kg/l/unit
  const total = pricePerBase * mainBase;

  const item = {
    name,
    qtyMain: qtyMain,
    unitMain: untMain,
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
  els.itemName.focus();
}

// function clear to clear input field
function clearInput(){
  const itemForm = document.getElementById("itemForm");

  itemForm.reset();
  els.unitMain.value = "unit";
  els.priceBasisQty.value = 1;
  els.priceBasisUnit.value = "unit";
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
          <td>${formatQty(it.qtyMain, it.unitMain)}</td>
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
    els.priceAmount.value = it.priceAmount;
    els.priceBasisQty.value = it.priceBasisQty;
    els.priceBasisUnit.value = it.priceBasisUnit;
    state.editingIndex = idx;
    window.scrollTo({ top: 0, behavior: "smooth" });

    const tbodyBtn = els.itemsBody.querySelectorAll(".icon-btn");
    tbodyBtn.forEach(tbtn => {
      if(tbtn !== btn)
      tbtn.disabled = true;
    });
  }
});

// Reset all / clear all data
function resetAllData() {
  if (confirm("Clear the entire list?")) {
    state.items = [];
    save();
    render();
  }
}


els.clearBtn.addEventListener("click", clearInput); // clear input fild
els.resetAll.addEventListener("click", resetAllData); // Reset all data
els.clearData.addEventListener("click", resetAllData); // Clear all data

 // send bill via whatsapp
els.whatappBtn.addEventListener("click", () => {
  const mobileInput = document.getElementById("mobile-number");
  const mobile = mobileInput.value.trim();

  if(!/^\d{10}$/.test(mobile)){
    alert("Enter valid mobile no.!");
    return;
  }

  const fullNumber = `91${mobile}`;

  const now = new Date();
  const date = now.toLocaleDateString("en-GB"); // DD/MM/YYYY
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true});

  const appUrl = `https://amolkamble4161.github.io/shoplistbill/`;
  
  let message = "```" // start monospace block for whatsApp
  message += `ShopListBill\nDate: ${date}\nTime: ${time}\n\n`;
  message += `No   Item        Qty    Price\n`;

  let sum = 0;

  state.items.forEach((item, idx) => {
    sum += Number(item.total);
    const no = String(idx + 1).padStart(2, "0");
    const name = item.name.slice(0, 10).padEnd(10, " ");
    const qty = `${item.qtyMain}`.padStart(4, " ");
    const unt = `${item.unitMain}`.slice(0, 2).padEnd(2, " ");
    const price = `${currency(item.total)}`.padStart(8, " ");
    message += `${no} ${name} ${qty} ${unt} ${price}\n`;
  });

  message += `\nTotal: ${currency(sum)}\n`;
  message += "```";
  message += `\nVisit the app: ${appUrl}\n`;

  const url = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
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

// Mobile view hamburger 
els.hamburgerBtn.addEventListener("click", () => {
  els.headerActions.classList.toggle("show");
});

// Toggle examples section
document.getElementById("examplesSection").addEventListener("click", () => {
  const content = document.getElementById("examplesContent");
  const icon = document.getElementById("toggleIcon");
  
  content.classList.toggle("show");
  
  if (content.classList.contains("show")) {
    icon.classList.remove("fa-chevron-down");
    icon.classList.add("fa-chevron-up");
  } else {
    icon.classList.remove("fa-chevron-up");
    icon.classList.add("fa-chevron-down");
  }
});


// On load
function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  loadTheme();
  load();
  render();
}
init();