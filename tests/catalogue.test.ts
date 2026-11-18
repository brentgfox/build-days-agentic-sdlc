import {
  InMemoryProductCatalogue,
  ProductNotFoundError,
  products,
} from "../src/server/catalogue.js";

describe("product catalogue", () => {
  it("provides stable deterministic products", async () => {
    const catalogue = new InMemoryProductCatalogue();

    expect(await catalogue.list()).toEqual(products);
    expect(products.map((product) => product.id)).toEqual([
      "aurora-desk-lamp",
      "cloudrest-throw",
      "trailmark-bottle",
      "tideline-picnic-blanket",
      "nesting-prep-bowls",
      "emberline-kettle",
      "papertrail-notebook-set",
      "harbor-catchall-tray",
    ]);
  });

  it("filters by category and case-insensitive search", async () => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(catalogue.list({ q: "LAMP", category: "office" })).resolves.toEqual([
      expect.objectContaining({ id: "aurora-desk-lamp" }),
    ]);
    await expect(catalogue.list({ q: "", category: "kitchen" })).resolves.toHaveLength(2);
  });

  it("sorts filtered products by price without changing the default seed order", async () => {
    const catalogue = new InMemoryProductCatalogue();
    const originalOrder = products.map((product) => product.id);

    await expect(
      catalogue.list({ q: "", category: "office", sort: "price-asc" }),
    ).resolves.toEqual([
      expect.objectContaining({ id: "papertrail-notebook-set" }),
      expect.objectContaining({ id: "aurora-desk-lamp" }),
    ]);
    await expect(catalogue.list({ q: "", sort: "price-desc" })).resolves.toEqual(
      [...products].sort((left, right) => right.priceCents - left.priceCents),
    );
    expect(products.map((product) => product.id)).toEqual(originalOrder);
    await expect(catalogue.list()).resolves.toEqual(products);
  });

  it("preserves catalogue order for products with equal prices", async () => {
    const equalPriceProducts = products.slice(0, 3).map((product) => ({
      ...product,
      priceCents: 2500,
    }));
    const catalogue = new InMemoryProductCatalogue(equalPriceProducts);

    await expect(catalogue.list({ q: "", sort: "price-asc" })).resolves.toEqual(
      equalPriceProducts,
    );
    await expect(catalogue.list({ q: "", sort: "price-desc" })).resolves.toEqual(
      equalPriceProducts,
    );
  });

  it("returns product details and rejects missing products", async () => {
    const catalogue = new InMemoryProductCatalogue();

    await expect(catalogue.getById("trailmark-bottle")).resolves.toMatchObject({
      name: "Trailmark Bottle",
      priceCents: 3199,
    });
    await expect(catalogue.getById("missing")).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });
});
