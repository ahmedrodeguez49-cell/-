# تجهيز الموقع للنشر على مضيف ملفات ثابتة

مجلدا `public/` و`dist/` يحتويان على نسختين من الحزمة الثابتة الجاهزة للنشر، بما فيها صفحة الموقع وملفات التنسيق والبرمجة وبيانات المنتجات والمسارات، إلى جانب الصور وملفي PDF. يشغّل `build_public.sh` التحقق من `public/` وينسخ الحزمة إلى `dist/`.

قبل الرفع من مجلد المشروع شغّل:

```sh
sh build_public.sh
```

بعدها ارفع **محتويات** `public/` أو `dist/` إلى جذر الموقع `Document Root` على المضيف، أو اختر المجلد المناسب بوصفه `Root Directory` أو `Publish Directory` إذا كانت لوحة المضيف تسمح بذلك. لا ترفع ملفات HTML وحدها؛ يجب أن يصاحبها مجلد `assets/` كاملًا.

الأصول محلية داخل الحزمة:

- ثلاث صور لشريط الغلاف داخل `public/assets/hero/`: `texas-food-hero.webp` و`texas-food-hero-02.webp` و`texas-food-hero-04.webp`؛ وتعرض الشريحة الثالثة شعار Texas Food Trading من `public/assets/brand/texas-food-trading-logo.svg`
- صور المنتجات الـ25: `public/assets/products/`
- ورقة الفراولة المجمدة: `public/assets/product-sheets/frozen-strawberries.pdf`
- ورقة البطاطس المجمدة: `public/assets/product-sheets/frozen-potatoes.pdf`
- ملفات الشعار: `public/assets/brand/texas-food-mark.svg` و`public/assets/brand/texas-food-trading-logo.svg`

مراجع HTML وبيانات المنتجات تستخدم مسارات نسبية مثل `assets/products/...`؛ لذلك لا تعتمد النسخة المنشورة على مسارات `/manus-storage/`. بعد النشر، تحقق من فتح صور الغلاف، صورة منتج، وملف PDF مباشرةً من النطاق الجديد.

## تفعيل استقبال الطلبات

النموذج يرسل البيانات عبر `POST` إلى FormSubmit لتصل إلى `info@txfoodtrade.com`. عند أول إرسال من الموقع، يرسل FormSubmit رسالة تفعيل لمرة واحدة إلى هذا الصندوق؛ يجب على مالك البريد فتحها وتأكيد العنوان قبل الاعتماد على استقبال الطلبات. لم يتم إرسال طلب تجريبي من طرفنا. أبقِ reCAPTCHA الافتراضي مفعّلًا، وتحقق من مجلد الرسائل غير المرغوب فيها إذا لم تظهر رسالة التفعيل.

تذكر وثائق FormSubmit أن بيانات الإرسال تُحتفظ بها لمدة 30 يومًا. راجع [التوثيق الرسمي](https://formsubmit.co/documentation) لمعرفة تفاصيل الخدمة.
