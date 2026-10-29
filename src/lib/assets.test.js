import { test } from "node:test";
import assert from "node:assert/strict";
import { publicAsset, normalizeAssetPaths } from "./assets.js";

test("assets work at the domain root and under the public Pages prefix", () => {
  assert.equal(
    publicAsset("/assets/products/panel.jpg", "/"),
    "/assets/products/panel.jpg",
  );
  assert.equal(
    publicAsset("/assets/products/panel.jpg", "/gemini-vercel-demo/"),
    "/gemini-vercel-demo/assets/products/panel.jpg",
  );
  assert.equal(
    publicAsset("/gemini-vercel-demo/assets/products/panel.jpg", "/"),
    "/assets/products/panel.jpg",
  );
});
test("restored nested product/quote images migrate without altering external or uploaded photos", () => {
  const source = {
    products: [{ image: "/assets/products/1.jpg" }],
    quotes: [{ rows: [{ image: "/assets/products/2.jpg" }] }],
    photo: "data:image/jpeg;base64,AAA",
    external: "https://example.com/photo.png",
    notes: "Ảnh cần kiểm tra",
  };
  const next = normalizeAssetPaths(source, "/gemini-vercel-demo/");
  assert.equal(
    next.products[0].image,
    "/gemini-vercel-demo/assets/products/1.jpg",
  );
  assert.equal(
    next.quotes[0].rows[0].image,
    "/gemini-vercel-demo/assets/products/2.jpg",
  );
  assert.equal(next.photo, source.photo);
  assert.equal(next.external, source.external);
  assert.equal(next.notes, source.notes);
  assert.equal(source.products[0].image, "/assets/products/1.jpg");
});
