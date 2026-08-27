# Saudi ZATCA QR Invoice SaaS - Phase 1 Architecture

## 📋 Project Overview
A web-based invoice generation platform that creates **ZATCA Phase 1 compliant invoices** with embedded QR codes, A4 print-ready PDFs, and invoice history management.

---

## 🎯 Phase 1 Scope
- ✅ Basic invoice generation with ZATCA Phase 1 QR code
- ✅ Invoice template management
- ✅ Invoice history/storage
- ✅ Web application (browser-based)
- ✅ A4 PDF output (print-ready with letterhead space)
- ✅ Single company for now
- ❌ Digital signatures (Phase 2)
- ❌ Multi-user authentication (can add in Phase 1.5)

---

## 🏗️ Technical Stack

### Frontend
- **React 18** (or vanilla JavaScript)
- **Tailwind CSS** for styling
- **html2pdf / jsPDF** for PDF generation
- **qrcode.js** for QR code generation

### Backend
- **Node.js + Express.js** (Hostinger-compatible)
- **MySQL** for invoice storage
- **dotenv** for configuration

### ZATCA QR Code (Phase 1)
- TLV (Tag-Length-Value) encoded format
- Contains: Seller Name, TIN, Invoice Date, Total Amount, VAT Amount

---

## 📊 Database Schema

### Table: `companies`
```sql
CREATE TABLE companies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(15) NOT NULL UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_iban VARCHAR(50),
  bank_swift VARCHAR(20),
  logo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `invoice_templates`
```sql
CREATE TABLE invoice_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  name VARCHAR(100),
  description TEXT,
  template_data JSON,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

### Table: `invoices`
```sql
CREATE TABLE invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  company_id INT NOT NULL,
  customer_name VARCHAR(255),
  customer_tax_id VARCHAR(15),
  customer_address TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  items JSON,
  subtotal DECIMAL(12,2),
  vat_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  vat_rate INT DEFAULT 15,
  notes TEXT,
  payment_method VARCHAR(50),
  status ENUM('draft', 'issued', 'paid', 'cancelled') DEFAULT 'draft',
  qr_code_data TEXT,
  pdf_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_company_id (company_id),
  INDEX idx_invoice_date (invoice_date)
);
```

### Table: `invoice_items`
```sql
CREATE TABLE invoice_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  description TEXT NOT NULL,
  unit_price DECIMAL(12,2),
  quantity INT,
  total_price DECIMAL(12,2),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
```

---

## 🔐 ZATCA Phase 1 QR Code Format

**What's included:**
1. **Seller Name** (Tag 01)
2. **Seller TIN** (Tag 02)
3. **Invoice Date & Time** (Tag 03)
4. **Total Amount** (Tag 04)
5. **VAT Amount** (Tag 05)
6. **Hash of Signed QR** (Tag 06) - *optional for Phase 1*

**QR Code Size:** 25x25mm minimum on printed invoice

**Example Data Structure:**
```
{
  sellerName: "Saudi Modern Packaging Co Ltd",
  sellerTin: "300795366400003",
  invoiceDateTime: "2025-08-15T10:30:00Z",
  totalAmount: 22500,
  vatAmount: 3375
}
```

---

## 📱 Frontend Features

### Invoice Creation Form
- Company selector (pre-filled for single company)
- Customer details (name, tax ID, address)
- Line items (dynamic add/remove)
- VAT calculation (15% fixed for Saudi Arabia)
- Invoice date & due date
- Payment method details

### Invoice Preview
- Live PDF preview before saving
- A4 letterhead space (top 80mm reserved)
- Bilingual layout (Arabic + English)
- Embedded QR code (25x25mm)

### Invoice Management
- List all invoices (with search/filter)
- Edit draft invoices
- View/download PDF
- Print-ready format

---

## 🖥️ Backend API Endpoints

