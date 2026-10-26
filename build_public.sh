#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT"

mkdir -p public/assets/brand
cp index.html styles.css app.js products.json manus-routes.json public/
cp images/texas-food-mark.svg public/assets/brand/texas-food-mark.svg
cp images/texas-food-trading-logo.svg public/assets/brand/texas-food-trading-logo.svg

[ -f public/index.html ] || { echo "Missing public/index.html" >&2; exit 1; }
[ -f public/assets/hero/texas-food-hero.webp ] || { echo "Missing hero image" >&2; exit 1; }
[ -f public/assets/product-sheets/frozen-strawberries.pdf ] || { echo "Missing frozen strawberries PDF" >&2; exit 1; }
[ -f public/assets/product-sheets/frozen-potatoes.pdf ] || { echo "Missing frozen potatoes PDF" >&2; exit 1; }
[ -f public/assets/brand/texas-food-trading-logo.svg ] || { echo "Missing horizontal brand logo" >&2; exit 1; }

product_image_count="$(find public/assets/products -maxdepth 1 -type f -name '*.webp' | wc -l | tr -d '[:space:]')"
[ "$product_image_count" -eq 25 ] || {
  echo "Expected 25 product images in public/assets/products; found $product_image_count" >&2
  exit 1
}

[ -f public/assets/brand/texas-food-mark.svg ] || { echo "Missing brand logo" >&2; exit 1; }
product_record_count="$(grep -c '"name":' public/products.json)"
[ "$product_record_count" -eq 25 ] || {
  echo "Expected 25 product records; found $product_record_count" >&2
  exit 1
}
image_paths="$(sed -n 's/.*"image": "\(assets\/products\/[^\"]*\.webp\)".*/\1/p' public/products.json)"
image_reference_count="$(printf '%s\n' "$image_paths" | sed '/^$/d' | wc -l | tr -d '[:space:]')"
[ "$image_reference_count" -eq 25 ] || {
  echo "Expected 25 local product image references; found $image_reference_count" >&2
  exit 1
}
for image_path in $image_paths; do
  [ -f "public/$image_path" ] || { echo "Missing product image: public/$image_path" >&2; exit 1; }
done

if grep -n '/manus-storage/' public/index.html public/styles.css public/app.js public/products.json; then
  echo "Manus Storage references remain in the public website files" >&2
  exit 1
fi

printf 'Static export ready: %s/public (25 product images, hero, 2 product PDFs)\n' "$ROOT"
