// LibSphere Library Management Frontend Controller

// Store global states for search filters
let booksList = [];
let membersList = [];
let transactionsList = [];

document.addEventListener("DOMContentLoaded", () => {
    // Start live clock ticking
    startClock();
    
    // Setup Navigation Tabs Listener
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            switchTab(tabId);
        });
    });

    // Initial Load - Dashboard
    switchTab("dashboard-tab");
});

// --- CLOCK DISPLAY TRIGGER ---
function startClock() {
    const clockEl = document.getElementById("current-date");
    const updateTime = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleDateString() + " " + now.toLocaleTimeString();
    };
    updateTime();
    setInterval(updateTime, 1000);
}

// --- SPA TAB SWITCHER ---
function switchTab(tabId) {
    // 1. Deactivate all navigation buttons and contents
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
    
    // 2. Activate specific tab
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    const activeTab = document.getElementById(tabId);
    
    if (activeBtn) activeBtn.classList.add("active");
    if (activeTab) activeTab.classList.add("active");

    // 3. Dynamically set Page Header Title
    const pageTitleMap = {
        "dashboard-tab": "Dashboard Summary",
        "books-tab": "Book Inventory",
        "members-tab": "Member Directory",
        "issue-tab": "Issue a Book",
        "return-tab": "Return a Book",
        "transactions-tab": "Borrowing Logs & History",
        "about-tab": "About Backend Architecture"
    };
    document.getElementById("page-title").textContent = pageTitleMap[tabId] || "Library System";

    // 4. Trigger relative fetch data logic
    if (tabId === "dashboard-tab") {
        loadDashboardStats();
        loadRecentBooks();
    } else if (tabId === "books-tab") {
        loadBooks();
    } else if (tabId === "members-tab") {
        loadMembers();
    } else if (tabId === "issue-tab") {
        populateIssueSelectors();
    } else if (tabId === "return-tab") {
        populateReturnSelectors();
    } else if (tabId === "transactions-tab") {
        loadTransactions();
    } else if (tabId === "about-tab") {
        loadAboutInfo();
    }
}

// --- TOAST NOTIFICATIONS POPUP ---
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icon = type === "success" 
        ? '<i class="fa-solid fa-circle-check"></i>' 
        : '<i class="fa-solid fa-triangle-exclamation"></i>';
        
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);

    // Auto trigger fade-out and destruction
    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// --- FORM VALIDATION ENGINE (FRONTEND VALIDATION) ---

function setFieldError(fieldId, errorId, message) {
    const fieldGroup = document.getElementById(fieldId).closest(".form-group");
    const errorEl = document.getElementById(errorId);
    if (message) {
        fieldGroup.classList.add("has-error");
        errorEl.textContent = message;
        return false;
    } else {
        fieldGroup.classList.remove("has-error");
        errorEl.textContent = "";
        return true;
    }
}

