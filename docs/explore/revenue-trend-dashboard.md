# Explore: Revenue Trend Dashboard (đề test full-stack)

_2026-08-16_

**Feature:** Dashboard doanh thu theo tuần cho nhà hàng — biểu đồ cột 7 ngày có chế độ so sánh kỳ trước, kèm khu vực admin để nhập/sửa dữ liệu.
**Stack:** Rails (API-only) · Next.js · PostgreSQL
**Trạng thái repo:** greenfield — thư mục trống hoàn toàn.

---

## 1. Đề bài yêu cầu gì

Bài test full-stack, **4 hạng mục bắt buộc**:

| # | Hạng mục | Yêu cầu | Người chấm nhìn gì |
|---|---|---|---|
| 1 | `[front]` | Dựng lại view giống ảnh/video mẫu | Có làm được chart grouped + stacked 2 mode, toggle series, export PNG không |
| 2 | `[front-admin]` | Auth + UI admin để tạo/sửa dữ liệu cho view | Có biết làm login, bảo vệ route, CRUD form không |
| 3 | `[backend]` | API cung cấp dữ liệu để FE phản ánh **đúng y hệt** cái admin vừa cập nhật | Model dữ liệu, aggregation ở BE hay đẩy cho FE tự tính |
| 4 | `README` | Hướng dẫn cài từ đầu tới cuối, máy sạch linux/macos, gồm DB init + migration | Người lạ clone về có chạy được trong ~15 phút không |

> ⚠ Câu **"reflect exact data that admin updated"** là điều kiện pass/fail. Không được hard-code, không được mock. Admin sửa `pos_revenue` ngày Thứ Tư → reload view thấy cột Thứ Tư đổi, và cả 3 KPI card + % so sánh đổi theo.

---

## 2. Bóc tách view từ ảnh mẫu

Hai ảnh là **cùng một component, 2 trạng thái**:

- **Ảnh 2** = mặc định (`Compare to Previous` tắt, nút viền vàng)
- **Ảnh 1** = sau khi bật compare (nút nền đen, tiêu đề đổi, chart thêm cột kỳ trước)

### Header

| Thành phần | Mô tả |
|---|---|
| Tiêu đề | Đổi động: `This Week's Revenue Trend` → `... vs Previous Period` |
| 3 checkbox | POS Revenue / Eatclub Revenue / Labour Costs — bật/tắt series |
| `Compare to Previous` | Toggle. Off = viền vàng · On = nền đen |
| `Export PNG` | Xuất chart thành ảnh |

### 3 KPI card

- Total Revenue · Average per Day · Total Covers
- Mode thường: chỉ 1 số (`$16,977`)
- Mode compare: `$15,974 vs $14,982 (+6.6%)` — % có màu xanh (tăng) / đỏ (giảm)

> Số liệu 2 ảnh khác nhau ($16,977 vs $15,974) → 2 ảnh chụp 2 tuần khác nhau, **không phải bug**. Nhưng nó cho thấy toggle compare **gọi lại API**, không chỉ ẩn/hiện client-side.

### Chart (Mon → Sun)

- **Mode thường:** 2 cột/ngày
  - Cột 1 stacked: đen (POS) dưới + xanh tím (Eatclub) trên
  - Cột 2: cam đặc (Labour Costs)
- **Mode compare:** 4 cột/ngày — thêm
  - Cột stacked màu nhạt: xám (POS kỳ trước) + xanh nhạt (Eatclub kỳ trước)
  - Cột cam nhạt (Labour kỳ trước)
- Trục Y mốc cố định `0k / 0.75k / 1.5k / 2.25k / 3k`, grid nét đứt, không có trục dọc
- Trục X nhãn `Mon…Sun`
- Legend đổi theo mode: 3 mục → 6 mục

### ✅ Đã chốt với BA — nhãn kỳ trước là lỗi của prototype

Ảnh mẫu đặt nhãn không đối xứng: kỳ hiện tại là `POS Revenue` + `Eatclub Revenue`, kỳ trước lại là `Direct Revenue` + `Total Revenue`.

**BA xác nhận công thức:**

```
POS = Direct
POS + Eatclub = Total Revenue
```

Tức là mỗi ngày có **2 nguồn doanh thu được nhập tay** (POS và Eatclub), còn `Total Revenue` là **giá trị tính ra**, không lưu trong DB, không có ô nhập trong form admin.

