import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-end checks of the MVP flow against the running app with mock auth,
 * mock AI and synthetic data. The server keeps state in memory, so these
 * tests run serially and each one uses its own new knowledge statement.
 */

async function signInAs(page: Page, profileId: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.click(`button[value="${profileId}"]`);
  await page.waitForURL("**/");
}

test.describe.configure({ mode: "serial" });

test("capture → clarification → draft → review → library → Ask DNI", async ({ page }) => {
  const statement = `Jika Mesin Uji-${Date.now()} macet, ganti bushing.`;

  // TEST 1 + 12: a contributor starts with one sentence, no long form.
  await signInAs(page, "u-tech");
  await page.fill("#statement", statement);
  await page.getByText("Jenis dan kerahasiaan").click();
  await page.selectOption('select[name="classification"]', "general_internal");
  await page.selectOption('select[name="category"]', "maintenance");
  await page.getByRole("button", { name: "Mulai" }).click();
  await page.waitForURL(/\/capture\/C-\d+/);
  const captureUrl = page.url();

  // TEST 2: DNI asks one relevant question and admits what it does not know.
  await expect(page.getByText(/Saya tidak tahu bushing jenis apa/)).toBeVisible();

  // TEST 3: answering keeps the original statement in the draft.
  await page.fill("#answer", "Bushing perunggu di poros utama, nomor part contoh BX-12.");
  await page.getByRole("button", { name: "Kirim" }).click();
  await expect(page.getByText(/Gejala atau kondisi apa/)).toBeVisible();
  const draft = page.getByRole("complementary", { name: "Draf terstruktur" });
  await expect(draft.locator("dd").getByText(statement)).toBeVisible();
  await expect(draft.getByText("Bushing perunggu di poros utama, nomor part contoh BX-12.")).toBeVisible();

  // Contributor can stop the questions at any time.
  await page.getByRole("button", { name: "Cukup, buat ringkasan" }).click();
  await expect(page.getByText("Siap dikirim untuk review?")).toBeVisible();
  await page.getByRole("button", { name: "Kirim untuk review" }).click();
  await expect(page.getByText("Terkirim untuk review")).toBeVisible();
  const itemLink = page.getByRole("link", { name: /Lihat K-\d+/ });
  const itemId = ((await itemLink.textContent()) ?? "").match(/K-\d+/)?.[0];
  expect(itemId).toBeTruthy();

  // The contributor cannot review their own item.
  await page.goto(`/reviews/${itemId}`);
  await expect(page.getByText("Anda tidak bisa mereview kontribusi sendiri.")).toBeVisible();

  // TEST 4 + 5: reviewer sees original source and structured draft, then verifies.
  await signInAs(page, "u-reviewer");
  await page.goto("/reviews");
  await page.getByRole("link", { name: new RegExp(statement.slice(0, 20)) }).click();
  await expect(page.getByRole("heading", { name: "Sumber asli" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Isi terstruktur" })).toBeVisible();
  await page.fill('textarea[name="note"]', "Diverifikasi untuk uji e2e.");
  await page.getByRole("button", { name: "Verifikasi" }).click();
  await expect(page.getByText("Status diperbarui.")).toBeVisible();

  // TEST 6: a permitted user retrieves it with sources.
  await signInAs(page, "u-mt-head");
  await page.goto(`/library/${itemId}`);
  await expect(page.getByText("Terverifikasi").first()).toBeVisible();
  await page.goto(`/ask?q=${encodeURIComponent(statement)}`);
  await expect(page.getByRole("complementary").getByText(itemId!)).toBeVisible();

  // The original contributor can resume and view the finished session.
  await signInAs(page, "u-tech");
  await page.goto(captureUrl);
  await expect(page.getByText("Terkirim untuk review")).toBeVisible();
});

test("TEST 7: restricted knowledge is blocked via UI, search, assistant, and direct id", async ({ page }) => {
  await signInAs(page, "u-tech");

  // Navigation hides modules the user has no right to.
  await expect(page.getByRole("link", { name: "Review", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Administrasi", exact: true })).toHaveCount(0);

  // Direct record identifier: same 404 as a record that does not exist.
  const restricted = await page.goto("/library/K-0004");
  expect(restricted?.status()).toBe(404);
  await expect(page.getByText("Tidak ditemukan atau Anda tidak memiliki akses.")).toBeVisible();
  const missing = await page.goto("/library/K-9999");
  expect(missing?.status()).toBe(404);

  // Search.
  await page.goto("/library?q=diskon");
  await expect(page.getByText("K-0004")).toHaveCount(0);

  // Assistant.
  await page.goto(`/ask?q=${encodeURIComponent("Berapa batas diskon harga dan siapa yang menyetujui?")}`);
  await expect(page.getByText("K-0004")).toHaveCount(0);
  await expect(page.getByText("K-0003")).toHaveCount(0);

  // Restricted module by URL.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
});

test("TEST 9: an unsupported question does not invent policy", async ({ page }) => {
  await signInAs(page, "u-tech");
  await page.goto(`/ask?q=${encodeURIComponent("Berapa anggaran pelatihan tahun depan?")}`);
  await expect(page.getByText("Bukti tidak cukup")).toBeVisible();
  await expect(page.getByText(/tidak akan menebak kebijakan/)).toBeVisible();
});

test("TEST 8: conflicting knowledge is flagged", async ({ page }) => {
  await signInAs(page, "u-mt-head");
  await page.goto("/library/K-0001");
  await expect(page.getByRole("alert").getByText("Kemungkinan konflik")).toBeVisible();
  await expect(page.getByRole("alert").getByText(/K-0007/)).toBeVisible();
});

test("Evaluation Center records actual results", async ({ page }) => {
  await signInAs(page, "u-reviewer");
  await page.goto("/evaluation");
  await page.getByRole("button", { name: "Jalankan semua" }).click();
  await expect(page.getByText(/7 dari 7 kasus lulus/)).toBeVisible();
});

test("TEST 11 @mobile: usable on a phone", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile project only");
  await signInAs(page, "u-tech");
  await expect(page.getByRole("heading", { name: /Pengetahuan apa yang ingin/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "Lainnya" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Perpustakaan" }).click();
  await expect(page.getByRole("heading", { name: "Perpustakaan pengetahuan" })).toBeVisible();
});