### Invoice Management
```
POST   /api/invoices              - Create new invoice
GET    /api/invoices              - List all invoices
GET    /api/invoices/:id          - Get invoice details
PUT    /api/invoices/:id          - Update invoice
DELETE /api/invoices/:id          - Delete draft invoice
POST   /api/invoices/:id/finalize - Finalize & generate QR
GET    /api/invoices/:id/pdf      - Download PDF
```

### Templates
```
POST   /api/templates             - Create template
GET    /api/templates             - List templates
GET    /api/templates/:id         - Get template
PUT    /api/templates/:id         - Update template
DELETE /api/templates/:id         - Delete template
```

### Company
```
GET    /api/company               - Get company details
PUT    /api/company               - Update company details
```

### QR Code
```
POST   /api/qrcode/generate       - Generate ZATCA QR code
```

---

## 📦 Deployment on Hostinger

### Requirements
- Node.js 16+ (Hostinger supports this)
- MySQL 5.7+
- SSL certificate (Hostinger provides free)

### Steps
1. Create Node.js application in Hostinger
2. Set up MySQL database
3. Configure `.env` file
4. Install dependencies
5. Deploy code
6. Run database migrations

---

## 🔄 Workflow (User Journey)

1. **User logs in** → Sees dashboard
2. **Creates invoice** → Fills form with line items
3. **Preview** → Reviews A4 layout
4. **Finalize** → System generates ZATCA QR code + saves to DB
5. **Download PDF** → A4 print-ready with QR code
6. **Print on letterhead** → User prints on company letterhead paper

---

## 📄 A4 PDF Layout (210mm × 297mm)

```
┌─────────────────────────────────────┐
│                                     │  80mm - LETTERHEAD SPACE
│        (User prints letterhead)     │  (Reserved for company logo)
├─────────────────────────────────────┤
│                                     │
│  Invoice Number  | Invoice Date     │
│  Customer Info   | QR Code (25×25)  │
│                  |                  │
├─────────────────────────────────────┤
│  Line Items Table                   │
│  Description | Qty | Price | Total  │
│                                     │
├─────────────────────────────────────┤
│  Subtotal          | VAT (15%)       │
│  Total Inc. VAT                     │
│                                     │
│  Payment Details (Bank Info)        │
│  Payment Method                     │
│                                     │
│  Footer / Notes                     │
└─────────────────────────────────────┘
```

---

## 🚀 Phase 1 → Phase 2 Roadmap

**Phase 1.5** (Quick Additions)
- Email invoice directly to customer
- Invoice templates with company logos
- Multi-user login

**Phase 2** (Digital Signatures)
- CSID registration with ZATCA
- Digital certificates
- e-Invoicing submission to ZATCA
- Signed QR codes

**Phase 3** (Advanced)
- Multi-company support
- Recurring invoices
- Invoice payment tracking
- Automated email reminders
- API for third-party integrations

---

## 📝 Files to Create

1. `backend/server.js` - Express server
2. `backend/routes/invoices.js` - Invoice endpoints
3. `backend/routes/templates.js` - Template endpoints
4. `backend/utils/zatca-qrcode.js` - QR code generation
5. `backend/utils/pdf-generator.js` - PDF generation
6. `frontend/index.html` - Main page
7. `frontend/components/InvoiceForm.jsx` - Invoice form
8. `frontend/components/InvoiceList.jsx` - Invoice list
9. `frontend/styles/invoice.css` - Styling
10. `.env.example` - Environment variables
11. `database.sql` - Database schema
12. `package.json` - Dependencies

---

## ✅ Success Criteria (Phase 1)

- [ ] User can create invoice via web form
- [ ] ZATCA Phase 1 QR code generated correctly
- [ ] PDF exports as A4 with letterhead space
- [ ] Invoice saved to database
- [ ] User can retrieve & download past invoices
- [ ] Template system working
- [ ] Bilingual support (Arabic/English)
- [ ] Mobile-responsive design

