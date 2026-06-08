import re
from datetime import datetime
from flask import Flask, jsonify, request, render_template
from database import LibraryDatabase

app = Flask(__name__)
db = LibraryDatabase()

# --- VALIDATION HELPER FUNCTIONS ---

def validate_book_data(data):
    """
    Validates Book management input parameters.
    Returns (is_valid, error_message)
    """
    title = data.get("title", "").strip()
    author = data.get("author", "").strip()
    isbn = data.get("isbn", "").strip()
    published_year = data.get("published_year")
    quantity = data.get("quantity")

    if not title:
        return False, "Book Title is required and cannot be empty."
    if len(title) < 2:
        return False, "Book Title must be at least 2 characters long."
        
    if not author:
        return False, "Author name is required and cannot be empty."
    if len(author) < 2:
        return False, "Author name must be at least 2 characters long."

    if not isbn:
        return False, "ISBN number is required and cannot be empty."
    # Basic ISBN format check: digits and hyphens only, length between 10 and 17
    isbn_clean = isbn.replace("-", "").replace(" ", "")
    if not isbn_clean.isalnum() or len(isbn_clean) < 10 or len(isbn_clean) > 13:
        return False, "ISBN must be a valid 10 or 13-digit alphanumeric format."

    # Validate published year
    try:
        year_val = int(published_year)
        current_year = datetime.now().year
        if year_val < 1000 or year_val > current_year:
            return False, f"Published year must be between 1000 and {current_year}."
    except (TypeError, ValueError):
        return False, "Published year must be a valid integer."

    # Validate quantity
    try:
        qty_val = int(quantity)
        if qty_val < 1:
            return False, "Quantity must be a positive integer greater than or equal to 1."
    except (TypeError, ValueError):
        return False, "Quantity must be a valid integer."

    return True, ""


def validate_member_data(data):
    """
    Validates Member management input parameters.
    Returns (is_valid, error_message)
    """
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()

    if not name:
        return False, "Member name is required and cannot be empty."
    if len(name) < 2:
        return False, "Member name must be at least 2 characters long."

    if not email:
        return False, "Email address is required."
    # Standard email regex pattern
    email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    if not re.match(email_pattern, email):
        return False, "Please enter a valid email address structure (e.g. user@domain.com)."

    if not phone:
        return False, "Phone number is required."
    # Phone verification: digits, spaces, hyphens, and optional + symbol, length 7 to 15
    phone_clean = phone.replace("+", "").replace("-", "").replace(" ", "")
    if not phone_clean.isdigit() or len(phone_clean) < 7 or len(phone_clean) > 15:
        return False, "Phone number must contain between 7 and 15 digits (plus optional '+' prefix)."

    return True, ""


# --- FRONTEND ROUTE ---

@app.route('/')
def home():
    """Renders the single-page application dashboard"""
    return render_template('index.html')


# --- API ENDPOINTS ---

# 1. Dashboard Statistics
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard_stats():
    try:
        stats = db.get_dashboard_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve dashboard stats: {str(e)}"}), 500


# 2. Book Management CRUD
@app.route('/api/books', methods=['GET'])
def get_books():
    try:
        books = db.get_all_books()
        return jsonify(books), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve books: {str(e)}"}), 500


@app.route('/api/books', methods=['POST'])
def add_book():
    data = request.get_json() or {}
    is_valid, err_msg = validate_book_data(data)
    if not is_valid:
        return jsonify({"error": err_msg}), 400
    
    try:
        book_id = db.add_book(
            title=data["title"].strip(),
            author=data["author"].strip(),
            isbn=data["isbn"].strip(),
            published_year=int(data["published_year"]),
            quantity=int(data["quantity"])
        )
        return jsonify({"message": "Book added successfully!", "id": book_id}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.get_json() or {}
    is_valid, err_msg = validate_book_data(data)
    if not is_valid:
        return jsonify({"error": err_msg}), 400
        
    try:
        db.update_book(
            book_id=book_id,
            title=data["title"].strip(),
            author=data["author"].strip(),
            isbn=data["isbn"].strip(),
            published_year=int(data["published_year"]),
            new_quantity=int(data["quantity"])
        )
        return jsonify({"message": "Book updated successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    try:
        db.delete_book(book_id)
        return jsonify({"message": "Book deleted successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# 3. Member Management CRUD
@app.route('/api/members', methods=['GET'])
def get_members():
    try:
        members = db.get_all_members()
        return jsonify(members), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve members: {str(e)}"}), 500


@app.route('/api/members', methods=['POST'])
def add_member():
    data = request.get_json() or {}
    is_valid, err_msg = validate_member_data(data)
    if not is_valid:
        return jsonify({"error": err_msg}), 400
        
    try:
        member_id = db.add_member(
            name=data["name"].strip(),
            email=data["email"].strip(),
            phone=data["phone"].strip()
        )
        return jsonify({"message": "Member registered successfully!", "id": member_id}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/api/members/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    data = request.get_json() or {}
    is_valid, err_msg = validate_member_data(data)
    if not is_valid:
        return jsonify({"error": err_msg}), 400
        
    try:
        db.update_member(
            member_id=member_id,
            name=data["name"].strip(),
            email=data["email"].strip(),
            phone=data["phone"].strip()
        )
        return jsonify({"message": "Member updated successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/api/members/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    try:
        db.delete_member(member_id)
        return jsonify({"message": "Member deleted successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# 4. Book Issuance (Issue Book)
@app.route('/api/transactions/issue', methods=['POST'])
def issue_book():
    data = request.get_json() or {}
    book_id = data.get("book_id")
    member_id = data.get("member_id")

    # Issue validation: ensure IDs are specified
    if not book_id:
        return jsonify({"error": "Please select a valid book to issue."}), 400
    if not member_id:
        return jsonify({"error": "Please select a valid member to issue to."}), 400

    try:
        tx_id = db.issue_book(book_id=int(book_id), member_id=int(member_id))
        return jsonify({"message": "Book issued successfully!", "transaction_id": tx_id}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# 5. Book Return (Return Book)
@app.route('/api/transactions/return', methods=['POST'])
def return_book():
    data = request.get_json() or {}
    transaction_id = data.get("transaction_id")

    # Return validation: ensure Transaction ID is specified
    if not transaction_id:
        return jsonify({"error": "Please select a valid active transaction to return."}), 400

    try:
        db.return_book(transaction_id=int(transaction_id))
        return jsonify({"message": "Book returned successfully!"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# 6. Transaction list
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    try:
        transactions = db.get_all_transactions()
        return jsonify(transactions), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve transactions: {str(e)}"}), 500


# --- EXPLAIN FLASK BACKEND ROUTING SCHEMA ---
@app.route('/api/about', methods=['GET'])
def about_backend():
    """Explanation of the Python Flask Framework setup as requested by the user"""
    explanation = {
        "framework": "Flask (Python Web Server Gateway Interface micro-framework)",
        "routing_architecture": "Flask uses the `@app.route(rule, options)` decorator to bind functions to URL paths.",
        "api_structure": "It facilitates RESTful JSON endpoints. We handle CORS-friendly requests, extract JSON paylods via `request.get_json()`, execute business validation logic, and query the SQLite database.",
        "http_responses": "We return standardized HTTP codes (200 OK, 201 Created, 400 Bad Request, 500 Internal Error) using the `jsonify()` response decorator to feed our JavaScript AJAX front-end client dynamically."
    }
    return jsonify(explanation), 200


if __name__ == '__main__':
    # Start local development server
    app.run(debug=True, port=5000)
