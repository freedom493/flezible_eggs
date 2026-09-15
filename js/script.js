const modal = document.getElementById("orderModal");
const quantity = document.getElementById("quantity");
const total = document.getElementById("total");
const PRICE = 250;
const WHATSAPP = "2348060856036";

function openModal() {
  modal.classList.add("open");
  document.getElementById("name").focus();
}

function closeModal() {
  modal.classList.remove("open");
}

function updateTotal() {
  const qty = Math.max(1, parseInt(quantity.value || "1", 10));
  quantity.value = qty;
  total.textContent = "₦" + (qty * PRICE).toLocaleString("en-NG");
}

quantity.addEventListener("input", updateTotal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

document.getElementById("orderForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const qty = parseInt(quantity.value, 10);
  const delivery = document.getElementById("delivery").value.trim();
  const type = document.getElementById("type").value;
  const note = document.getElementById("note").value.trim();
  const amount = qty * PRICE;

  let message =
    "Hello Flezible Eggs! 🥚%0A%0A" +
    "*New Order*%0A" +
    "Name: " + encodeURIComponent(name) + "%0A" +
    "Phone: " + encodeURIComponent(phone) + "%0A" +
    "Egg type: " + encodeURIComponent(type) + "%0A" +
    "Quantity: " + qty + "%0A" +
    "Price per egg: ₦250%0A" +
    "Total: ₦" + amount.toLocaleString("en-NG") + "%0A" +
    "Delivery location: " + encodeURIComponent(delivery);

  if (note) {
    message += "%0AAdditional note: " + encodeURIComponent(note);
  }

  window.location.href = "https://wa.me/" + WHATSAPP + "?text=" + message;
});