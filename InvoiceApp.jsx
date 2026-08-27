/**
 * Saudi ZATCA QR Invoice SaaS - Frontend Application
 * React Component for Invoice Management
 */

import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export default function InvoiceApp() {
  const [currentPage, setCurrentPage] = useState('list'); // 'list', 'create', 'view'
  const [invoices, setInvoices] = useState([]);
  const [company, setCompany] = useState(null);
  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_name: '',
    customer_tax_id: '',
    customer_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    items: [{ description: '', unit_price: 0, quantity: 1 }],
    notes: '',
    payment_method: 'bank_transfer'
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const invoicePreviewRef = useRef(null);

  // Fetch data on mount
  useEffect(() => {
    fetchCompany();
    fetchInvoices();
    generateInvoiceNumber();
  }, []);

  const fetchCompany = async () => {
    try {
      const response = await fetch(`${API_BASE}/company`);
      const data = await response.json();
      setCompany(data);
    } catch (error) {
      console.error('Error fetching company:', error);
      // Company might not exist yet, that's ok for Phase 1
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`${API_BASE}/invoices`);
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
    setFormData(prev => ({
      ...prev,
      invoice_number: `INV${year}${month}${random}`
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', unit_price: 0, quantity: 1 }]
    }));
  };

  const removeLineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const vat = subtotal * 0.15; // 15% VAT
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      alert('Invoice created successfully!');
      setCurrentPage('list');
      fetchInvoices();
      resetForm();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  const finalizeInvoice = async (invoiceId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/invoices/${invoiceId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      alert('Invoice finalized with QR code!');
      fetchInvoices();
    } catch (error) {
      console.error('Error finalizing invoice:', error);
      alert('Error finalizing invoice');
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${invoiceId}`);
      const invoice = await response.json();
      setSelectedInvoice(invoice);
      setCurrentPage('view');
    } catch (error) {
      console.error('Error fetching invoice:', error);
    }
  };

  const generatePDF = async () => {
    if (!invoicePreviewRef.current) return;

    try {
      setLoading(true);
      const canvas = await html2canvas(invoicePreviewRef.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${selectedInvoice.invoice_number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      customer_name: '',
      customer_tax_id: '',
      customer_address: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      items: [{ description: '', unit_price: 0, quantity: 1 }],
      notes: '',
      payment_method: 'bank_transfer'
    });
    generateInvoiceNumber();
  };

  const { subtotal, vat, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">🇸🇦 Saudi Invoice SaaS</h1>
          <p className="text-gray-600">ZATCA Phase 1 QR Code Compliance</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
          <button
            onClick={() => { setCurrentPage('list'); fetchInvoices(); }}
            className={`px-4 py-2 rounded font-medium ${
              currentPage === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📋 Invoices
          </button>
          <button
            onClick={() => { setCurrentPage('create'); resetForm(); }}
            className={`px-4 py-2 rounded font-medium ${
              currentPage === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ➕ New Invoice
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* LIST PAGE */}
        {currentPage === 'list' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
            </div>

            {invoices.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <p>No invoices yet. Create your first invoice!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map(invoice => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-blue-600 cursor-pointer hover:underline"
                            onClick={() => viewInvoice(invoice.id)}>
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{invoice.customer_name}</td>
                        <td className="px-6 py-4 text-gray-700">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          SAR {parseFloat(invoice.total_amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            invoice.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            invoice.status === 'issued' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => viewInvoice(invoice.id)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CREATE PAGE */}
        {currentPage === 'create' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Create Invoice</h2>
            </div>

            <form onSubmit={createInvoice} className="p-6 space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Date *</label>
                  <input
                    type="date"
                    name="invoice_date"
                    value={formData.invoice_date}
                    onChange={handleFormChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleFormChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name *</label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleFormChange}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tax ID (TIN)</label>
                    <input
                      type="text"
                      name="customer_tax_id"
                      value={formData.customer_tax_id}
                      onChange={handleFormChange}
                      placeholder="15-digit number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">Customer Address</label>
                  <textarea
                    name="customer_address"
                    value={formData.customer_address}
                    onChange={handleFormChange}
                    rows="3"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Description *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="Item description"
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Unit Price *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                        <input
                          type="number"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          required
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-6 bg-gray-50 p-6 rounded-lg">
                <div className="flex justify-end max-w-xs space-y-2">
                  <div className="flex justify-between w-full">
                    <span className="font-medium text-gray-700">Subtotal:</span>
                    <span className="text-gray-900">SAR {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-full">
                    <span className="font-medium text-gray-700">VAT (15%):</span>
                    <span className="text-gray-900">SAR {vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between w-full border-t-2 border-gray-300 pt-2">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-blue-600">SAR {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Payment */}
              <div className="border-t pt-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleFormChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                      <option value="credit">Credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      rows="2"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="border-t pt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Invoice'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('list')}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW PAGE */}
        {currentPage === 'view' && selectedInvoice && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Invoice {selectedInvoice.invoice_number}</h2>
              <div className="flex gap-4">
                {selectedInvoice.status === 'draft' && (
                  <button
                    onClick={() => finalizeInvoice(selectedInvoice.id)}
                    disabled={loading}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Finalizing...' : 'Finalize & Generate QR'}
                  </button>
                )}
                {selectedInvoice.status === 'issued' && (
                  <button
                    onClick={generatePDF}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Download PDF'}
                  </button>
                )}
                <button
                  onClick={() => setCurrentPage('list')}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Back
                </button>
              </div>
            </div>

            {/* Invoice Preview */}
            <InvoicePreview
              ref={invoicePreviewRef}
              invoice={selectedInvoice}
              company={company}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Invoice Preview Component - A4 Format
 */
const InvoicePreview = React.forwardRef(({ invoice, company }, ref) => {
  const [qrImage, setQrImage] = useState(null);

  useEffect(() => {
    if (invoice.qr_code_data) {
      QRCode.toDataURL(invoice.qr_code_data, { width: 100 })
        .then(url => setQrImage(url))
        .catch(err => console.error('Error generating QR:', err));
    }
  }, [invoice.qr_code_data]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-lg shadow p-8"
      style={{ width: '210mm', margin: '0 auto', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}
    >
      {/* Letterhead Space */}
      <div className="h-20 border-b-2 border-gray-300 mb-6 flex items-center text-gray-400 text-sm">
        📄 Letterhead Space (80mm) - User prints company letterhead here
      </div>

      {/* Header */}
      <div className="grid grid-cols-3 gap-8 mb-8 text-sm">
        <div>
          <p className="font-bold text-lg mb-2">فاتورة ضريبية</p>
          <p className="font-bold text-lg">TAX INVOICE</p>
        </div>
        <div></div>
        <div className="text-right">
          {qrImage && (
            <div className="flex flex-col items-end gap-2">
              <img src={qrImage} alt="QR Code" style={{ width: '100px', height: '100px' }} />
              <p className="text-xs text-gray-600">ZATCA QR Code</p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div>
          <p><span className="font-bold">رقم الفاتورة :</span> {invoice.invoice_number}</p>
          <p><span className="font-bold">Invoice Number:</span> {invoice.invoice_number}</p>
          <p className="mt-2"><span className="font-bold">تاريخ الفاتورة :</span> {new Date(invoice.invoice_date).toLocaleDateString('ar-SA')}</p>
          <p><span className="font-bold">Invoice Date:</span> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          {company && (
            <>
              <p className="font-bold">{company.name}</p>
              <p><span className="font-bold">رقم ضريبة :</span> {company.tax_id}</p>
              <p><span className="font-bold">Tax ID:</span> {company.tax_id}</p>
              <p className="mt-2 text-xs">{company.address}</p>
            </>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="mb-8 text-sm">
        <p className="font-bold mb-2">Bill To / الفاتورة لـــــــ :</p>
        <p><strong>{invoice.customer_name}</strong></p>
        {invoice.customer_tax_id && <p>Tax ID: {invoice.customer_tax_id}</p>}
        <p className="text-xs">{invoice.customer_address}</p>
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-8 text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-400">
            <th className="text-left py-2 font-bold">Description / الوصف</th>
            <th className="text-center py-2 font-bold">Qty / العدد</th>
            <th className="text-right py-2 font-bold">Unit Price / السعر</th>
            <th className="text-right py-2 font-bold">Total / الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items && invoice.items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="py-3">{item.description}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">SAR {parseFloat(item.unit_price).toFixed(2)}</td>
              <td className="text-right">SAR {parseFloat(item.total_price).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-64 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span>Subtotal / الإجمالي :</span>
            <span>SAR {(parseFloat(invoice.total_amount) - parseFloat(invoice.vat_amount)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-300">
            <span>VAT (15%) / ضريبة :</span>
            <span>SAR {parseFloat(invoice.vat_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-base">
            <span>Total / الإجمالي الكلي :</span>
            <span className="text-blue-600">SAR {parseFloat(invoice.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      {company && (
        <div className="mb-8 text-sm border-t-2 border-gray-300 pt-4">
          <p className="font-bold mb-2">طريقة الدفع / Payment Details:</p>
          <p><strong>Bank:</strong> {company.bank_name}</p>
          <p><strong>Account:</strong> {company.bank_account_number}</p>
          <p><strong>IBAN:</strong> {company.bank_iban}</p>
          <p><strong>SWIFT:</strong> {company.bank_swift}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-gray-600 border-t border-gray-300 pt-4 mt-8">
        <p>ZATCA Phase 1 Compliant | Generated on {new Date().toLocaleString()}</p>
        <p>For questions, please contact: {company?.email || 'support@example.com'}</p>
      </div>
    </div>
  );
});

InvoicePreview.displayName = 'InvoicePreview';
