#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$ROOT"

mkdir -p public/assets/brand
rm -f public/assets/hero/texas-food-hero-03.webp dist/assets/hero/texas-food-hero-03.webp
cp index.html styles.css app.js products.json manus-routes.json public/
cp images/texas-food-mark.svg public/assets/brand/texas-food-mark.svg
cp images/texas-food-trading-logo.svg public/assets/brand/texas-food-trading-logo.svg

[ -f public/index.html ] || { echo "Missing public/index.html" >&2; exit 1; }
hero_images='texas-food-hero.webp texas-food-hero-02.webp texas-food-hero-04.webp'
for hero_image in $hero_images; do
  [ -f "public/assets/hero/$hero_image" ] || { echo "Missing hero image: public/assets/hero/$hero_image" >&2; exit 1; }
  grep -F "assets/hero/$hero_image" public/index.html >/dev/null || {
    echo "Hero image is not referenced by public/index.html: $hero_image" >&2
    exit 1
  }
done
hero_image_count="$(find public/assets/hero -maxdepth 1 -type f -name 'texas-food-hero*.webp' | wc -l | tr -d '[:space:]')"
[ "$hero_image_count" -eq 3 ] || {
  echo "Expected 3 hero photos in public/assets/hero; found $hero_image_count" >&2
  exit 1
}
grep -F 'src="assets/brand/texas-food-trading-logo.svg"' public/index.html >/dev/null || {
  echo "Missing local Texas Food Trading logo slide" >&2
  exit 1
}
carousel_slide_count="$(grep -c 'aria-roledescription="slide"' public/index.html)"
[ "$carousel_slide_count" -eq 4 ] || {
  echo "Expected 4 carousel slides; found $carousel_slide_count" >&2
  exit 1
}
[ ! -f public/assets/hero/texas-food-hero-03.webp ] || {
  echo "Obsolete green-coffee hero image remains in public/assets/hero" >&2
  exit 1
}
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
[ "$product_record_count" -eq 23 ] || {
  echo "Expected 23 product records; found $product_record_count" >&2
  exit 1
}
image_paths="$(sed -n 's/.*"image": "\(assets\/products\/[^\"]*\.webp\)".*/\1/p' public/products.json)"
image_reference_count="$(printf '%s\n' "$image_paths" | sed '/^$/d' | wc -l | tr -d '[:space:]')"
[ "$image_reference_count" -eq 23 ] || {
  echo "Expected 23 local product image references; found $image_reference_count" >&2
  exit 1
}
for image_path in $image_paths; do
  [ -f "public/$image_path" ] || { echo "Missing product image: public/$image_path" >&2; exit 1; }
done

mkdir -p dist
cp -a public/. dist/
[ -f dist/index.html ] || { echo "Missing dist/index.html after mirroring public" >&2; exit 1; }
[ -f dist/assets/hero/texas-food-hero-04.webp ] || { echo "Missing final hero photo in dist" >&2; exit 1; }
[ -f dist/assets/brand/texas-food-trading-logo.svg ] || { echo "Missing carousel logo in dist" >&2; exit 1; }
[ ! -f dist/assets/hero/texas-food-hero-03.webp ] || { echo "Obsolete green-coffee hero image remains in dist" >&2; exit 1; }

if grep -n '/manus-storage/' public/index.html public/styles.css public/app.js public/products.json; then
  echo "Manus Storage references remain in the public website files" >&2
  exit 1
fi

printf 'Static export ready: %s/public (25 product images, 3 hero photos, brand-logo slide, 2 product PDFs)\n' "$ROOT"
