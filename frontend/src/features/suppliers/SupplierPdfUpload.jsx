import { useState, useRef } from "react";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { apiClient } from "../../services/api";
import "./SupplierPdfUpload.css";

export default function SupplierPdfUpload({ supplierId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("Please select a PDF file");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        `/supplier-pdf/upload/${supplierId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUploadResult({
        success: true,
        message: response.data.message,
        totalItems: response.data.total_items,
        successfullyAdded: response.data.successfully_added,
      });

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload PDF");
      setUploadResult(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pdf-upload-container">
      <div className="pdf-upload-card">
        <h3>Upload Supplier Purchase PDF</h3>
        <p className="help-text">
          Upload a PDF containing your supplier purchase items. 
          Format: Product Name | Quantity | Unit Price (optional)
        </p>

        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          <button
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={24} />
            <span>
              {file ? file.name : "Choose PDF File"}
            </span>
          </button>

          {file && (
            <div className="file-info">
              <p className="file-name">{file.name}</p>
              <p className="file-size">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button
              className="alert-close"
              onClick={() => setError(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {uploadResult?.success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <div>
              <p>{uploadResult.message}</p>
              <p className="upload-stats">
                Items added: {uploadResult.successfullyAdded} / {uploadResult.totalItems}
              </p>
            </div>
            <button
              className="alert-close"
              onClick={() => setUploadResult(null)}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="upload-actions">
          {file && (
            <button
              className="btn-cancel"
              onClick={() => {
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={uploading}
            >
              Cancel
            </button>
          )}
          <button
            className="btn-upload"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading..." : "Upload & Process"}
          </button>
        </div>

        <div className="pdf-format-guide">
          <h4>📋 Expected PDF Format:</h4>
          <p>Your PDF should contain items in this format:</p>
          <pre>
Product Name | Quantity | Unit Price
Pen | 100 | 5.00
Notebook | 50 | 10.00
Pencil Set | 75 | 8.50
          </pre>
        </div>
      </div>
    </div>
  );
}