function validateBookForm() {
    let isValid = true;

    // Validate Title
    const title = document.getElementById("book-title-input").value.trim();
    if (!title) {
        isValid = setFieldError("book-title-input", "err-book-title", "Book Title is required.") && isValid;
        isValid = false;
    } else if (title.length < 2) {
        isValid = setFieldError("book-title-input", "err-book-title", "Title must be at least 2 characters long.") && isValid;
        isValid = false;
    } else {
        setFieldError("book-title-input", "err-book-title", "");
    }

    // Validate Author
    const author = document.getElementById("book-author-input").value.trim();
    if (!author) {
        isValid = setFieldError("book-author-input", "err-book-author", "Author is required.") && isValid;
        isValid = false;
    } else if (author.length < 2) {
        isValid = setFieldError("book-author-input", "err-book-author", "Author name must be at least 2 characters.") && isValid;
        isValid = false;
    } else {
        setFieldError("book-author-input", "err-book-author", "");
    }

    // Validate ISBN
    const isbn = document.getElementById("book-isbn-input").value.trim();
    const cleanIsbn = isbn.replace(/[-\s]/g, "");
    if (!isbn) {
        isValid = setFieldError("book-isbn-input", "err-book-isbn", "ISBN is required.") && isValid;
        isValid = false;
    } else if (cleanIsbn.length < 10 || cleanIsbn.length > 13) {
        isValid = setFieldError("book-isbn-input", "err-book-isbn", "ISBN must be a valid 10 or 13 character identifier.") && isValid;
        isValid = false;
    } else {
        setFieldError("book-isbn-input", "err-book-isbn", "");
    }

    // Validate Published Year
    const yearInput = document.getElementById("book-year-input").value;
    const year = parseInt(yearInput, 10);
    const currentYear = new Date().getFullYear();
    if (!yearInput) {
        isValid = setFieldError("book-year-input", "err-book-year", "Year is required.") && isValid;
        isValid = false;
    } else if (isNaN(year) || year < 1000 || year > currentYear) {
        isValid = setFieldError("book-year-input", "err-book-year", `Published Year must be between 1000 and ${currentYear}.`) && isValid;
        isValid = false;
    } else {
        setFieldError("book-year-input", "err-book-year", "");
    }

    // Validate Quantity
    const qtyInput = document.getElementById("book-quantity-input").value;
    const quantity = parseInt(qtyInput, 10);
    if (!qtyInput) {
        isValid = setFieldError("book-quantity-input", "err-book-quantity", "Quantity is required.") && isValid;
        isValid = false;
    } else if (isNaN(quantity) || quantity < 1) {
        isValid = setFieldError("book-quantity-input", "err-book-quantity", "Quantity must be at least 1 copy.") && isValid;
        isValid = false;
    } else {
        setFieldError("book-quantity-input", "err-book-quantity", "");
    }

    return isValid;
}

function validateMemberForm() {
    let isValid = true;

    // Validate Name
    const name = document.getElementById("member-name-input").value.trim();
    if (!name) {
        isValid = setFieldError("member-name-input", "err-member-name", "Member Name is required.") && isValid;
        isValid = false;
    } else if (name.length < 2) {
        isValid = setFieldError("member-name-input", "err-member-name", "Name must be at least 2 characters long.") && isValid;
        isValid = false;
    } else {
        setFieldError("member-name-input", "err-member-name", "");
    }

    // Validate Email
    const email = document.getElementById("member-email-input").value.trim();
    const emailPattern = /^[\w\.-]+@[\w\.-]+\.\w+$/;
    if (!email) {
        isValid = setFieldError("member-email-input", "err-member-email", "Email is required.") && isValid;
        isValid = false;
    } else if (!emailPattern.test(email)) {
        isValid = setFieldError("member-email-input", "err-member-email", "Enter a valid email layout (e.g., mail@example.com).") && isValid;
        isValid = false;
    } else {
        setFieldError("member-email-input", "err-member-email", "");
    }

    // Validate Phone
    const phone = document.getElementById("member-phone-input").value.trim();
    const phoneClean = phone.replace(/[+\-\s]/g, "");
    if (!phone) {
        isValid = setFieldError("member-phone-input", "err-member-phone", "Phone number is required.") && isValid;
        isValid = false;
    } else if (!/^\d+$/.test(phoneClean) || phoneClean.length < 7 || phoneClean.length > 15) {
        isValid = setFieldError("member-phone-input", "err-member-phone", "Phone must contain 7-15 numerical characters.") && isValid;
        isValid = false;
    } else {
        setFieldError("member-phone-input", "err-member-phone", "");
    }

    return isValid;
}

// --- FETCH DASHBOARD STATS ---
async function loadDashboardStats() {
    try {
        const response = await fetch("/api/dashboard");
        const stats = await response.json();
        
        if (response.ok) {
            document.getElementById("stat-total-books").textContent = stats.total_books;
            document.getElementById("stat-available-books").textContent = stats.available_books;
            document.getElementById("stat-issued-books").textContent = stats.issued_books;
            document.getElementById("stat-total-members").textContent = stats.total_members;
        } else {
            showToast(stats.error || "Could not load stats.", "error");
        }
    } catch (e) {
        showToast("Server connection error when loading stats.", "error");
    }
}

