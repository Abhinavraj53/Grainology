# Bulk Upload — File Format Requirements

Use this guide when preparing Excel (.xlsx) or CSV files for bulk upload of **Confirmed Purchase Orders** or **Confirmed Sales Orders**.

---

## General rules

- **File type:** `.xlsx` (recommended) or `.csv`
- **First row:** Must contain column headers. Header names must match exactly (case-sensitive).
- **Data rows:** Each row = one transaction. No blank rows between data.
- **Allowed values:** For **Location**, **Warehouse**, **Commodity**, **Customer/Seller**, **Variety**, and **State** use **only** the values listed in the **Master List** sheet of the sample Excel file. Do not invent new names.

---

## Where to enter data

1. Download the **Sample Excel** from the bulk upload section.
2. Open the file. The **first sheet** is **Sample Data** — this is your bulk upload template. Fill your data here.
3. The **second sheet** is **Master List** — reference only. Use only these values in the Sample Data sheet for the fields listed above.

---

## Required vs optional columns

- **Required:** Must be present and non-empty for every row (e.g. State, Supplier Name / Customer, Location, Warehouse Name, Vehicle No., Net Weight in MT, Rate Per MT).
- **Optional:** Can be left empty; use `-` or leave blank for numeric deductions if not applicable.

---

## Date and number formats

- **Date:** DD/MM/YYYY (e.g. 11/02/2026)
- **Numbers:** Use decimal point (e.g. 12.690, 22310.00). No thousands separator.
- **Currency:** Indian Rupees (Rs.), numbers only
- **Text:** No special characters that could break CSV/Excel parsing; use only values from Master List where specified

---

## Confirmed Purchase Order — column list

| # | Column name | Required | Format | Notes |
|---|-------------|----------|--------|--------|
| 1 | Date of Transaction | Optional | DD/MM/YYYY | Use only values from Master List |
| 2 | State | **Yes** | Text | Use only values from Master List |
| 3 | Supplier Name | **Yes** | Text | Use only values from Master List → Customers / Sellers |
| 4 | Location | **Yes** | Text | Use only values from Master List → Locations |
| 5 | Warehouse Name | **Yes** | Text | Use only values from Master List → Warehouses |
| 6 | Chamber No. | Optional | Number or text | |
| 7 | Commodity | **Yes** | Text | Use only values from Master List → Commodities |
| 8 | Variety | Optional | Text | Use only values from Master List → Varieties |
| 9 | Gate Pass No. | Optional | Text | |
| 10 | Vehicle No. | **Yes** | Text | |
| 11 | Weight Slip No. | Optional | Text | |
| 12 | Gross Weight in MT (Vehicle + Goods) | Optional | Number | e.g. 12.690 |
| 13 | Tare Weight of Vehicle | Optional | Number (MT) | |
| 14 | No. of Bags | Optional | Number | |
| 15 | Net Weight in MT | **Yes** | Number | e.g. 5.900 |
| 16 | Rate Per MT | **Yes** | Number (Rs.) | e.g. 22310.00 |
| 17 | Gross Amount | Optional | Number (Rs.) | |
| 18–27 | HLW, Excess HLW, Deduction (HLW), MOI, Excess Moisture, BDOI, Excess BDOI, MOI+BDOI, Weight Deduction KG, Deduction (MOI+BDOI) | Optional | Number or "Not Applicable" | |
| 28–37 | Other Deduction 1–10 | Optional | Number or "-" | |
| 38 | Net Amount | Optional | Number (Rs.) | |
| 39 | Remarks | Optional | Text | |

---

## Confirmed Sales Order — column list

Same as above, except:

- **Customer** (required) and **Seller Name** (required) replace **Supplier Name**. Use only values from Master List → Customers / Sellers.
- **Other Deduction 1–9** each have a matching **Remarks** column (e.g. Other Deduction 1, Other Deduction 1 Remarks).

Total columns are more due to the deduction remarks columns; exact order must match the sample Excel.

---

## Validation and errors

- Missing required columns or invalid header names will cause upload to fail.
- Values for Location, Warehouse, Commodity, Customer/Seller, Variety, and State that are not in the Master List may be rejected.
- Ensure no extra commas or quotes inside CSV cells; for complex data prefer .xlsx.

For the full column list and in-app help, use **“View detailed format requirements”** in the bulk upload section.
