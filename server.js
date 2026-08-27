/**
 * Saudi ZATCA QR Invoice SaaS - Backend Server
 * Phase 1: Basic invoice generation with QR codes
 * Framework: Express.js
 * Database: MySQL
 */

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const { generateZATCAQRCode } = require('./zatca-qrcode');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'saudi_invoice_saas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Error handling for pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * COMPANY ENDPOINTS
 */

// Get company details
app.get('/api/company', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM companies LIMIT 1');
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update company details
app.put('/api/company', async (req, res) => {
  try {
    const { name, tax_id, address, phone, email, bank_name, bank_account_number, bank_iban, bank_swift } = req.body;

    const connection = await pool.getConnection();
    
    // Check if company exists
    const [existing] = await connection.query('SELECT id FROM companies LIMIT 1');
    
    if (existing.length === 0) {
      // Create new company
      const [result] = await connection.query(
        'INSERT INTO companies (name, tax_id, address, phone, email, bank_name, bank_account_number, bank_iban, bank_swift) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, tax_id, address, phone, email, bank_name, bank_account_number, bank_iban, bank_swift]
      );
      connection.release();
      return res.json({ id: result.insertId, message: 'Company created successfully' });
    } else {
      // Update existing company
      await connection.query(
        'UPDATE companies SET name=?, tax_id=?, address=?, phone=?, email=?, bank_name=?, bank_account_number=?, bank_iban=?, bank_swift=? WHERE id=?',
        [name, tax_id, address, phone, email, bank_name, bank_account_number, bank_iban, bank_swift, existing[0].id]
      );
      connection.release();
      return res.json({ message: 'Company updated successfully' });
    }
  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * INVOICE ENDPOINTS
 */

// Create new invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const {
      invoice_number,
      customer_name,
      customer_tax_id,
      customer_address,
      invoice_date,
      due_date,
      items,
      vat_rate = 15,
      notes,
      payment_method
    } = req.body;

    const connection = await pool.getConnection();

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const vat_amount = (subtotal * vat_rate) / 100;
    const total_amount = subtotal + vat_amount;

    // Get company_id (for Phase 1, only one company)
    const [company] = await connection.query('SELECT id FROM companies LIMIT 1');
    const company_id = company[0]?.id || 1;

    // Insert invoice
    const [result] = await connection.query(
      `INSERT INTO invoices 
       (invoice_number, company_id, customer_name, customer_tax_id, customer_address, 
        invoice_date, due_date, subtotal, vat_amount, total_amount, vat_rate, notes, 
        payment_method, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number,
        company_id,
        customer_name,
        customer_tax_id,
        customer_address,
        invoice_date,
        due_date || null,
        subtotal,
        vat_amount,
        total_amount,
        vat_rate,
        notes,
        payment_method,
        'draft'
      ]
    );

    const invoiceId = result.insertId;

    // Insert line items
    for (const item of items) {
      await connection.query(
        `INSERT INTO invoice_items (invoice_id, description, unit_price, quantity, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [invoiceId, item.description, item.unit_price, item.quantity, item.unit_price * item.quantity]
      );
    }

    connection.release();

    res.json({
      id: invoiceId,
      invoice_number,
      status: 'draft',
      message: 'Invoice created successfully'
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [invoices] = await connection.query(
      `SELECT id, invoice_number, customer_name, invoice_date, total_amount, status 
       FROM invoices ORDER BY invoice_date DESC`
    );
    connection.release();
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get invoice details
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    const [invoices] = await connection.query(
      'SELECT * FROM invoices WHERE id = ?',
      [id]
    );

    if (invoices.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const [items] = await connection.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ?',
      [id]
    );

    connection.release();

    const invoice = invoices[0];
    invoice.items = items;

    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update invoice (draft only)
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_tax_id, customer_address, invoice_date, due_date, items, notes, payment_method } = req.body;

    const connection = await pool.getConnection();

    // Check if invoice is draft
    const [invoice] = await connection.query('SELECT status FROM invoices WHERE id = ?', [id]);
    
    if (invoice.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice[0].status !== 'draft') {
      connection.release();
      return res.status(400).json({ error: 'Only draft invoices can be updated' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const vat_amount = (subtotal * 15) / 100; // 15% VAT
    const total_amount = subtotal + vat_amount;

    // Update invoice
    await connection.query(
      `UPDATE invoices 
       SET customer_name=?, customer_tax_id=?, customer_address=?, invoice_date=?, 
           due_date=?, subtotal=?, vat_amount=?, total_amount=?, notes=?, payment_method=?
       WHERE id=?`,
      [customer_name, customer_tax_id, customer_address, invoice_date, due_date || null, subtotal, vat_amount, total_amount, notes, payment_method, id]
    );

    // Delete old items and insert new ones
    await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const item of items) {
      await connection.query(
        `INSERT INTO invoice_items (invoice_id, description, unit_price, quantity, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [id, item.description, item.unit_price, item.quantity, item.unit_price * item.quantity]
      );
    }

    connection.release();
    res.json({ message: 'Invoice updated successfully' });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Finalize invoice and generate QR code
app.post('/api/invoices/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    const [invoices] = await connection.query(
      'SELECT i.*, c.name as company_name, c.tax_id FROM invoices i JOIN companies c ON i.company_id = c.id WHERE i.id = ?',
      [id]
    );

    if (invoices.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Generate ZATCA QR Code
    const qrResult = generateZATCAQRCode({
      sellerName: invoice.company_name,
      sellerTin: invoice.tax_id,
      invoiceDateTime: new Date(invoice.invoice_date).toISOString(),
      totalAmount: parseFloat(invoice.total_amount),
      vatAmount: parseFloat(invoice.vat_amount)
    });

    // Update invoice with QR code data
    await connection.query(
      'UPDATE invoices SET qr_code_data = ?, status = ? WHERE id = ?',
      [qrResult.qrData, 'issued', id]
    );

    connection.release();

    res.json({
      message: 'Invoice finalized',
      invoiceId: id,
      qrCodeData: qrResult.qrData,
      metadata: qrResult.metadata
    });
  } catch (error) {
    console.error('Error finalizing invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete invoice (draft only)
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    // Check if invoice is draft
    const [invoice] = await connection.query('SELECT status FROM invoices WHERE id = ?', [id]);
    
    if (invoice.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice[0].status !== 'draft') {
      connection.release();
      return res.status(400).json({ error: 'Only draft invoices can be deleted' });
    }

    // Delete line items
    await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

    // Delete invoice
    await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

    connection.release();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * TEMPLATES ENDPOINTS
 */

// Create template
app.post('/api/templates', async (req, res) => {
  try {
    const { name, description, template_data, is_default } = req.body;
    const connection = await pool.getConnection();

    const [company] = await connection.query('SELECT id FROM companies LIMIT 1');
    const company_id = company[0]?.id || 1;

    const [result] = await connection.query(
      `INSERT INTO invoice_templates (company_id, name, description, template_data, is_default)
       VALUES (?, ?, ?, ?, ?)`,
      [company_id, name, description, JSON.stringify(template_data), is_default || false]
    );

    connection.release();
    res.json({ id: result.insertId, message: 'Template created successfully' });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [templates] = await connection.query('SELECT * FROM invoice_templates');
    
    // Parse template_data
    templates.forEach(t => {
      if (t.template_data) {
        t.template_data = JSON.parse(t.template_data);
      }
    });

    connection.release();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get template
app.get('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [templates] = await connection.query(
      'SELECT * FROM invoice_templates WHERE id = ?',
      [id]
    );

    connection.release();

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templates[0];
    if (template.template_data) {
      template.template_data = JSON.parse(template.template_data);
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update template
app.put('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, template_data, is_default } = req.body;
    const connection = await pool.getConnection();

    await connection.query(
      'UPDATE invoice_templates SET name=?, description=?, template_data=?, is_default=? WHERE id=?',
      [name, description, JSON.stringify(template_data), is_default || false, id]
    );

    connection.release();
    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete template
app.delete('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM invoice_templates WHERE id = ?', [id]);
    connection.release();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * HEALTH CHECK
 */

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Saudi Invoice SaaS server running on http://localhost:${PORT}`);
  console.log(`📊 Phase 1 - QR Code Invoice Generation`);
});

module.exports = app;
