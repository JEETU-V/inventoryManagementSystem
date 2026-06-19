import os

import pdfplumber
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from models import Product, Supplier, SupplierPdfItem, SupplierPdfUpload, db
from services.inventory_service import adjust_stock
from utils.errors import ApiError
from utils.permissions import role_required

supplier_pdf_bp = Blueprint("supplier_pdf", __name__)

ALLOWED_EXTENSIONS = {"pdf"}
UPLOAD_FOLDER = "uploads/supplier_pdfs"


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(file_path):
    try:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
        return text
    except Exception as error:
        raise ApiError(f"Error extracting PDF text: {error}", 400) from error


def parse_pdf_items(text):
    items = []
    for line in text.split("\n"):
        line = line.strip()
        if not line or len(line) < 5:
            continue

        parts = [part.strip() for part in line.split("|")]
        if len(parts) >= 2:
            try:
                product_name = parts[0]
                quantity = int(parts[1]) if len(parts) > 1 else 0
                unit_price = float(parts[2]) if len(parts) > 2 else None

                if quantity > 0:
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
@role_required("admin")
def upload_supplier_pdf(supplier_id):
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

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)

    try:
        pdf_text = extract_text_from_pdf(file_path)
        parsed_items = parse_pdf_items(pdf_text)

        pdf_upload = SupplierPdfUpload(
            supplier_id=supplier_id,
            filename=filename,
            file_path=file_path,
            total_items=len(parsed_items),
        )
        db.session.add(pdf_upload)
        db.session.flush()

        successfully_added = 0
        for item_data in parsed_items:
            product = Product.query.filter_by(
                name=item_data["product_name"],
                supplier_id=supplier_id,
            ).first()

            if not product:
                product = Product(
                    name=item_data["product_name"],
                    sku=f"PDF-{supplier_id}-{successfully_added + 1}",
                    supplier_id=supplier_id,
                    category="Imported",
                    purchase_price=item_data["unit_price"] or 0,
                    price=(item_data["unit_price"] or 0) * 1.3,
                    quantity=0,
                    reorder_level=10,
                )
                db.session.add(product)
                db.session.flush()
            else:
                if item_data["unit_price"]:
                    product.purchase_price = item_data["unit_price"]
                    product.price = item_data["unit_price"] * 1.3

            adjust_stock(
                product,
                "stock_in",
                item_data["quantity"],
                f"Supplier PDF upload - {filename}",
            )

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
            successfully_added += 1

        pdf_upload.successfully_added = successfully_added
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Successfully processed PDF. Added {successfully_added} items to inventory.",
            "pdfUploadId": pdf_upload.id,
            "totalItems": len(parsed_items),
            "successfullyAdded": successfully_added,
        }), 200

    except ApiError:
        db.session.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise
    except Exception as error:
        db.session.rollback()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise ApiError(f"Error processing PDF: {error}", 400) from error


@supplier_pdf_bp.get("/<int:supplier_id>/uploads")
@jwt_required()
def get_supplier_uploads(supplier_id):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        raise ApiError("Supplier not found", 404)

    uploads = SupplierPdfUpload.query.filter_by(supplier_id=supplier_id).all()
    return jsonify({
        "uploads": [
            {
                "id": upload.id,
                "filename": upload.filename,
                "uploadDate": upload.upload_date.isoformat(),
                "totalItems": upload.total_items,
                "successfullyAdded": upload.successfully_added,
                "status": upload.status,
            }
            for upload in uploads
        ]
    })


@supplier_pdf_bp.get("/uploads/<int:upload_id>/items")
@jwt_required()
def get_pdf_items(upload_id):
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
