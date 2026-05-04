# OMES UI Design System

> **Bắt buộc đọc trước khi thêm trang, component hoặc modal mới.**  
> Mọi UI mới phải tuân theo các quy tắc trong tài liệu này để đảm bảo giao diện nhất quán.

---

## 1. Tailwind & CSS Setup

Dự án dùng **Tailwind v4** với `@import "tailwindcss"` — **không có shadcn**, **không có preset nào thêm vào**.

### Token đã được định nghĩa trong `app/globals.css`

| Token class | Giá trị | Dùng cho |
|---|---|---|
| `bg-background` | `#ffffff` | Background trang, card |
| `bg-muted` | `#f9fafb` (gray-50) | Header bảng, sidebar, footer modal |
| `text-muted-foreground` | `#6b7280` (gray-500) | Label phụ, chú thích |
| `border` (bare) | `#e5e7eb` (gray-200) | Viền mặc định — **không đen** |
| `focus:ring-ring` | `#60a5fa` (blue-400) | Focus ring input |

> **Chỉ dùng class thuần Tailwind** (`border-gray-200`, `bg-gray-50`, `text-gray-500`...) **hoặc token đã khai báo trên**.  
> **Tuyệt đối không tự đặt CSS variable mới** kiểu `bg-primary`, `bg-accent`, `text-secondary`... — chúng sẽ render sai.

---

## 2. Input & Select

Dùng class utility `.input-base` cho `<input>` và `.select-base` cho `<select>`:

```tsx
<input className="input-base w-full" ... />
<select className="select-base">...</select>          {/* full-width (default) */}
<select className="select-base w-auto">...</select>   {/* auto-width cho filter bar */}
```

`.input-base` và `.select-base` được định nghĩa trong `app/globals.css`:

```css
.input-base {
  @apply h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900
         shadow-sm transition-colors placeholder:text-gray-400
         focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent;
}

.select-base {
  /* appearance-none + SVG arrow đã được set qua background-image */
  @apply h-9 w-full appearance-none rounded-md border border-gray-200 bg-white
         pl-3 pr-8 text-sm text-gray-900 shadow-sm transition-colors
         focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent;
}
```

**Không** dùng `border bg-background`, `border-input`, `ring-ring`, `input-base` cho select, hay Radix/shadcn `<Select>` component.

---

## 3. Card / Panel

```tsx
<div className="rounded-xl border border-gray-200 bg-white p-4">
  {/* nội dung */}
</div>
```

| Thuộc tính | Class | Ghi chú |
|---|---|---|
| Bo góc | `rounded-xl` | Tất cả card, panel |
| Viền | `border border-gray-200` | Luôn kèm màu |
| Nền | `bg-white` | Không dùng `bg-background` trong JSX |
| Padding | `p-4` hoặc `p-6` | Tuỳ kích thước card |
| Hover shadow | `hover:shadow-sm transition-shadow` | Nếu card có thể click |

---

## 4. Modal / Dialog

```tsx
{/* Overlay */}
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">

  {/* Modal box */}
  <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Tiêu đề</h2>
      <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
        <X className="h-5 w-5 text-gray-500" />
      </button>
    </div>

    {/* Body */}
    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      {/* ... */}
    </div>

    {/* Footer */}
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
        Hủy
      </button>
      <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
        Lưu
      </button>
    </div>

  </div>
</div>
```

**Không** dùng `rounded-2xl`, `bg-background`, `bg-muted/30`, `hover:bg-muted`.

---

## 5. Bảng (Table)

```tsx
<div className="rounded-xl border border-gray-200 overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="px-4 py-3 text-left font-medium text-gray-500">Cột</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 text-gray-900">Dữ liệu</td>
      </tr>
    </tbody>
  </table>
</div>
```

| Vùng | Class |
|---|---|
| Wrapper | `rounded-xl border border-gray-200 overflow-hidden` |
| Header row | `bg-gray-50 border-b border-gray-200` |
| Header cell | `text-gray-500 font-medium` |
| Body row | `border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors` |
| Body cell (primary) | `text-gray-900` |
| Body cell (secondary) | `text-gray-500` |

---

## 6. Label trong Form

```tsx
<label className="text-xs font-medium text-gray-500 mb-1 block">Họ tên *</label>
```

**Không** dùng `text-muted-foreground` trực tiếp trong JSX mới (dù token đã được định nghĩa, dùng `text-gray-500` dễ đọc và explicit hơn).

---

## 7. Button

| Loại | Class |
|---|---|
| Primary | `px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50` |
| Secondary / Ghost | `px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50` |
| Danger | `px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50` |
| Icon button | `p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors` |
| Header action (outline) | `flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors` |

---

## 8. Badge / Pill

```tsx
{/* Role / status badge — không dùng border bare */}
<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
  Nội dung
</span>
```

Mẫu màu badge theo vai trò (đã dùng trong `GLOBAL_ROLES` constant):

| Vai trò | Class |
|---|---|
| super_admin | `bg-red-100 text-red-700` |
| admin | `bg-orange-100 text-orange-700` |
| manager | `bg-blue-100 text-blue-700` |
| employee | `bg-green-100 text-green-700` |
| viewer | `bg-gray-100 text-gray-600` |
| active | `bg-green-100 text-green-700` |
| inactive | `bg-gray-100 text-gray-500` |
| invited | `bg-yellow-100 text-yellow-700` |

---

## 9. Page Header

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Tiêu đề trang</h1>
    <p className="text-sm text-gray-500 mt-0.5">Mô tả ngắn</p>
  </div>
  <div className="flex items-center gap-2">
    {/* Buttons */}
  </div>
</div>
```

---

## 10. Stats Card (row)

```tsx
<div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
    <Icon className="h-5 w-5 text-blue-600" />
    <div>
      <div className="text-xl font-bold text-gray-900">42</div>
      <div className="text-xs text-gray-500">Nhãn</div>
    </div>
  </div>
</div>
```

---

## 11. Filter Bar

```tsx
<div className="flex flex-wrap gap-3 items-center">
  {/* Search input */}
  <div className="relative flex-1 min-w-[180px] max-w-xs">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
    <input
      placeholder="Tìm kiếm..."
      className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
    />
  </div>

  {/* Select filter */}
  <select className="input-base">
    <option value="">Tất cả</option>
  </select>
</div>
```

---

## 12. Quy tắc nhanh (Checklist khi review)

- [ ] Không có `border` bare (luôn kèm `border-gray-200`)  
- [ ] Không có `bg-background`, `bg-muted`, `hover:bg-muted` trong JSX — dùng `bg-white`, `bg-gray-50`, `hover:bg-gray-50`  
- [ ] Không có `text-muted-foreground` trong JSX mới — dùng `text-gray-500`  
- [ ] Không có `rounded-2xl` — dùng `rounded-xl`  
- [ ] Không có `focus:ring-ring`, `border-input` — dùng `focus:ring-blue-400`, `border-gray-200`  
- [ ] Input/Select dùng `.input-base` hoặc inline class tương đương  
- [ ] Modal footer dùng `bg-gray-50 border-t border-gray-200`  
- [ ] Table wrapper dùng `rounded-xl border border-gray-200 overflow-hidden`  
- [ ] Không tự thêm CSS variable mới vào globals.css mà không cập nhật tài liệu này  
