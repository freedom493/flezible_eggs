const modal = document.getElementById("orderModal");
const smallQtyInput = document.getElementById("smallQuantity");
const normalQtyInput = document.getElementById("normalQuantity");
const totalEggsDisplay = document.getElementById("totalEggs");
const totalDisplay = document.getElementById("total");

const PRICE_SMALL = 150;
const PRICE_NORMAL = 250;
const WHATSAPP = "2348060856036";

function openModal() {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("name").focus();
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function updateTotal() {
  const smallQty = Math.max(0, parseInt(smallQtyInput.value || "0", 10));
  const normalQty = Math.max(0, parseInt(normalQtyInput.value || "0", 10));

  smallQtyInput.value = smallQty;
  normalQtyInput.value = normalQty;

  const totalEggs = smallQty + normalQty;
  const amount = (smallQty * PRICE_SMALL) + (normalQty * PRICE_NORMAL);

  if (totalEggsDisplay) {
    totalEggsDisplay.textContent = totalEggs + " egg(s)";
  }
  totalDisplay.textContent = "₦" + amount.toLocaleString("en-NG");
}

smallQtyInput.addEventListener("input", updateTotal);
normalQtyInput.addEventListener("input", updateTotal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

function incrementSmall() {
  smallQtyInput.value = parseInt(smallQtyInput.value || "0", 10) + 1;
  updateTotal();
}

function decrementSmall() {
  let val = parseInt(smallQtyInput.value || "0", 10);
  if (val > 0) smallQtyInput.value = val - 1;
  updateTotal();
}

function incrementNormal() {
  normalQtyInput.value = parseInt(normalQtyInput.value || "0", 10) + 1;
  updateTotal();
}

function decrementNormal() {
  let val = parseInt(normalQtyInput.value || "0", 10);
  if (val > 0) normalQtyInput.value = val - 1;
  updateTotal();
}

document.getElementById("orderForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const smallQty = parseInt(smallQtyInput.value || "0", 10);
  const normalQty = parseInt(normalQtyInput.value || "0", 10);
  const totalEggs = smallQty + normalQty;

  if (totalEggs === 0) {
    alert("Please select at least one egg (small or normal) to order.");
    return;
  }

  const delivery = document.getElementById("delivery").value.trim();
  const type = document.getElementById("type").value;
  const note = document.getElementById("note").value.trim();
  const amount = (smallQty * PRICE_SMALL) + (normalQty * PRICE_NORMAL);

  let message =
    "Hello Flezible Eggs! 🥚%0A%0A" +
    "*New Order*%0A" +
    "Name: " + encodeURIComponent(name) + "%0A" +
    "Phone: " + encodeURIComponent(phone) + "%0A" +
    "Egg type: " + encodeURIComponent(type) + "%0A";

  if (smallQty > 0) {
    message += "• Small Eggs (₦150): " + smallQty + "%0A";
  }
  if (normalQty > 0) {
    message += "• Normal Eggs (₦250): " + normalQty + "%0A";
  }

  message +=
    "Total Number of Eggs: " + totalEggs + "%0A" +
    "Total Amount: ₦" + amount.toLocaleString("en-NG") + "%0A" +
    "Delivery location: " + encodeURIComponent(delivery);

  if (note) {
    message += "%0AAdditional note: " + encodeURIComponent(note);
  }

  window.location.href = "https://wa.me/" + WHATSAPP + "?text=" + message;
});