document.addEventListener("DOMContentLoaded", () => {
  const search = document.querySelector("#resourceSearch");
  const category = document.querySelector("#categoryFilter");
  const reset = document.querySelector("#resetFilters");
  const items = document.querySelectorAll(".resource-item");
  const categoryCards = document.querySelectorAll("[data-filter-card]");

  function normalize(text) {
    return (text || "").toLowerCase().trim();
  }

  function filterResources() {
    if (!items.length) return;
    const q = normalize(search?.value);
    const selected = normalize(category?.value);

    items.forEach(item => {
      const text = normalize(item.innerText);
      const cat = normalize(item.dataset.category);
      const matchesSearch = !q || text.includes(q);
      const matchesCategory = !selected || cat === selected;
      item.style.display = matchesSearch && matchesCategory ? "" : "none";
    });
  }

  if (search) search.addEventListener("input", filterResources);
  if (category) category.addEventListener("change", filterResources);
  if (reset) reset.addEventListener("click", () => {
    if (search) search.value = "";
    if (category) category.value = "";
    filterResources();
  });

  categoryCards.forEach(card => {
    card.addEventListener("click", () => {
      if (category) category.value = card.dataset.filterCard;
      filterResources();
      document.querySelector("#resourcesGrid")?.scrollIntoView({ behavior: "smooth" });
    });
  });
});
