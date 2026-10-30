import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../../services/api";
import { Printer, ArrowLeft } from "lucide-react";
import "./BillGenerator.css";

export default function BillGenerator() {
  const { orderId } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (!active) return null;
        setLoading(true);
        return apiClient.get(`/bills/${orderId}`);
      })
      .then((response) => {
        if (!active || !response) return;
        setBill(response.data);
        setError(null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Failed to load bill");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="bill-loader">Loading bill...</div>;
  }

  if (error) {
    return <div className="bill-error">{error}</div>;
  }

  if (!bill) {
    return <div className="bill-error">Bill not found</div>;
  }

  return (
    <div className="bill-container">
      <div className="bill-toolbar no-print">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 hover:bg-slate-200"
        >
          <ArrowLeft size={16} /> Back to Orders
        </Link>
        <button className="btn-download" onClick={handlePrint}>
          <Printer size={18} /> Print / Save as PDF
        </button>
        <span className="text-sm text-slate-500">Choose “Save as PDF” in the print dialog.</span>
      </div>

      <div id="bill-content" className="bill-content">
        <div className="bill-header">
          <div className="company-info">
            <h1>{bill.company.name}</h1>
            <p>{bill.company.address}</p>
            <p>{bill.company.phone}</p>
            <p>{bill.company.email}</p>
            {bill.company.gstNumber && (
              <p>GST: {bill.company.gstNumber}</p>
            )}
          </div>
          <div className="bill-info">
            <div className="bill-title">INVOICE</div>
            <div className="bill-meta">
              <p><strong>Bill #:</strong> {bill.billNumber}</p>
              <p><strong>Date:</strong> {bill.billDate}</p>
            </div>
          </div>
        </div>

        <div className="customer-section">
          <div>
            <h3>BILL TO</h3>
            <p><strong>{bill.customer.name}</strong></p>
            <p>{bill.customer.address}</p>
            <p>{bill.customer.phone}</p>
            <p>{bill.customer.email}</p>
          </div>
        </div>

        <table className="bill-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="text-right">Quantity</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Discount</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.name}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">₹{item.unitPrice.toFixed(2)}</td>
                <td className="text-right">{item.discount}%</td>
                <td className="text-right">₹{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-totals">
          <div className="totals-row">
            <span>Subtotal:</span>
            <span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          <div className="totals-row">
            <span>Tax ({bill.gstRatePercent}% GST):</span>
            <span>₹{bill.tax.toFixed(2)}</span>
          </div>
          <div className="totals-row total">
            <span><strong>TOTAL</strong></span>
            <span><strong>₹{bill.total.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="bill-footer">
          <p>Thank you for your business!</p>
          <p>Please keep this invoice for your records.</p>
        </div>
      </div>
    </div>
  );
}
