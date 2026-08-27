/**
 * ZATCA Phase 1 QR Code Generator
 * Generates TLV (Tag-Length-Value) encoded QR codes for Saudi invoices
 * 
 * Reference: https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx
 */

const crypto = require('crypto');

class ZATCAQRCode {
  constructor(invoiceData) {
    this.sellerName = invoiceData.sellerName;
    this.sellerTin = invoiceData.sellerTin;
    this.invoiceDateTime = invoiceData.invoiceDateTime; // ISO 8601 format
    this.totalAmount = invoiceData.totalAmount; // Total including VAT
    this.vatAmount = invoiceData.vatAmount;
  }

  /**
   * Encode string to TLV format
   * @param {number} tag - Tag number (1-5)
   * @param {string|number} value - Value to encode
   * @returns {Buffer} - Encoded TLV
   */
  encodeTLV(tag, value) {
    let valueBuffer;

    if (typeof value === 'string') {
      valueBuffer = Buffer.from(value, 'utf-8');
    } else if (typeof value === 'number') {
      // For numbers, convert to string then to buffer
      valueBuffer = Buffer.from(value.toString(), 'utf-8');
    } else {
      valueBuffer = value;
    }

    const tagBuffer = Buffer.from([tag]);
    const lengthBuffer = Buffer.from([valueBuffer.length]);

    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
  }

  /**
   * Generate ZATCA Phase 1 QR Code Data
   * @returns {string} - Base64 encoded QR data
   */
  generateQRData() {
    try {
      let tlvData = Buffer.alloc(0);

      // Tag 01: Seller Name
      tlvData = Buffer.concat([
        tlvData,
        this.encodeTLV(0x01, this.sellerName)
      ]);

      // Tag 02: Seller TIN (Tax Identification Number)
      tlvData = Buffer.concat([
        tlvData,
        this.encodeTLV(0x02, this.sellerTin)
      ]);

      // Tag 03: Invoice DateTime (YYYYMMDDHHMMSS format)
      const formattedDateTime = this.formatDateTime(this.invoiceDateTime);
      tlvData = Buffer.concat([
        tlvData,
        this.encodeTLV(0x03, formattedDateTime)
      ]);

      // Tag 04: Invoice Total Amount (including VAT)
      tlvData = Buffer.concat([
        tlvData,
        this.encodeTLV(0x04, this.formatAmount(this.totalAmount))
      ]);

      // Tag 05: Total VAT Amount
      tlvData = Buffer.concat([
        tlvData,
        this.encodeTLV(0x05, this.formatAmount(this.vatAmount))
      ]);

      // Convert to Base64 for QR encoding
      return tlvData.toString('base64');
    } catch (error) {
      throw new Error(`Failed to generate QR data: ${error.message}`);
    }
  }

  /**
   * Format datetime to ZATCA format (YYYYMMDDHHMMSS)
   * @param {string} dateTimeString - ISO 8601 format
   * @returns {string} - Formatted datetime
   */
  formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Format amount to 2 decimal places
   * @param {number} amount
   * @returns {string}
   */
  formatAmount(amount) {
    return (Math.round(amount * 100) / 100).toFixed(2);
  }

  /**
   * Validate invoice data
   * @returns {object} - {valid: boolean, errors: string[]}
   */
  validate() {
    const errors = [];

    if (!this.sellerName || this.sellerName.trim().length === 0) {
      errors.push('Seller name is required');
    }

    if (!this.sellerTin || this.sellerTin.trim().length === 0) {
      errors.push('Seller TIN is required');
    }

    if (!/^\d{15}$/.test(this.sellerTin)) {
      errors.push('Seller TIN must be 15 digits');
    }

    if (!this.invoiceDateTime) {
      errors.push('Invoice date/time is required');
    }

    if (this.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (this.vatAmount < 0) {
      errors.push('VAT amount cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate complete QR code object
   * @returns {object} - Contains QR data, validation, and metadata
   */
  generate() {
    const validation = this.validate();

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return {
      success: true,
      qrData: this.generateQRData(),
      metadata: {
        sellerName: this.sellerName,
        sellerTin: this.sellerTin,
        invoiceDateTime: this.invoiceDateTime,
        totalAmount: this.totalAmount,
        vatAmount: this.vatAmount,
        version: '1.0', // ZATCA Phase 1
        generatedAt: new Date().toISOString()
      },
      validation: {
        valid: true,
        errors: []
      }
    };
  }
}

/**
 * Helper function to create QR code from invoice data
 * @param {object} invoiceData
 * @returns {object}
 */
function generateZATCAQRCode(invoiceData) {
  const qrGenerator = new ZATCAQRCode(invoiceData);
  return qrGenerator.generate();
}

module.exports = {
  ZATCAQRCode,
  generateZATCAQRCode
};

// Example usage:
/*
const invoiceData = {
  sellerName: "Saudi Modern Packaging Co Ltd",
  sellerTin: "300795366400003",
  invoiceDateTime: "2025-08-15T10:30:00Z",
  totalAmount: 25875,
  vatAmount: 3375
};

try {
  const result = generateZATCAQRCode(invoiceData);
  console.log('QR Code generated successfully');
  console.log('QR Data (Base64):', result.qrData);
} catch (error) {
  console.error('Error generating QR code:', error.message);
}
*/
