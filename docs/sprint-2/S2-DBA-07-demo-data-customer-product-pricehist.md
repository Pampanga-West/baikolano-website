# [S2-DBA-07] Demo Data for Customer, Product, and Price History

## Sprint Task Reference
- **Task ID:** S2-DBA-07
- **Sprint:** Sprint 2 (Weeks 3-4)
- **Role:** DB Admin
- **Author:** Joe Andre Roja
- **Closes Issue:** Closes #212

---

## 1. Executive Summary

To support frontend verification, QA test automation (`S2-TST-01` through `S2-TST-06`), and stakeholder demonstrations for Sprint 2, realistic seed datasets have been designed, structured, and applied directly to the database.

The dataset introduces:
1. **Diverse Customer Master Entities:** Testing all standard payment terms (`Net 15`, `Net 30`, `Net 45`, `Net 60`, `Prepaid`, `COD`, `30D`, `60D`) as well as soft-deleted customer records to validate table filter tabs (`All`, `Active`, `Inactive`) in `CustomersPage.tsx`.
2. **Product Catalog Coverage:** Items spanning all approved units of measure (`meter`, `pcs`, `box`, `liter`, `pack`, `pair`, `kg`, `can`), including active and soft-deleted catalog entries.
3. **Multi-Year Price History Evolution:** Demonstrating how product pricing shifts across dates (`2024`, `2025`, `2026`) and proving that `get_price_as_of_date` correctly resolves the valid historical price.

---

## 2. Seed Data Catalog

### 2.1 Customer Master Dataset

| Customer No (`custno`) | Company Name (`custname`) | Address | Payment Term (`payterm`) | Status (`is_deleted`) | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `C0081` | Acme Supplies Inc | 100 Industrial Pkwy, Austin, TX | `Net 30` | Active (`false`) | Standard corporate account |
| `C0082` | TechTrend Solutions | 452 Innovation Blvd, San Jose, CA | `Net 15` | Active (`false`) | Fast-turnaround terms |
| `C0083` | Nexus Logistics | 88 Logistics Way, Chicago, IL | `Net 60` | Active (`false`) | Extended payment term |
| `C0084` | Summit Retail | 12 Retail Row, New York, NY | `Prepaid` | Active (`false`) | Advance payment verification |
| `C0085` | Apex Hardware | 770 Hardware St, Dallas, TX | `COD` | Active (`false`) | Cash on delivery workflow |
| `C0086` | Vantage Health | 310 Medical Center Dr, Boston, MA | `Net 45` | Active (`false`) | Healthcare tier terms |
| `C0087` | Pacific Media | 500 Ocean Ave, Santa Monica, CA | `60D` | Active (`false`) | Legacy numeric day code |
| `C0088` | Legacy Retailers | 90 Old Town Rd, Atlanta, GA | `30D` | Inactive (`true`) | Soft-delete filter & restore test |
| `C0089` | Archived Corp | 15 Vintage Ave, Denver, CO | `Net 30` | Inactive (`true`) | Inactive filter verification |

### 2.2 Product Catalog Dataset

| Product Code (`prodcode`) | Description | Unit of Measure (`unit`) | Status (`is_deleted`) |
| :--- | :--- | :--- | :--- |
| `P0001` | Industrial Ethernet 2m | `meter` | Active (`false`) |
| `P0002` | Ergonomic Desk Chair | `pcs` | Active (`false`) |
| `P0003` | Optical Laser Sensor | `box` | Active (`false`) |
| `P0004` | Silicon Lubricant 500ml | `liter` | Active (`false`) |
| `P0005` | Shipping Box Pack | `pack` | Active (`false`) |
| `P0006` | Anti-Static Gloves | `pair` | Active (`false`) |
| `P0007` | Aluminum Rail 2m | `meter` | Active (`false`) |
| `P0008` | Structural Resin 1kg | `kg` | Active (`false`) |
| `P0009` | Electronic Air Duster | `can` | Active (`false`) |
| `P0010` | Legacy Motherboard | `pcs` | Inactive (`true`) |

### 2.3 Price History Timeline Dataset

| Product Code | Effective Date (`effdate`) | Unit Price (`unitprice`) | Price State |
| :--- | :--- | :--- | :--- |
| `P0001` | `2024-01-01` | `$1.85` | Historical |
| `P0001` | `2025-01-01` | `$2.10` | Historical |
| `P0001` | `2026-06-01` | `$2.45` | Active Current |
| `P0002` | `2024-06-01` | `$189.00` | Historical |
| `P0002` | `2025-06-01` | `$219.00` | Historical |
| `P0002` | `2026-01-15` | `$249.99` | Active Current |
| `P0003` | `2025-01-01` | `$45.00` | Historical |
| `P0003` | `2026-03-01` | `$52.50` | Active Current |
| `P0004` | `2025-03-01` | `$18.75` | Historical |
| `P0004` | `2026-02-01` | `$21.00` | Active Current |
| `P0005` | `2025-01-01` | `$12.50` | Historical |
| `P0005` | `2026-01-01` | `$14.25` | Active Current |

---

## 3. Verification & Live Database Ingestion

1. **Idempotent Ingestion:** All records use `ON CONFLICT (...) DO UPDATE` ensuring safe repeatable execution without creating duplicate key errors.
2. **View Filtering Verified:**
   - Active customer count increases by 7 in `customer_active`.
   - Soft-deleted customers `C0088` and `C0089` are excluded from `customer_active` but visible in `public.customer`.
3. **Price Resolution Verified:**
   - `get_price_as_of_date('P0001', '2024-06-01')` returns `$1.85`.
   - `get_price_as_of_date('P0001', '2025-06-01')` returns `$2.10`.
   - `get_price_as_of_date('P0001', '2026-11-27')` returns `$2.45`.

---

## 4. Deliverables

- **SQL Seed Script:** [`docs/sprint-2/sql/V2_5__demo_data_customer_product_pricehist.sql`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/sql/V2_5__demo_data_customer_product_pricehist.sql)
- **Documentation:** [`docs/sprint-2/S2-DBA-07-demo-data-customer-product-pricehist.md`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/S2-DBA-07-demo-data-customer-product-pricehist.md)
- **Live Database Status:** Seeded on Supabase PostgreSQL project `hwebcmeyxqxjwysfmphh`.