Từ đó suy ra nhãn trong prototype bị sai: legend gắn chấm màu theo **từng tầng** của cột, nên chấm xanh nhạt đang trỏ vào tầng trên của cột kỳ trước — mà tầng đó là **Eatclub**, không phải Total. Legend kỳ hiện tại đặt tên theo thành phần, legend kỳ trước lại đặt tên theo giá trị cộng dồn: trộn hai kiểu trong cùng một legend.

**BA đã đồng ý sửa nhãn cho đối xứng:**

| Prototype | Triển khai |
|---|---|
| `Direct Revenue (Previous)` | `POS Revenue (Previous)` |
| `Total Revenue (Previous)` | `Eatclub Revenue (Previous)` |

Legend không còn mục `Total Revenue` — con số đó đã nằm ở KPI card phía trên, và chiều cao cột stack tự nó thể hiện tổng.

**Hệ quả về thiết kế:**

- Hai kỳ đối xứng hoàn toàn ⇒ API trả `previous` với **đúng field name như `current`**. FE không cần bảng mapping, nhãn sinh bằng `${metric} (${period})`.
- API **không trả `total_revenue` trong `series[]`**. Trả cả 2 thành phần lẫn tổng sẽ khiến FE stack cả 3 và vẽ cột cao gấp đôi.
- Đây là **cố ý lệch khỏi prototype** → phải ghi lại trong README, nếu không người chấm sẽ tưởng làm sai.

> Nếu làm ngược lại — API trả `{ direct_revenue: 1520, total_revenue: 1840 }` — thì FE stack hai số đó lên nhau sẽ ra cột cao 3.360 thay vì 1.840. Lỗi âm thầm, không crash, chỉ vẽ sai. Contract đối xứng loại bỏ hẳn cái bẫy này.

---

## 3. Mô hình dữ liệu

```
venues       (id, name, timezone)
trading_days (id, venue_id, date, pos_revenue, eatclub_revenue,
              labour_cost, covers)              -- unique(venue_id, date)
admin_users  (id, email, password_digest)
```

**Vì sao `trading_days` chứ không phải `trading_days`:** một dòng đại diện cho *một ngày kinh doanh của một quán* — đó là thứ có thật ngoài đời. `metrics` là từ vựng của dashboard, mô tả cách ta dùng dữ liệu chứ không mô tả bản thân dữ liệu. Tên này còn chịu được cột mới (`wastage`, `void_count`, `weather`) mà không phải đổi lại, và cho ngữ nghĩa rõ hơn khi thiếu dòng: **hôm đó quán không kinh doanh**, chứ không phải "chưa ai nhập". Nếu sau này cần phân biệt hai trường hợp đó, thêm cột `closed` vào là vừa khớp.

`total_revenue` **không có cột trong DB và không có ô nhập trong form admin** — luôn là giá trị tính ra. Admin nhập 4 số/ngày: POS, Eatclub, Labour, Covers.

> Nếu cho admin nhập `Direct` + `Total` thay vì `POS` + `Eatclub`, họ có thể nhập `Total < Direct` → ra Eatclub âm. Cách hiện tại không có lỗ hổng đó.

Công thức:

| | |
|---|---|
| `total_revenue` | `Σ(pos_revenue + eatclub_revenue)` trên 7 ngày |
| `average_per_day` | `total_revenue / 7` — chia cứng 7, không chia số ngày có dữ liệu |
| `total_covers` | `Σ covers` |
| `delta_pct` | `(current - previous) / previous * 100`, làm tròn 1 chữ số |

---

## 4. Danh sách tính năng

### 4.1. FE — View chính (public)

- **Header động**
  - Tiêu đề đổi theo mode: `This Week's Revenue Trend` ↔ `... vs Previous Period`
  - 3 checkbox bật/tắt series: POS Revenue · Eatclub Revenue · Labour Costs
  - Nút `Compare to Previous` — toggle, có active state (viền vàng ↔ nền đen)
  - Nút `Export PNG`
- **3 KPI card**
  - Total Revenue · Average per Day · Total Covers
  - Mode thường: chỉ hiện số kỳ này
  - Mode compare: `$15,974 vs $14,982 (+6.6%)` — % có màu theo chiều tăng/giảm
- **Biểu đồ 7 ngày**
  - Mode thường: 2 cột/ngày (stacked POS+Eatclub, và Labour)
  - Mode compare: 4 cột/ngày (thêm nhóm kỳ trước màu nhạt)
  - Trục Y mốc cố định, grid nét đứt
  - Tooltip hover hiện đủ series đang bật của ngày đó
  - Legend đổi theo mode (3 → 6 mục), nhãn đối xứng hai kỳ: `${metric} (Current|Previous)`
  - Tắt checkbox → cột biến mất, cột còn lại **giữ nguyên vị trí**
