import sqlite3
import os
from datetime import datetime

class LibraryDatabase:
    def __init__(self, db_name="library.db"):
        # Put the database inside the same directory as database.py
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_path = os.path.join(base_dir, db_name)
        self.create_tables()
        self.seed_if_empty()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Access columns by name
        # Enable foreign keys support in SQLite
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def create_tables(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Create Books Table (with quantity tracking)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS books (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    isbn TEXT NOT NULL UNIQUE,
                    published_year INTEGER NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    available_quantity INTEGER NOT NULL DEFAULT 1
                )
            ''')
            
            # 2. Create Members Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    phone TEXT NOT NULL
                )
            ''')
            
            # 3. Create Transactions Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book_id INTEGER NOT NULL,
                    member_id INTEGER NOT NULL,
                    issue_date TEXT NOT NULL,
                    return_date TEXT,
                    status TEXT NOT NULL DEFAULT 'Issued',
                    FOREIGN KEY(book_id) REFERENCES books(id),
                    FOREIGN KEY(member_id) REFERENCES members(id)
                )
            ''')
            
            conn.commit()

    def seed_if_empty(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if database is empty
            cursor.execute("SELECT COUNT(*) FROM books")
            if cursor.fetchone()[0] == 0:
                # Seed Books
                books_data = [
                    ("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", 1925, 5, 5),
                    ("To Kill a Mockingbird", "Harper Lee", "9780061120084", 1960, 3, 3),
                    ("1984", "George Orwell", "9780451524935", 1949, 4, 4),
                    ("Pride and Prejudice", "Jane Austen", "9780141439518", 1813, 2, 2),
                    ("The Catcher in the Rye", "J.D. Salinger", "9780316769174", 1951, 3, 3)
                ]
                cursor.executemany('''
                    INSERT INTO books (title, author, isbn, published_year, quantity, available_quantity)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', books_data)

                # Seed Members
                members_data = [
                    ("Alice Johnson", "alice@example.com", "+1234567890"),
                    ("Bob Smith", "bob@example.com", "+1987654321"),
                    ("Charlie Brown", "charlie@example.com", "+1122334455")
                ]
                cursor.executemany('''
                    INSERT INTO members (name, email, phone)
                    VALUES (?, ?, ?)
                ''', members_data)
                
                conn.commit()

                # Seed some initial transactions (e.g. Alice borrows 1984, Bob borrows The Great Gatsby)
                # Let's issue them programmatically to update available_quantity
                self.issue_book(book_id=3, member_id=1, issue_date="2026-06-01 10:00:00") # 1984 (avail 4 -> 3)
                self.issue_book(book_id=1, member_id=2, issue_date="2026-06-02 14:30:00") # Great Gatsby (avail 5 -> 4)

    # --- BOOK CRUD ---
    def add_book(self, title, author, isbn, published_year, quantity):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO books (title, author, isbn, published_year, quantity, available_quantity)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (title, author, isbn, published_year, quantity, quantity))
                conn.commit()
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                raise ValueError(f"Book with ISBN '{isbn}' already exists.")

    def get_all_books(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM books ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_book_by_id(self, book_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_book(self, book_id, title, author, isbn, published_year, new_quantity):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # 1. Fetch current quantities
            cursor.execute("SELECT quantity, available_quantity FROM books WHERE id = ?", (book_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Book not found.")
            
            old_qty, old_avail_qty = row['quantity'], row['available_quantity']
            diff = new_quantity - old_qty
            
            # Validation: cannot reduce quantity below the number of currently issued copies
            # Issued copies = old_qty - old_avail_qty
            issued_copies = old_qty - old_avail_qty
            if new_quantity < issued_copies:
                raise ValueError(
                    f"Cannot reduce total quantity to {new_quantity} because {issued_copies} copies are currently issued to members."
                )
            
            new_avail_qty = old_avail_qty + diff
            
            try:
                cursor.execute('''
                    UPDATE books
                    SET title = ?, author = ?, isbn = ?, published_year = ?, quantity = ?, available_quantity = ?
                    WHERE id = ?
                ''', (title, author, isbn, published_year, new_quantity, new_avail_qty, book_id))
                conn.commit()
            except sqlite3.IntegrityError:
                raise ValueError(f"Book with ISBN '{isbn}' already exists on another record.")

    def delete_book(self, book_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if book is currently issued (status = 'Issued')
            cursor.execute("SELECT COUNT(*) FROM transactions WHERE book_id = ? AND status = 'Issued'", (book_id,))
            if cursor.fetchone()[0] > 0:
                raise ValueError("Cannot delete book: there are outstanding issues. Please return all copies first.")
            
            # Delete transaction records for this book as well (to avoid foreign key violations if needed, or cascades)
            cursor.execute("DELETE FROM transactions WHERE book_id = ?", (book_id,))
            cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))
            conn.commit()

    # --- MEMBER CRUD ---
    def add_member(self, name, email, phone):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO members (name, email, phone)
                    VALUES (?, ?, ?)
                ''', (name, email, phone))
                conn.commit()
                return cursor.lastrowid
            except sqlite3.IntegrityError:
                raise ValueError(f"Member with email '{email}' already exists.")

    def get_all_members(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM members ORDER BY id DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_member_by_id(self, member_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM members WHERE id = ?", (member_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_member(self, member_id, name, email, phone):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Verify member exists
            cursor.execute("SELECT id FROM members WHERE id = ?", (member_id,))
            if not cursor.fetchone():
                raise ValueError("Member not found.")
            
            try:
                cursor.execute('''
                    UPDATE members
                    SET name = ?, email = ?, phone = ?
                    WHERE id = ?
                ''', (name, email, phone, member_id))
                conn.commit()
            except sqlite3.IntegrityError:
                raise ValueError(f"Member with email '{email}' already exists on another record.")

    def delete_member(self, member_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Check if member has outstanding issued books
            cursor.execute("SELECT COUNT(*) FROM transactions WHERE member_id = ? AND status = 'Issued'", (member_id,))
            if cursor.fetchone()[0] > 0:
                raise ValueError("Cannot delete member: they have outstanding book issues. Please return books first.")
            
            # Delete transactions for this member
            cursor.execute("DELETE FROM transactions WHERE member_id = ?", (member_id,))
            cursor.execute("DELETE FROM members WHERE id = ?", (member_id,))
            conn.commit()

    # --- ISSUE & RETURN LOGIC ---
    def issue_book(self, book_id, member_id, issue_date=None):
        if not issue_date:
            issue_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Verify book exists and get available_quantity
            cursor.execute("SELECT available_quantity, title FROM books WHERE id = ?", (book_id,))
            book = cursor.fetchone()
            if not book:
                raise ValueError("Book not found.")
            
            # 2. Verify member exists
            cursor.execute("SELECT name FROM members WHERE id = ?", (member_id,))
            member = cursor.fetchone()
            if not member:
                raise ValueError("Member not found.")
            
            # 3. Check availability
            if book['available_quantity'] <= 0:
                raise ValueError(f"Book '{book['title']}' is currently out of stock.")
                
            # 4. Create Transaction
            cursor.execute('''
                INSERT INTO transactions (book_id, member_id, issue_date, status)
                VALUES (?, ?, ?, 'Issued')
            ''', (book_id, member_id, issue_date))
            
            # 5. Reduce available quantity
            cursor.execute('''
                UPDATE books
                SET available_quantity = available_quantity - 1
                WHERE id = ?
            ''', (book_id,))
            
            conn.commit()
            return cursor.lastrowid

    def return_book(self, transaction_id, return_date=None):
        if not return_date:
            return_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Verify transaction exists and is issued
            cursor.execute("SELECT book_id, status FROM transactions WHERE id = ?", (transaction_id,))
            tx = cursor.fetchone()
            if not tx:
                raise ValueError("Transaction not found.")
            if tx['status'] == 'Returned':
                raise ValueError("This transaction has already been marked as returned.")
                
            book_id = tx['book_id']
            
            # 2. Mark Returned
            cursor.execute('''
                UPDATE transactions
                SET status = 'Returned', return_date = ?
                WHERE id = ?
            ''', (return_date, transaction_id))
            
            # 3. Increase available quantity
            cursor.execute('''
                UPDATE books
                SET available_quantity = available_quantity + 1
                WHERE id = ?
            ''', (book_id,))
            
            conn.commit()

    def get_all_transactions(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT t.id, t.book_id, t.member_id, t.issue_date, t.return_date, t.status,
                       b.title AS book_title, b.isbn AS book_isbn,
                       m.name AS member_name, m.email AS member_email
                FROM transactions t
                JOIN books b ON t.book_id = b.id
                JOIN members m ON t.member_id = m.id
                ORDER BY t.id DESC
            ''')
            return [dict(row) for row in cursor.fetchall()]

    def get_dashboard_stats(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Total books (sum of quantities)
            cursor.execute("SELECT SUM(quantity) FROM books")
            row = cursor.fetchone()
            total_books = row[0] if row and row[0] is not None else 0
            
            # Total members
            cursor.execute("SELECT COUNT(*) FROM members")
            total_members = cursor.fetchone()[0]
            
            # Issued books
            cursor.execute("SELECT COUNT(*) FROM transactions WHERE status = 'Issued'")
            issued_books = cursor.fetchone()[0]
            
            # Available books (sum of available_quantities)
            cursor.execute("SELECT SUM(available_quantity) FROM books")
            row = cursor.fetchone()
            available_books = row[0] if row and row[0] is not None else 0
            
            return {
                "total_books": total_books,
                "total_members": total_members,
                "issued_books": issued_books,
                "available_books": available_books
            }