// --- FETCH RECENT BOOKS OVERVIEW ---
async function loadRecentBooks() {
    try {
        const response = await fetch("/api/books");
        const books = await response.json();
        const tbody = document.getElementById("recent-books-body");
        
        if (response.ok) {
            tbody.innerHTML = "";
            const recent = books.slice(0, 4); // Show only top 4
            if (recent.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">No books added yet.</td></tr>';
                return;
            }
            recent.forEach(book => {
                const badgeClass = book.available_quantity > 0 ? 'badge-success' : 'badge-danger';
                const statusText = book.available_quantity > 0 ? 'Available' : 'Out of Stock';
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${escapeHTML(book.title)}</strong></td>
                    <td>${escapeHTML(book.author)}</td>
                    <td>${escapeHTML(book.isbn)}</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error("Failed to load recent books overview", e);
    }
}

// --- FETCH BOOKS INVENTORY ---
async function loadBooks() {
    try {
        const response = await fetch("/api/books");
        booksList = await response.json();
        renderBooks(booksList);
    } catch (e) {
        showToast("Error retrieving library books list.", "error");
    }
}

function renderBooks(books) {
    const tbody = document.getElementById("books-table-body");
    tbody.innerHTML = "";
    
    if (books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No books match your criteria.</td></tr>';
        return;
    }

    books.forEach(book => {
        const badgeClass = book.available_quantity > 0 ? 'badge-success' : 'badge-danger';
        const badgeText = book.available_quantity > 0 ? `${book.available_quantity} copies left` : 'Out of Stock';
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${book.id}</td>
            <td><strong>${escapeHTML(book.title)}</strong></td>
            <td>${escapeHTML(book.author)}</td>
            <td>${escapeHTML(book.isbn)}</td>
            <td>${book.published_year}</td>
            <td>${book.quantity}</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>
                <button class="btn btn-icon edit-btn" onclick="openBookModal(${book.id})" title="Edit Book">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-icon delete-btn" onclick="handleDeleteBook(${book.id})" title="Delete Book">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterBooks() {
    const query = document.getElementById("book-search").value.toLowerCase();
    const filtered = booksList.filter(book => 
        book.title.toLowerCase().includes(query) || 
        book.author.toLowerCase().includes(query) || 
        book.isbn.toLowerCase().includes(query) ||
        book.id.toString() === query
    );
    renderBooks(filtered);
}

// --- FETCH MEMBERS DIRECTORY ---
async function loadMembers() {
    try {
        const response = await fetch("/api/members");
        membersList = await response.json();
        renderMembers(membersList);
    } catch (e) {
        showToast("Error retrieving member files.", "error");
    }
}

function renderMembers(members) {
    const tbody = document.getElementById("members-table-body");
    tbody.innerHTML = "";
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No members match your criteria.</td></tr>';
        return;
    }

    members.forEach(member => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${member.id}</td>
            <td><strong>${escapeHTML(member.name)}</strong></td>
            <td>${escapeHTML(member.email)}</td>
            <td>${escapeHTML(member.phone)}</td>
            <td>
                <button class="btn btn-icon edit-btn" onclick="openMemberModal(${member.id})" title="Edit Member">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-icon delete-btn" onclick="handleDeleteMember(${member.id})" title="Delete Member">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterMembers() {
    const query = document.getElementById("member-search").value.toLowerCase();
    const filtered = membersList.filter(member => 
        member.name.toLowerCase().includes(query) || 
        member.email.toLowerCase().includes(query) || 
        member.phone.toLowerCase().includes(query) ||
        member.id.toString() === query
    );
    renderMembers(filtered);
}

// --- BOOK ADD / EDIT ACTION MODAL ---
function openBookModal(bookId = null) {
    const modal = document.getElementById("book-modal");
    const form = document.getElementById("book-form");
    const modalTitle = document.getElementById("book-modal-title");
    
    // Reset forms & styles
    form.reset();
    document.querySelectorAll("#book-form .form-group").forEach(el => el.classList.remove("has-error"));
    document.querySelectorAll("#book-form .error-msg").forEach(el => el.textContent = "");
    
    if (bookId) {
        modalTitle.textContent = "Edit Book Details";
        const book = booksList.find(b => b.id === bookId);
        if (book) {
            document.getElementById("book-id-input").value = book.id;
            document.getElementById("book-title-input").value = book.title;
            document.getElementById("book-author-input").value = book.author;
            document.getElementById("book-isbn-input").value = book.isbn;
            document.getElementById("book-year-input").value = book.published_year;
            document.getElementById("book-quantity-input").value = book.quantity;
        }
    } else {
        modalTitle.textContent = "Add New Book";
        document.getElementById("book-id-input").value = "";
    }
    modal.classList.add("active");
}

function closeBookModal() {
    document.getElementById("book-modal").classList.remove("active");
}

async function handleBookSubmit(event) {
    event.preventDefault();
    if (!validateBookForm()) return; // Stop if frontend validation fails
    
    const id = document.getElementById("book-id-input").value;
    const data = {
        title: document.getElementById("book-title-input").value,
        author: document.getElementById("book-author-input").value,
        isbn: document.getElementById("book-isbn-input").value,
        published_year: parseInt(document.getElementById("book-year-input").value, 10),
        quantity: parseInt(document.getElementById("book-quantity-input").value, 10)
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/books/${id}` : "/api/books";
    const method = isEdit ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || "Book saved successfully!");
            closeBookModal();
            loadBooks();
        } else {
            showToast(result.error || "Save error occurred.", "error");
        }
    } catch (e) {
        showToast("Unable to communicate with book API.", "error");
    }
}

async function handleDeleteBook(bookId) {
    if (!confirm("Are you sure you want to delete this book permanently?")) return;
    
    try {
        const response = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || "Book deleted.");
            loadBooks();
        } else {
            showToast(result.error || "Delete action failed.", "error");
        }
    } catch (e) {
        showToast("Unable to connect to Delete API.", "error");
    }
}

// --- MEMBER ADD / EDIT ACTION MODAL ---
function openMemberModal(memberId = null) {
    const modal = document.getElementById("member-modal");
    const form = document.getElementById("member-form");
    const modalTitle = document.getElementById("member-modal-title");
    
    form.reset();
    document.querySelectorAll("#member-form .form-group").forEach(el => el.classList.remove("has-error"));
    document.querySelectorAll("#member-form .error-msg").forEach(el => el.textContent = "");
    
    if (memberId) {
        modalTitle.textContent = "Edit Member Information";
        const member = membersList.find(m => m.id === memberId);
        if (member) {
            document.getElementById("member-id-input").value = member.id;
            document.getElementById("member-name-input").value = member.name;
            document.getElementById("member-email-input").value = member.email;
            document.getElementById("member-phone-input").value = member.phone;
        }
    } else {
        modalTitle.textContent = "Register New Member";
        document.getElementById("member-id-input").value = "";
    }
    modal.classList.add("active");
}

function closeMemberModal() {
    document.getElementById("member-modal").classList.remove("active");
}

async function handleMemberSubmit(event) {
    event.preventDefault();
    if (!validateMemberForm()) return; // Stop if frontend validation fails
    
    const id = document.getElementById("member-id-input").value;
    const data = {
        name: document.getElementById("member-name-input").value,
        email: document.getElementById("member-email-input").value,
        phone: document.getElementById("member-phone-input").value
    };

    const isEdit = !!id;
    const url = isEdit ? `/api/members/${id}` : "/api/members";
    const method = isEdit ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || "Member saved successfully!");
            closeMemberModal();
            loadMembers();
        } else {
            showToast(result.error || "Save error occurred.", "error");
        }
    } catch (e) {
        showToast("Unable to communicate with member API.", "error");
    }
}

async function handleDeleteMember(memberId) {
    if (!confirm("Are you sure you want to remove this library member?")) return;
    
    try {
        const response = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || "Member removed.");
            loadMembers();
        } else {
            showToast(result.error || "Delete action failed.", "error");
        }
    } catch (e) {
        showToast("Unable to connect to Delete API.", "error");
    }
}

// --- POPULATE BORROW/ISSUE FORM ---
async function populateIssueSelectors() {
    const bookSelect = document.getElementById("issue-book-select");
    const memberSelect = document.getElementById("issue-member-select");
    
    // Clear select
    bookSelect.innerHTML = '<option value="" disabled selected>-- Choose Available Book --</option>';
    memberSelect.innerHTML = '<option value="" disabled selected>-- Choose Registered Member --</option>';
    
    // Reset validations
    setFieldError("issue-book-select", "err-issue-book", "");
    setFieldError("issue-member-select", "err-issue-member", "");

    try {
        // Fetch books & members
        const [booksRes, membersRes] = await Promise.all([
            fetch("/api/books"),
            fetch("/api/members")
        ]);
        
        const books = await booksRes.json();
        const members = await membersRes.json();

        // Filter: Books must have available_quantity > 0
        const availableBooks = books.filter(b => b.available_quantity > 0);
        if (availableBooks.length === 0) {
            const opt = document.createElement("option");
            opt.text = "All books are currently checked out!";
            opt.disabled = true;
            bookSelect.add(opt);
        } else {
            availableBooks.forEach(book => {
                const opt = document.createElement("option");
                opt.value = book.id;
                opt.text = `${book.title} (By: ${book.author} - Avail: ${book.available_quantity})`;
                bookSelect.add(opt);
            });
        }

        // Fill members
        if (members.length === 0) {
            const opt = document.createElement("option");
            opt.text = "No registered members found.";
            opt.disabled = true;
            memberSelect.add(opt);
        } else {
            members.forEach(member => {
                const opt = document.createElement("option");
                opt.value = member.id;
                opt.text = `${member.name} (Email: ${member.email})`;
                memberSelect.add(opt);
            });
        }

    } catch (e) {
        showToast("Failed to fetch elements for issue selection dropdowns.", "error");
    }
}

async function handleIssueSubmit(event) {
    event.preventDefault();
    
    const bookId = document.getElementById("issue-book-select").value;
    const memberId = document.getElementById("issue-member-select").value;
    
    let isValid = true;
    if (!bookId) {
        isValid = setFieldError("issue-book-select", "err-issue-book", "Please select a book.") && isValid;
        isValid = false;
    } else {
        setFieldError("issue-book-select", "err-issue-book", "");
    }

    if (!memberId) {
        isValid = setFieldError("issue-member-select", "err-issue-member", "Please select a library member.") && isValid;
        isValid = false;
    } else {
        setFieldError("issue-member-select", "err-issue-member", "");
    }

    if (!isValid) return;

    try {
        const response = await fetch("/api/transactions/issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ book_id: parseInt(bookId), member_id: parseInt(memberId) })
        });
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || "Book issued successfully!");
            switchTab("dashboard-tab");
        } else {
            showToast(result.error || "Issue transaction error.", "error");
        }
    } catch (e) {
        showToast("Unable to communicate with issuance endpoint.", "error");
    }
}

// --- POPULATE RETURNS FORM ---
async function populateReturnSelectors() {
    const returnSelect = document.getElementById("return-tx-select");
    returnSelect.innerHTML = '<option value="" disabled selected>-- Choose Issued Transaction --</option>';
    setFieldError("return-tx-select", "err-return-tx", "");

    try {
        const response = await fetch("/api/transactions");
        const transactions = await response.json();
        
        // Filter transactions currently 'Issued'
        const activeTx = transactions.filter(t => t.status === "Issued");
        
        if (activeTx.length === 0) {
            const opt = document.createElement("option");
            opt.text = "No books are currently issued.";
            opt.disabled = true;
            returnSelect.add(opt);
        } else {
            activeTx.forEach(tx => {
                const opt = document.createElement("option");
                opt.value = tx.id;
                opt.text = `Tx ID: ${tx.id} | ${tx.book_title} (To: ${tx.member_name} - Date: ${tx.issue_date})`;
                returnSelect.add(opt);
            });
        }
    } catch (e) {
        showToast("Error retrieving active transaction history.", "error");
    }
}

async function handleReturnSubmit(event) {
    event.preventDefault();
    const txId = document.getElementById("return-tx-select").value;
    
    if (!txId) {
        setFieldError("return-tx-select", "err-return-tx", "Please select an active transaction log.");
        return;
    }
    setFieldError("return-tx-select", "err-return-tx", "");

    try {
        const response = await fetch("/api/transactions/return", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transaction_id: parseInt(txId) })
        });
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || "Book returned successfully!");
            switchTab("dashboard-tab");
        } else {
            showToast(result.error || "Return transaction error.", "error");
        }
    } catch (e) {
        showToast("Unable to reach Return API.", "error");
    }
}

// --- TRANSACTION LOG VIEW ---
async function loadTransactions() {
    try {
        const response = await fetch("/api/transactions");
        transactionsList = await response.json();
        renderTransactions(transactionsList);
    } catch (e) {
        showToast("Error loading logs.", "error");
    }
}

function renderTransactions(txs) {
    const tbody = document.getElementById("transactions-table-body");
    tbody.innerHTML = "";
    
    if (txs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No borrowings recorded in the system.</td></tr>';
        return;
    }

    txs.forEach(tx => {
        const isReturned = tx.status === "Returned";
        const badgeClass = isReturned ? "badge-success" : "badge-warning";
        const returnDateVal = tx.return_date ? tx.return_date : "-";
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${tx.id}</td>
            <td><strong>${escapeHTML(tx.book_title)}</strong></td>
            <td>${escapeHTML(tx.book_isbn)}</td>
            <td>${escapeHTML(tx.member_name)}</td>
            <td>${tx.issue_date}</td>
            <td>${returnDateVal}</td>
            <td><span class="badge ${badgeClass}">${tx.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTransactions() {
    const query = document.getElementById("tx-search").value.toLowerCase();
    const filtered = transactionsList.filter(tx => 
        tx.book_title.toLowerCase().includes(query) || 
        tx.book_isbn.toLowerCase().includes(query) || 
        tx.member_name.toLowerCase().includes(query) ||
        tx.status.toLowerCase().includes(query) ||
        tx.id.toString() === query
    );
    renderTransactions(filtered);
}

// --- LOAD ABOUT FLASK EXPLANATION ---
async function loadAboutInfo() {
    const container = document.getElementById("about-content");
    container.innerHTML = "<p>Loading about info...</p>";
    
    try {
        const response = await fetch("/api/about");
        const info = await response.json();
        
        if (response.ok) {
            container.innerHTML = `
                <div class="about-card">
                    <h3>Framework Setup</h3>
                    <p><strong>Type:</strong> ${escapeHTML(info.framework)}</p>
                    <p>The backend acts as a microservice framework serving standard static directories dynamically and creating REST interfaces.</p>
                </div>
                <div class="about-card">
                    <h3>Routing & Controller Layout</h3>
                    <p>${escapeHTML(info.routing_architecture)}</p>
                </div>
                <div class="about-card">
                    <h3>API Architecture</h3>
                    <p>${escapeHTML(info.api_structure)}</p>
                </div>
                <div class="about-card">
                    <h3>HTTP Protocol Implementation</h3>
                    <p>${escapeHTML(info.http_responses)}</p>
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = "<p class='error-msg'>Could not load information from Flask about endpoint.</p>";
    }
}

// --- HELPER FUNCTION: ESCAPE HTML (XSS Protection) ---
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
