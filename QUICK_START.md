# Saudi Invoice SaaS - Quick Start Guide

Get your ZATCA Phase 1 invoice application running in 5 minutes! 🚀

---

## ⚡ Prerequisites

- **Node.js** 16.x or higher ([Download](https://nodejs.org))
- **MySQL** 5.7 or higher ([Download](https://www.mysql.com/downloads/mysql/))
- **Git** (optional, for cloning)

---

## 🎯 Quick Start (Local Development)

### 1. Clone/Download Project
```bash
# Clone from Git
git clone https://github.com/yourusername/saudi-invoice-saas.git
cd saudi-invoice-saas

# Or download ZIP and extract
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up Database
```bash
# Create database and import schema
mysql -u root -p < database.sql

# Or manually in MySQL:
# 1. Open MySQL Workbench or CLI
# 2. Run: source database.sql;
```

### 4. Configure Environment
```bash
# Copy template to .env
cp .env.example .env

# Edit .env with your values
nano .env
# (Update DB_USER, DB_PASSWORD if different from root/no password)
```

**Minimal .env for local testing:**
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=saudi_invoice_saas
CORS_ORIGIN=*
JWT_SECRET=your-secret-key-here
```

### 5. Start Backend Server
```bash
# Start Node.js server
npm start

# You should see:
# ✅ Saudi Invoice SaaS server running on http://localhost:3000
```

### 6. Start Frontend (In another terminal)

#### Option A: React App
```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000 in browser
```

#### Option B: Simple HTML
Just open `frontend/index.html` in your browser

### 7. Test the Application
```bash
# Health check
curl http://localhost:3000/api/health

# Create company (optional)
curl -X PUT http://localhost:3000/api/company \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "tax_id": "300795366400003",
    "address": "My Address",
    "phone": "+966...",
    "email": "info@company.com",
    "bank_name": "My Bank",
    "bank_account_number": "1234567890",
    "bank_iban": "SA1234567890",
    "bank_swift": "XXXSARIX"
  }'
```

---

## 📱 Using the Application

### Creating an Invoice

1. **Navigate to Web App**
   - Go to http://localhost:3000 (React) or open frontend/index.html

2. **Click "New Invoice"**
   - Fill in customer details
   - Add line items (description, price, quantity)
   - System auto-calculates VAT (15%)
   - Click "Create Invoice"

3. **View Invoice List**
   - All invoices appear in the list
   - Click any invoice to view details

4. **Finalize & Generate QR Code**
   - Click "Finalize & Generate QR"
   - System creates ZATCA-compliant QR code
   - QR encodes: Company name, TIN, invoice amount, VAT

5. **Download PDF**
   - Click "Download PDF"
   - A4-sized PDF with QR code on right side
   - 80mm letterhead space on top

---

## 📂 Project Structure

```
saudi-invoice-saas/
├── server.js                    # Express backend
├── zatca-qrcode.js             # QR code generator
├── package.json                # Dependencies
├── .env.example               # Environment template
├── database.sql               # Database schema
├── QUICK_START.md             # This file
├── HOSTINGER_DEPLOYMENT_GUIDE.md
├── SAUDI_INVOICE_SAAS_ARCHITECTURE.md
│
├── frontend/
│   ├── index.html             # Simple HTML version
│   ├── InvoiceApp.jsx         # React component
│   └── styles/                # CSS
│
└── public/
    └── (static files)
```

---

## 🔑 Key API Endpoints

### Company Management
```
GET    /api/company               - Get company info
PUT    /api/company               - Update company info
```

### Invoice Operations
```
POST   /api/invoices              - Create new invoice
GET    /api/invoices              - List all invoices
GET    /api/invoices/:id          - Get invoice details
PUT    /api/invoices/:id          - Update invoice
DELETE /api/invoices/:id          - Delete invoice
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

---

## 📊 Sample Invoice Data

Use this test data to create your first invoice:

**Company:**
```
Name: Saudi Modern Packaging
Tax ID: 300795366400003
Address: Jeddah, Saudi Arabia
Bank: Riyadh Bank
IBAN: SA1320000001511074159940
```

**Customer:**
```
Name: Acme Corporation
Tax ID: 300123456789012 (or leave blank)
Address: Riyadh, Saudi Arabia
```

**Line Item:**
```
Description: Professional Services
Unit Price: 22,500 SAR
Quantity: 1
VAT: Auto-calculated (15%) = 3,375 SAR
Total: 25,875 SAR
```

---

## 🐛 Troubleshooting

### "Cannot find module 'mysql2'"
```bash
npm install mysql2
```

### "Port 3000 already in use"
```bash
# On Mac/Linux
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### "ECONNREFUSED - Cannot connect to database"
1. Check MySQL is running
2. Verify DB credentials in .env match
3. Ensure database exists: `SHOW DATABASES;`

### "CORS error in browser"
Update `.env`:
```env
CORS_ORIGIN=http://localhost:3000
```
Then restart server

### "QR Code not generating"
1. Ensure company tax_id is 15 digits
2. Check invoice_date is valid
3. Verify amounts are positive numbers

---

## 🎨 Customizing the Invoice Layout

Edit the invoice preview in `InvoiceApp.jsx`:

```jsx
// Change letterhead height (currently 80mm)
style={{ height: '80mm', borderBottom: '2px solid #ccc' }}

// Add company logo
<img src={company.logo_url} alt="Logo" style={{height: '30mm'}} />

// Change QR code size (currently 100px)
style={{ width: '100px', height: '100px' }}
```

---

## 🚀 Deploy to Hostinger

Once everything works locally:

1. Read **HOSTINGER_DEPLOYMENT_GUIDE.md**
2. Follow step-by-step instructions
3. Set up Node.js app in Hostinger cPanel
4. Import database to Hostinger MySQL
5. Upload code via Git or SFTP
6. Configure .env on Hostinger
7. Start application
8. Access via your domain

---

## 📋 Checklist Before Going Live

- [ ] All invoices generate valid QR codes
- [ ] PDF exports correctly (A4 with letterhead space)
- [ ] Database backups working
- [ ] HTTPS/SSL configured
- [ ] Company details set correctly
- [ ] Email notifications tested (Phase 1.5)
- [ ] Performance tested with multiple invoices
- [ ] Error handling verified
- [ ] Audit logs working

---

## 💡 Tips & Tricks

### Generate Test Data
```javascript
// Add to server.js temporarily to create test invoices
const testInvoice = {
  invoice_number: `INV${Date.now()}`,
  customer_name: "Test Customer",
  invoice_date: new Date().toISOString().split('T')[0],
  items: [
    { description: "Test Service", unit_price: 1000, quantity: 1 }
  ]
};
```

### Export All Invoices to CSV
```bash
mysql -u root -p saudi_invoice_saas \
  -e "SELECT * FROM invoices" \
  > invoices_export.csv
```

### Reset Database
```bash
mysql -u root -p -e "DROP DATABASE saudi_invoice_saas;"
mysql -u root -p < database.sql
```

---

## 🔒 Security Notes

### Before Production:
1. Change all default passwords
2. Set strong JWT_SECRET
3. Enable HTTPS
4. Configure firewall
5. Disable debug logging
6. Set NODE_ENV=production
7. Implement rate limiting
8. Add authentication (Phase 1.5)

---

## 📞 Need Help?

### Documentation
- Architecture: See `SAUDI_INVOICE_SAAS_ARCHITECTURE.md`
- Deployment: See `HOSTINGER_DEPLOYMENT_GUIDE.md`
- API Docs: Check inline comments in `server.js`

### Testing
- Test API endpoints with [Postman](https://www.postman.com)
- Check browser console for frontend errors
- Review server logs for backend issues

### Common Issues
- MySQL connection: Verify credentials and service running
- Port conflicts: Change PORT in .env
- Module errors: Run `npm install` again
- Database errors: Re-import schema

---

## 🎯 What's Next?

### Phase 1 (Current)
- ✅ Invoice generation
- ✅ QR code generation
- ✅ PDF export
- ✅ Template management

### Phase 1.5
- 📧 Email delivery
- 👤 User authentication
- 🖼️ Company logos
- 📊 Invoice history/filtering

### Phase 2
- 🔐 Digital signatures
- 📤 ZATCA submission
- ✔️ CSID registration
- 🔗 API integrations

---

## 📄 License

MIT License - See LICENSE file

---

## 👥 Contributing

Found a bug? Have a feature idea?
1. Create an issue
2. Fork the repository
3. Submit a pull request

---

**Made with ❤️ for Saudi Arabia's e-invoicing compliance**

Last Updated: August 2025