- **Trạng thái**
  - Loading skeleton
  - Empty state khi tuần chưa có dữ liệu
  - Error state khi API lỗi
  - Responsive desktop ≥1024px

### 4.2. Admin — Auth

- Trang đăng nhập (email + mật khẩu)
- Xác thực JWT, lưu token phía client
- Protected route: chưa đăng nhập → redirect `/admin/login`
- Đăng xuất, xoá token
- Guard toàn bộ endpoint `/api/v1/admin/*` phía BE
- Seed sẵn 1 tài khoản admin, ghi credential trong README

### 4.3. Admin — Quản trị dữ liệu

- **Chọn tuần** cần nhập/sửa (date picker về thứ Hai)
- **Bảng 7 ngày** hiển thị dữ liệu hiện có của tuần đã chọn
- **CRUD `trading_days`**: nhập/sửa `pos_revenue`, `eatclub_revenue`, `labour_cost`, `covers` theo từng ngày
- **Validation**: số ≥ 0, không trùng `(venue, ngày)`, báo lỗi ngay tại field
- Toast xác nhận lưu thành công / thất bại
- Link nhanh sang view chính để kiểm tra kết quả

### 4.4. BE — API

- **`GET /api/v1/revenue_trend`** (public) — endpoint duy nhất nuôi view
  - Params: `venue_id`, `week_start`, `compare`
  - Trả về: `period`, `previous_period`, `summary` (3 KPI kèm `delta_pct`), `series` (7 ngày)
  - `previous` dùng **đúng field name như `current`** — đối xứng, không double count
  - Toàn bộ aggregation tính ở BE, FE chỉ render
- **Business rules**
  - `total_revenue = Σ(pos + eatclub)`
  - `average_per_day = total / 7` (chia cứng 7)
  - `delta_pct` làm tròn 1 chữ số; `previous = 0` → trả `null`, không trả `Infinity`
  - Ngày thiếu dữ liệu vẫn xuất hiện trong `series` với mọi giá trị `0`
  - `compare=false` → mọi field `previous` = `null`
- **`POST /api/v1/admin/login`** — cấp JWT
- **CRUD `/api/v1/admin/trading_days`** — index / create / update / destroy
- **Hạ tầng**
  - Validate params (`week_start` phải là thứ Hai → 422)
  - CORS cho origin của Next.js
  - Format JSON error thống nhất
  - **Không cache** — admin sửa xong reload là thấy ngay

### 4.5. BE — Dữ liệu

- 3 bảng: `venues`, `trading_days`, `admin_users`
- Migration đầy đủ, chạy được từ DB rỗng
- Seed: 1 venue + **3 tuần dữ liệu liên tiếp** (đủ để test compare) + 1 admin

### 4.6. Docs

- README cài từ máy trắng: prerequisites + version (Ruby, Node, Postgres)
- Các bước DB: `db:create` → `db:migrate` → `db:seed`
- Bảng biến môi trường cho cả 2 repo
- Lệnh chạy BE và FE, kèm port
- Credential admin mặc định
- **Ghi chú việc cố ý lệch nhãn legend so với prototype** + lý do (đã confirm với BA)
- Tuỳ chọn `docker-compose up` để bỏ qua cài Postgres thủ công
- Troubleshooting lỗi hay gặp (gem `pg` thiếu `libpq`, port trùng, CORS)

---

## 5. API contract

```
GET /api/v1/revenue_trend?venue_id=1&week_start=2026-08-10&compare=true
```

| Param | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|
| `venue_id` | ✗ | venue đầu tiên | |
| `week_start` | ✗ | thứ Hai của tuần hiện tại | phải là thứ Hai, `YYYY-MM-DD` |
| `compare` | ✗ | `false` | `true` → trả thêm block previous |

