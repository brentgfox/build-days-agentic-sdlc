import { expect, test, type Page } from "@playwright/test";

const productCard = (page: Page, name: string) =>
  page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });

test.describe("KosKo catalogue", () => {
  test("loads the deterministic product catalogue", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("KosKo");
    await expect(page.getByRole("link", { name: "KosKo home" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "KosKo goods" }),
    ).toBeVisible();
    await expect(page.getByText("8 products", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Aurora Desk Lamp" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Harbor Catchall Tray" }),
    ).toBeVisible();
  });

  test("searches the catalogue by product name", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("searchbox", { name: "Search products" }).fill("lamp");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page.getByText("1 product", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Aurora Desk Lamp" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Trailmark Bottle" }),
    ).toHaveCount(0);
  });

  test("filters the catalogue by category", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("combobox", { name: "Category" }).selectOption("kitchen");

    await expect(page.getByText("2 products", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nesting Prep Bowls" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Emberline Kettle" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Aurora Desk Lamp" }),
    ).toHaveCount(0);
  });

  test("sorts by price and composes sorting with catalogue filters", async ({
    page,
  }) => {
    await page.goto("/");

    const productNames = page.locator(".product-card h3");
    await expect(productNames.first()).toHaveText("Aurora Desk Lamp");

    await page
      .getByRole("combobox", { name: "Sort products" })
      .selectOption("price-asc");
    await expect(productNames.first()).toHaveText("Harbor Catchall Tray");
    await expect(productNames.last()).toHaveText("Emberline Kettle");

    await page.getByRole("combobox", { name: "Category" }).selectOption("office");
    await expect(productNames).toHaveText([
      "Papertrail Notebook Set",
      "Aurora Desk Lamp",
    ]);

    await page
      .getByRole("combobox", { name: "Sort products" })
      .selectOption("price-desc");
    await expect(productNames).toHaveText([
      "Aurora Desk Lamp",
      "Papertrail Notebook Set",
    ]);

    await page.getByRole("searchbox", { name: "Search products" }).fill("lamp");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(productNames).toHaveText(["Aurora Desk Lamp"]);
  });

  test("shows and clears the no-results state", async ({ page }) => {
    await page.goto("/");

    await page
      .getByRole("combobox", { name: "Sort products" })
      .selectOption("price-desc");
    await page
      .getByRole("searchbox", { name: "Search products" })
      .fill("definitely-not-a-product");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "No products found" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByText("8 products", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Sort products" }),
    ).toHaveValue("");
    await expect(page.locator(".product-card h3").first()).toHaveText(
      "Aurora Desk Lamp",
    );
  });

  test("updates cart quantities and totals", async ({ page }) => {
    await page.goto("/");

    await productCard(page, "Aurora Desk Lamp")
      .getByRole("button", { name: "Add to cart" })
      .click();
    await page
      .getByRole("spinbutton", { name: "Quantity for Aurora Desk Lamp" })
      .fill("2");
    await page
      .getByRole("combobox", { name: "Sort products" })
      .selectOption("price-asc");

    await expect(page.getByText("2 items", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Subtotal").locator(".."),
    ).toContainText("$85.98");
  });

  test("completes a simulated checkout", async ({ page }) => {
    await page.goto("/");

    await productCard(page, "Trailmark Bottle")
      .getByRole("button", { name: "Add to cart" })
      .click();
    await page.getByRole("textbox", { name: "Full name" }).fill("Taylor Shopper");
    await page.getByRole("textbox", { name: "Email" }).fill("taylor@example.com");
    await page
      .getByRole("textbox", { name: "Delivery address" })
      .fill("123 Demo Street");
    await page.getByRole("button", { name: "Place simulated order" }).click();

    await expect(
      page.getByRole("heading", { name: "Order confirmed" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Thanks, Taylor Shopper! Your simulated KosKo order is confirmed.",
      ),
    ).toBeVisible();
    await expect(page.getByText("Your cart is empty.")).toBeVisible();
  });

  test("retries after a catalogue API failure", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/products**", async (route) => {
      requestCount += 1;
      if (requestCount === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "CATALOGUE_UNAVAILABLE",
              message: "The product catalogue is temporarily unavailable.",
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "We could not open the catalogue" }),
    ).toBeVisible();
    await expect(
      page.getByText("The product catalogue is temporarily unavailable."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("8 products", { exact: true })).toBeVisible();
    expect(requestCount).toBe(2);
  });
});
