import os
import pdfplumber
from flask import Blueprint, jsonify, request, current_app
from werkzeug.utils import secure_filename
from datetime import date

from models import Supplier, SupplierPdfUpload, SupplierPdfItem, Product, db, InventoryTransaction
from utils.errors import ApiError

supplier_pdf_bp = Blueprint("supplier_pdf", __name__)

ALLOWED_EXTENSIONS = {"pdf"}
UPLOAD_FOLDER = "uploads/supplier_pdfs"


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(file_path):
    """Extract text content from PDF"""
    try:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise ApiError(f"Error extracting PDF text: {str(e)}", 400)


def parse_pdf_items(text):
    """
    Parse items from PDF text
    Expects format like:
    Product Name | Quantity | Unit Price
    Item 1 | 10 | 5.00
    Item 2 | 20 | 3.50
    """
    items = []
    lines = text.split("\n")
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue
        
        # Try to parse line as product data
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 2:
            try:
                product_name = parts[0]
                quantity = int(parts[1]) if len(parts) > 1 else 0
                unit_price = float(parts[2]) if len(parts) > 2 else None
                
                if quantity > 0:  # Only add valid items
                    items.append({
                        "product_name": product_name,
                        "quantity": quantity,
                        "unit_price": unit_price,
                        "description": " | ".join(parts[3:]) if len(parts) > 3 else "",
                    })
            except (ValueError, IndexError):
                continue
    
    return items


@supplier_pdf_bp.post("/upload/<int:supplier_id>")
def upload_supplier_pdf(supplier_id):
    """Upload and process supplier PDF"""
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        raise ApiError("Supplier not found", 404)

    if "file" not in request.files:
        raise ApiError("No file provided", 400)

    file = request.files["file"]
    if file.filename == "":
        raise ApiError("No file selected", 400)

    if not allowed_file(file.filename):
        raise ApiError("Only PDF files are allowed", 400)

    # Create uploads directory if it doesn't exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    try:
        # Extract text from PDF
        pdf_text = extract_text_from_pdf(file_path)
        
        # Parse items from PDF
        parsed_items = parse_pdf_items(pdf_text)

        # Create PDF upload record
        pdf_upload = SupplierPdfUpload(
            supplier_id=supplier_id,
            filename=filename,
            file_path=file_path,
            total_items=len(parsed_items),
        )
        db.session.add(pdf_upload)
        db.session.flush()  # Flush to get the ID

        # Add items to database
        successfully_added = 0
        for item_data in parsed_items:
            # Check if product already exists
            product = Product.query.filter_by(
                name=item_data["product_name"],
                supplier_id=supplier_id
            ).first()

            if not product:
                # Create new product
                product = Product(
                    name=item_data["product_name"],
                    sku=f"{supplier_id}-{len(Product.query.filter_by(supplier_id=supplier_id).all())+1}",
                    supplier_id=supplier_id,
                    category="Imported",
                    purchase_price=item_data["unit_price"] or 0,
                    price=item_data["unit_price"] * 1.3 if item_data["unit_price"] else 0,  # 30% markup
                    quantity=item_data["quantity"],
                    reorder_level=10,
                )
                db.session.add(product)
                db.session.flush()
            else:
                # Update existing product quantity
                product.quantity += item_data["quantity"]

            # Create PDF item record
            pdf_item = SupplierPdfItem(
                pdf_upload_id=pdf_upload.id,
                product_name=item_data["product_name"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                description=item_data.get("description"),
                added_to_inventory=True,
                product_id=product.id,
            )
            db.session.add(pdf_item)

            # Create inventory transaction
            transaction = InventoryTransaction(
                product_id=product.id,
                transaction_type="Purchase",
                quantity=item_data["quantity"],
                reason=f"Supplier PDF Upload - {filename}",
                date=date.today(),
            )
            db.session.add(transaction)
            successfully_added += 1

        pdf_upload.successfully_added = successfully_added
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Successfully processed PDF. Added {successfully_added} items to inventory.",
            "pdf_upload_id": pdf_upload.id,
            "total_items": len(parsed_items),
            "successfully_added": successfully_added,
        }), 200

    except Exception as e:
        db.session.rollback()
        # Clean up file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise ApiError(f"Error processing PDF: {str(e)}", 400)


@supplier_pdf_bp.get("/<int:supplier_id>/uploads")
def get_supplier_uploads(supplier_id):
    """Get all PDF uploads for a supplier"""
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        raise ApiError("Supplier not found", 404)

    uploads = SupplierPdfUpload.query.filter_by(supplier_id=supplier_id).all()
    return jsonify({
        "uploads": [
            {
                "id": u.id,
                "filename": u.filename,
                "uploadDate": u.upload_date.isoformat(),
                "totalItems": u.total_items,
                "successfullyAdded": u.successfully_added,
                "status": u.status,
            }
            for u in uploads
        ]
    })


@supplier_pdf_bp.get("/uploads/<int:upload_id>/items")
def get_pdf_items(upload_id):
    """Get items from a specific PDF upload"""
    upload = SupplierPdfUpload.query.get(upload_id)
    if not upload:
        raise ApiError("Upload not found", 404)

    items = SupplierPdfItem.query.filter_by(pdf_upload_id=upload_id).all()
    return jsonify({
        "items": [
            {
                "id": item.id,
                "productName": item.product_name,
                "quantity": item.quantity,
                "unitPrice": float(item.unit_price) if item.unit_price else 0,
                "addedToInventory": item.added_to_inventory,
                "productId": item.product_id,
            }
            for item in items
        ]
    })
