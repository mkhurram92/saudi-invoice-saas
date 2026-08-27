# Saudi Invoice SaaS - Hostinger Deployment Guide (Phase 1)

## 📋 Prerequisites

Before you start, ensure you have:
- Hostinger account with Node.js support
- cPanel access (Hostinger provides this)
- Domain name configured
- Basic knowledge of Node.js and MySQL

---

## 🚀 Step-by-Step Deployment on Hostinger

### STEP 1: Set Up Node.js Application in Hostinger

1. **Log into Hostinger cPanel**
   - Go to https://hpanel.hostinger.com
   - Navigate to **Web Development** → **Node.js**

2. **Create Node.js Application**
   - Click **Create Application**
   - **Node.js Version**: Select `18.x` or `20.x`
   - **Application Name**: `saudi-invoice-saas`
   - **Application URL**: Choose your domain (e.g., `invoices.yourdomain.com`)
   - **Application Root Path**: Leave as default or set to `public/`
   - **Application Startup File**: `server.js`
   - **Port**: Hostinger will assign (usually 3000+)

3. **Note the following information** (you'll need it later):
   - Application URL
   - Port number
   - SSH/SFTP credentials

---

### STEP 2: Set Up MySQL Database

1. **Create Database in Hostinger**
   - Go to **Databases** → **MySQL**
   - Click **Create Database**
   - **Database Name**: `saudi_invoice_saas`
   - **Database User**: Create new user (e.g., `invoice_user`)
   - **Password**: Generate strong password (copy this!)

2. **Grant All Privileges**
   - Select the user and database
   - Check all privilege boxes
   - Click **Change Privileges**

3. **Note these credentials**:
   ```
   Database Host: localhost
   Database Name: saudi_invoice_saas
   Database User: your_user_here
   Database Password: your_password_here
   ```

---

### STEP 3: Import Database Schema

1. **Connect via SSH** (or use cPanel File Manager)
   ```bash
   ssh -p 22 username@yourdomain.com
   ```

2. **Upload database.sql** via SFTP or File Manager
   - Location: `/home/username/public_html/` or your app root

3. **Import the schema**:
   ```bash
   mysql -u invoice_user -p saudi_invoice_saas < database.sql
   ```
   - Enter password when prompted

4. **Verify tables created**:
   ```bash
   mysql -u invoice_user -p saudi_invoice_saas -e "SHOW TABLES;"
   ```
   - You should see: `companies`, `invoices`, `invoice_items`, `invoice_templates`, `audit_log`

---

### STEP 4: Upload Application Code

#### Option A: Using Git (Recommended)

1. **Create GitHub Repository**
   - Push your code to GitHub
   - Keep `.env` and `node_modules/` in `.gitignore`

2. **Clone to Hostinger**
   ```bash
   ssh username@yourdomain.com
   cd /home/username/nodesjs/saudi-invoice-saas/
   git clone https://github.com/yourrepo/saudi-invoice-saas.git .
   ```

#### Option B: Using SFTP

1. **Connect via SFTP**
   - Use Filezilla or similar
   - Upload all files to `/home/username/nodesjs/saudi-invoice-saas/`
   - Exclude: `node_modules/`, `.env`, `.git/`

---

### STEP 5: Configure Environment Variables

1. **Create .env file**
   ```bash
   ssh username@yourdomain.com
   cd /home/username/nodesjs/saudi-invoice-saas/
   nano .env
   ```

2. **Paste the following** (update with your values):
   ```env
   NODE_ENV=production
   PORT=3000
   
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=invoice_user
   DB_PASSWORD=your_mysql_password_here
   DB_NAME=saudi_invoice_saas
   
   APP_NAME=Saudi Invoice SaaS
   CORS_ORIGIN=https://yourdomain.com
   
   JWT_SECRET=generate_a_random_string_here
   ```

3. **Save** (Ctrl+X, then Y, then Enter)

---

### STEP 6: Install Dependencies

1. **Via SSH**
   ```bash
   cd /home/username/nodesjs/saudi-invoice-saas/
   npm install
   ```

2. **Or via Hostinger Panel**
   - Go to **Node.js** → Your Application
   - Click **Install Dependencies**
   - Wait for completion (may take 2-3 minutes)

---

### STEP 7: Start Your Application

1. **Via Hostinger Panel**
   - Go to **Node.js** → Your Application
   - Click **Start Application**
   - Status should show "Running"

2. **Or via SSH**
   ```bash
   cd /home/username/nodesjs/saudi-invoice-saas/
   npm start
   ```

3. **Verify it's running**
   ```bash
   curl http://localhost:YOUR_PORT/api/health
   ```
   - Should return: `{"status":"Server is running"}`

---

### STEP 8: Configure SSL Certificate (HTTPS)

1. **Hostinger Auto SSL**
   - Go to **Security** → **SSL/TLS**
   - Click **Manage** on your domain
   - Auto SSL should be enabled (free from Hostinger)
   - Wait 5-15 minutes for activation

2. **Force HTTPS**
   - Add to your Nginx config (via cPanel if available):
   ```nginx
   return 301 https://$server_name$request_uri;
   ```

---

### STEP 9: Test Your Application

1. **Visit your domain**
   ```
   https://invoices.yourdomain.com
   ```

2. **Test the API**
   ```bash
   curl https://invoices.yourdomain.com/api/health
   ```

3. **Create a test company** via API:
   ```bash
   curl -X PUT https://invoices.yourdomain.com/api/company \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Your Company",
       "tax_id": "300795366400003",
       "address": "Your Address",
       "phone": "+966...",
       "email": "info@company.com",
       "bank_name": "Riyadh Bank",
       "bank_account_number": "1511074159940",
       "bank_iban": "SA1320000001511074159940",
       "bank_swift": "RIBLSARI151"
     }'
   ```

---

## 🔧 Hostinger-Specific Configurations

### Increase Node.js Memory Limit
If you get out-of-memory errors:

1. Via SSH:
   ```bash
   # Edit Hostinger Node.js config
   export NODE_OPTIONS="--max-old-space-size=512"
   npm start
   ```

2. Or add to `.env`:
   ```env
   NODE_OPTIONS=--max-old-space-size=512
   ```

### Enable Gzip Compression
In `server.js`, add:
```javascript
const compression = require('compression');
app.use(compression());
```

### Configure Nginx Reverse Proxy (if available)
Hostinger automatically handles this, but ensure:
- Proxy passes to correct Node.js port
- Headers are forwarded correctly

---

## 📊 Database Backup on Hostinger

### Automated Backups
1. Go to **Databases** → **MySQL**
2. Select your database
3. Click **Backup** to create manual backup
4. Backups are stored in cPanel

### Manual Backup via SSH
```bash
mysqldump -u invoice_user -p saudi_invoice_saas > backup_$(date +%Y%m%d).sql
```

### Restore Backup
```bash
mysql -u invoice_user -p saudi_invoice_saas < backup_20250815.sql
```

---

## 🚨 Troubleshooting

### Application Won't Start
1. Check Node.js version:
   ```bash
   node --version
   ```

2. Check logs in Hostinger panel or:
   ```bash
   cd /home/username/nodesjs/saudi-invoice-saas/
   cat server.js | grep -i "console.error"
   ```

3. Verify .env file exists:
   ```bash
   cat .env | head -5
   ```

### Database Connection Error
1. Test MySQL connection:
   ```bash
   mysql -h localhost -u invoice_user -p -e "USE saudi_invoice_saas; SHOW TABLES;"
   ```

2. Verify credentials in .env match

3. Check MySQL is running:
   ```bash
   mysqladmin -u invoice_user -p ping
   ```

### CORS Errors in Browser
1. Update `.env`:
   ```env
   CORS_ORIGIN=https://yourdomain.com
   ```

2. Restart application:
   - Via Hostinger panel: Click **Restart**
   - Via SSH: Stop and start the app

### Port Already in Use
1. Find process using port:
   ```bash
   lsof -i :3000
   ```

2. Kill process:
   ```bash
   kill -9 PID
   ```

3. Or let Hostinger assign different port automatically

---

## 📈 Performance Optimization

### Database Optimization
```bash
# Connect to MySQL
mysql -u invoice_user -p saudi_invoice_saas

# Optimize tables
OPTIMIZE TABLE invoices;
OPTIMIZE TABLE invoice_items;
```

### Enable Query Caching (if available)
In `.my.cnf`:
```ini
query_cache_size=64M
query_cache_type=1
```

### Connection Pool Tuning
In `.env`:
```env
DB_CONNECTION_LIMIT=20
```

---

## 🔒 Security Checklist

- [ ] Change default MySQL user password
- [ ] Set strong JWT_SECRET in .env
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Configure firewall to block direct port access
- [ ] Keep Node.js and npm updated
- [ ] Use environment variables for sensitive data
- [ ] Enable rate limiting in production
- [ ] Regular backups (weekly at minimum)
- [ ] Monitor error logs
- [ ] Disable debug mode in production

---

## 📝 Monitoring & Logs

### View Application Logs
1. **Via Hostinger Panel**
   - Go to **Node.js** → Your Application
   - Click **Logs**

2. **Via SSH**
   ```bash
   cd /home/username/nodesjs/saudi-invoice-saas/
   tail -f logs/app.log
   ```

### Set Up Error Monitoring (Optional)
Consider services like:
- Sentry.io (Error tracking)
- Loggly (Log aggregation)
- NewRelic (Performance monitoring)

---

## 🚀 Next Steps (Phase 1.5 & 2)

### Phase 1.5 (Quick Additions)
- [ ] Add email invoice delivery
- [ ] Implement user authentication
- [ ] Add company logo support
- [ ] Invoice template management UI

### Phase 2 (Digital Signatures)
- [ ] CSID registration with ZATCA
- [ ] Digital certificate integration
- [ ] e-Invoicing submission
- [ ] Signed QR codes

---

## 📞 Support & Resources

### Hostinger Resources
- [Hostinger Node.js Support](https://support.hostinger.com/en/articles/6637596)
- [cPanel Documentation](https://cpanel.net/docs/)
- [Hostinger Knowledgebase](https://support.hostinger.com)

### ZATCA Resources
- [ZATCA Official Portal](https://zatca.gov.sa)
- [ZATCA E-Invoicing Documentation](https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx)
- [QR Code Specification](https://zatca.gov.sa/en/E-Invoicing/Guidelines/Documents/QR%20Code%20Specification%20-%20English%20v1.0.pdf)

### Community
- Stack Overflow: Tag with `zatca` and `qrcode`
- Saudi Developer Community Forums

---

## 📄 Version History

- **v1.0.0** (Aug 2025): Initial Phase 1 release
  - Basic invoice generation
  - ZATCA Phase 1 QR codes
  - Hostinger deployment

---

**Last Updated**: August 2025  
**Maintained By**: Your Team  
**License**: MIT