```jsonc
200 OK
{
  "period":          { "start": "2026-08-10", "end": "2026-08-16" },
  "previous_period": { "start": "2026-08-03", "end": "2026-08-09" },  // null nếu compare=false
  "summary": {
    "total_revenue":   { "current": 15974, "previous": 14982, "delta_pct": 6.6 },
    "average_per_day": { "current": 2282,  "previous": 2140,  "delta_pct": 6.6 },
    "total_covers":    { "current": 871,   "previous": 820,   "delta_pct": 6.2 }
  },
  "series": [
    { "date": "2026-08-10", "weekday": "Mon",
      "current":  { "pos_revenue": 1750, "eatclub_revenue": 320, "labour_cost": 590, "covers": 118 },
      "previous": { "pos_revenue": 1520, "eatclub_revenue": 320, "labour_cost": 540, "covers": 110 } }
    // ... luôn đủ 7 phần tử, kể cả ngày không có dữ liệu
  ]
}
```

`previous` dùng **đúng field name như `current`** — hai kỳ đối xứng, FE không phải map gì.

**Không trả `total_revenue` trong `series[]`.** Tổng theo ngày = cộng 2 thành phần FE đã có; tổng theo tuần nằm ở `summary`. Trả thêm sẽ mời FE stack nhầm cả 3.

---

## 6. Ước lượng — 6 tiếng (1 dev + Claude Code)

**360 phút.** Giả định máy đã có Ruby + Node + Postgres (hoặc Docker); máy trắng tinh cộng thêm 30–45 phút cài đặt.

### Tổng quan

| Khối | Phút | % |
|---|---:|---:|
| Nền tảng chung | 35 | 10% |
| **BE** (API công khai) | 65 | 18% |
| **Admin** (auth + CRUD — BE 32 · FE 43) | 75 | 21% |
| **FE** (view chính) | 130 | 36% |
| Đóng gói | 25 | 7% |
| **Buffer** | 30 | 8% |
| | **360** | |

Quy theo chuyên môn: BE tổng **97 phút** · FE tổng **173 phút** · chung **60 phút** · buffer **30 phút**.

### 0 · Nền tảng chung — 35 phút

| | Phút |
|---|---:|
| Chốt API contract + data model trên giấy (trước khi gõ code) | 15 |
| Scaffold Rails API-only + Postgres + docker-compose | 12 |
| Scaffold Next.js + Tailwind + API client + `.env` | 8 |

### 1 · BE — 65 phút

| | Phút |
|---|---:|
| Models + migrations + seed 3 tuần dữ liệu | 17 |
| `RevenueTrendQuery` service: aggregate, ghép kỳ trước, `delta_pct`, fill ngày trống, chia 0 | 25 |
| Controller + serializer + validate params + CORS | 10 |
| Request specs phủ 7 acceptance criteria | 13 |

→ **Xong khối này:** `curl` ra đúng JSON contract cho cả `compare=true` và `false`.

### 2 · Admin — 75 phút

**Backend — 32 phút**

| | Phút |
|---|---:|
| `admin_users` + JWT login + guard `/api/v1/admin/*` | 20 |
| CRUD API `trading_days` | 12 |

**Frontend — 43 phút**

| | Phút |
|---|---:|
| Trang login + lưu token + protected route (middleware Next.js) | 20 |
| Bảng admin 7 ngày + form sửa + validation + toast | 23 |

→ **Xong khối này:** login được, sửa `pos_revenue` ngày Thứ Tư, DB đổi thật.

### 3 · FE — 130 phút

| | Phút |
|---|---:|
| **Spike layout 4 cột/ngày với mock data** (de-risk, làm sớm) | 20 |
| `RevenueTrendChart` core: stacked + grouped, trục Y mốc cố định, grid, tooltip | 45 |
| Compare mode + legend động + 3 checkbox toggle series | 25 |
| 3 KPI card, 2 trạng thái, `%` delta có màu | 20 |
| Export PNG | 15 |
| Loading / empty / error state | 5 |

### 4 · Đóng gói — 25 phút

| | Phút |
|---|---:|
| README | 15 |
| E2E verify: sửa số ở admin → reload view → xác nhận chart + KPI đổi đúng | 10 |

### Thứ tự chạy đề xuất

Nguyên tắc: **làm phần rủi ro nhất sớm nhất**, để phần dễ nén nhất ở cuối.

| Mốc | Việc | Checkpoint |
|---|---|---|
| 0:00 → 0:35 | Nền tảng chung | 2 repo chạy được |
| 0:35 → 0:55 | Spike chart 4 cột/ngày | ✅ Biết Recharts có làm được không ngay ở phút 55 |
| 0:55 → 2:00 | BE | API trả đúng JSON |
| 2:00 → 3:50 | FE view (110 phút còn lại) | Chart + KPI render đúng dữ liệu seed |
| 3:50 → 5:05 | Admin | Sửa số → view đổi |
| 5:05 → 5:30 | Đóng gói | README xong |
| 5:30 → 6:00 | Buffer | |

Lý do để Admin ở cuối: nó **dễ đoán và dễ nén nhất**. Trễ 30 phút thì cắt xuống bản tối giản là gỡ lại được ngay. Ngược lại, để chart ở cuối mà nó nổ thì không cứu được.

### Thứ tự cắt khi vượt cả buffer

1. Export PNG (−15)
2. Request specs BE, giữ 4 case quan trọng nhất (−8)
3. Toast + validation inline ở admin, thay bằng alert đơn giản (−8)

**Không cắt README** — đề nêu đích danh, rẻ nhất để ăn điểm.

### Rủi ro đội giờ

| | Mất thêm |
|---|---|
| Recharts không dựng nổi grouped-of-stacked → phải tự tính offset hoặc đổi thư viện | **+60–90 phút** |
| CORS / lưu token / redirect admin lặt vặt | +20 phút |
| Máy trắng tinh, phải cài Ruby/Node/Postgres | +30–45 phút |

Rủi ro số 1 xử lý bằng bước **spike ở phút 35–55**: dựng chart rỗng với dữ liệu giả 4 cột/ngày, xác nhận layout ra đúng trước khi nối API.

---

## 7. Task sample tiêu biểu

Hai task này là xương sống — xong hai cái này thì phần còn lại là lắp ghép. Chi tiết đầy đủ ở file riêng:

- `docs/tasks/FE-04-revenue-trend-chart.md`
- `docs/tasks/BE-05-revenue-trend-endpoint.md`

| | Vì sao chọn |
|---|---|
| **FE-04** | Phần khó và đắt nhất — chart grouped + stacked, 2 mode, toggle series. Làm được cái này thì các task FE còn lại là routine |
| **BE-05** | Thể hiện tư duy thiết kế API: gom aggregation về BE thay vì đẩy raw rows cho FE, xử lý đủ edge case (chia 0, ngày thiếu, validate params). Là contract mà FE-03/04 đều phụ thuộc → phải chốt trước tiên |

---

## 8. Ngoài phạm vi

- **Event Impact markers** (icon mũi tên xanh/đỏ nổi trên cột) — đã loại khỏi scope
- 4 tab dưới cùng ảnh 2 (`Period Comparison`, `Year-over-Year`, `Budget Performance`, `Performance Score`) — đề chỉ yêu cầu "a view"
- Multi-venue switcher (seed 1 venue là đủ)
- Phân quyền nhiều cấp trong admin (1 role admin duy nhất)
- Realtime / websocket — reload trang là đủ để thấy dữ liệu mới
- Responsive mobile

---

## 9. Điểm mơ hồ

### Đã chốt

| # | Vấn đề | Kết luận |
|---|---|---|
| 1 | Nhãn kỳ trước không đối xứng (`Direct Revenue` / `Total Revenue`) | ✅ **BA: `POS = Direct`, `POS + Eatclub = Total`.** Nhãn prototype sai; BA đồng ý đổi thành `POS/Eatclub Revenue (Previous)`. Chi tiết ở mục 2 |
| 2 | Event Impact xác định thế nào | ✅ Không cần trả lời — đã loại khỏi scope |

### Còn treo

| # | Vấn đề | Ảnh hưởng |
|---|---|---|
| 3 | Đề nhắc **"video below"** nhưng chỉ có 2 ảnh tĩnh — có animation khi chuyển mode không? | +2h nếu có |
| 4 | **Previous period** = tuần liền trước hay cùng tuần năm trước? (ảnh 2 có tab riêng `Year-over-Year` → nghiêng về tuần liền trước) | Sai → toàn bộ so sánh sai |
| 5 | Timezone của `date` — dùng timezone của venue hay UTC? | Lệch ngày ở biên tuần |

---

## 10. Giả định

- Previous period = **tuần liền trước** (7 ngày ngay trước `week_start`)
- Tất cả số tiền là **AUD, không có phần thập phân**, hiển thị `$15,974`
- Tuần bắt đầu từ **thứ Hai**
- Chỉ 1 venue, không cần venue switcher
- Không có animation transition giữa 2 mode

---

## 11. Bước tiếp theo

`/sp-scaffold` (greenfield — dựng skeleton Rails + Next.js + Postgres chạy được) → `/sp-plan` (spec chi tiết) → `/sp-build`.
