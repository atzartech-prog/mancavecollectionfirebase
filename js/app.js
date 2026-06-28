// ==========================================
// MANCAVE COLLECTION APPLICATION LOGIC (JS)
// ==========================================

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAdFH1wK1LZFb8a7tdNok5vCif-V9Jcl9A",
  authDomain: "koleksi-mancave.firebaseapp.com",
  projectId: "koleksi-mancave",
  storageBucket: "koleksi-mancave.firebasestorage.app",
  messagingSenderId: "169518810010",
  appId: "1:169518810010:web:21b054080e73c8d4827023"
};

// Initialize Firebase compat
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// 2. STATE VARIABLES
let currentUser = null;
let categoriesList = [];
let itemsList = [];
let categoryChartInstance = null;

// Firebase listener references (for clean unsubscribes if needed)
let categoriesUnsubscribe = null;
let itemsUnsubscribe = null;

// 3. AUTHENTICATION STATE OBSERVER
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is logged in
    currentUser = user;
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    document.getElementById('user-email-display').textContent = user.email;
    
    // Toast notification
    showToast('success', `Welcome back, ${user.email}!`);
    
    // Load data
    initializeDataRealtime();
  } else {
    // User is logged out
    currentUser = null;
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    
    // Cleanup listeners
    if (categoriesUnsubscribe) categoriesUnsubscribe();
    if (itemsUnsubscribe) itemsUnsubscribe();
    
    resetAppState();
  }
});

function resetAppState() {
  categoriesList = [];
  itemsList = [];
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }
  document.getElementById('recent-items-tbody').innerHTML = `
    <tr><td colspan="4" class="text-center py-4 text-muted">No items in database. Add some!</td></tr>
  `;
}

// 4. AUTH FUNCTIONS
function switchAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  if (tab === 'login') {
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
  }
}

// Handle Login Form Submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  showLoadingBtn('login-form', true);
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Login Failed',
      text: translateFirebaseError(error.code),
      background: '#0b1320',
      color: '#f1f5f9',
      confirmButtonColor: '#00f2fe'
    });
  } finally {
    showLoadingBtn('login-form', false);
  }
});

// Handle Register Form Submission
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;

  if (password.length < 6) {
    showToast('error', 'Password must be at least 6 characters!');
    return;
  }

  if (password !== confirmPassword) {
    showToast('error', 'Passwords do not match!');
    return;
  }

  showLoadingBtn('register-form', true);
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    switchAuthTab('login');
    showToast('success', 'Registration successful! Logged in automatically.');
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Registration Failed',
      text: translateFirebaseError(error.code),
      background: '#0b1320',
      color: '#f1f5f9',
      confirmButtonColor: '#00f2fe'
    });
  } finally {
    showLoadingBtn('register-form', false);
  }
});

// Log Out Trigger
document.getElementById('btn-logout-action').addEventListener('click', async () => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You will be logged out of your mancave collection.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: 'rgba(255,255,255,0.08)',
    background: '#0b1320',
    color: '#f1f5f9',
    confirmButtonText: 'Yes, Log Out'
  });

  if (result.isConfirmed) {
    try {
      await auth.signOut();
      showToast('success', 'Logged out successfully.');
    } catch (error) {
      showToast('error', 'Error logging out.');
    }
  }
});

// 5. DATA INGESTION & REALTIME SUBSCRIPTION
function initializeDataRealtime() {
  if (!currentUser) return;
  
  // Realtime listener for Categories
  categoriesUnsubscribe = db.collection('categories')
    .where('userId', '==', currentUser.uid)
    .onSnapshot((snapshot) => {
      categoriesList = [];
      snapshot.forEach((doc) => {
        categoriesList.push({ id: doc.id, ...doc.data() });
      });
      // Sort alphabetically
      categoriesList.sort((a, b) => a.name.localeCompare(b.name));
      
      updateCategoriesUI();
      updateCategoriesSelectOptions();
      updateDashboardStats();
    }, (error) => {
      console.error("Error loading categories:", error);
      showToast('error', 'Failed to fetch categories.');
    });

  // Realtime listener for Items
  itemsUnsubscribe = db.collection('items')
    .where('userId', '==', currentUser.uid)
    .onSnapshot((snapshot) => {
      itemsList = [];
      snapshot.forEach((doc) => {
        itemsList.push({ id: doc.id, ...doc.data() });
      });
      
      updateItemsUI();
      updateDashboardStats();
      updateRecentItemsTable();
      updateDashboardChart();
    }, (error) => {
      console.error("Error loading items:", error);
      showToast('error', 'Failed to fetch collections.');
    });
}

// 6. NAVIGATION AND SIDEBAR
function navigateTo(section) {
  // Hide all sections
  const sections = document.querySelectorAll('.app-section');
  sections.forEach(s => s.classList.remove('active'));

  // Show selected section
  const activeSection = document.getElementById(`section-${section}`);
  if (activeSection) {
    activeSection.classList.add('active');
  }

  // Update nav buttons
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => link.classList.remove('active'));
  
  const activeLink = document.getElementById(`nav-${section}`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // Update header title
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
  }

  // On Mobile: Close sidebar after navigating
  const sidebar = document.querySelector('.sidebar');
  if (sidebar.classList.contains('active')) {
    sidebar.classList.remove('active');
  }
}

// Sidebar Drawer Toggle for Mobile
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarClose = document.getElementById('sidebar-close');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.add('active');
  });
}

if (sidebarClose) {
  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('active');
  });
}

// 7. CATEGORY CRUD ACTIONS
function updateCategoriesUI() {
  const container = document.getElementById('categories-list');
  if (!container) return;

  const btnSeed = document.getElementById('btn-seed-categories');
  if (btnSeed) {
    if (categoriesList.length === 0) {
      btnSeed.style.display = 'inline-flex';
    } else {
      btnSeed.style.display = 'none';
    }
  }

  if (categoriesList.length === 0) {
    container.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-tags"></i>
        <p>No categories created. Seed default categories or create one to classify your Mancave items!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = categoriesList.map(category => {
    // Count items under this category
    const itemCount = itemsList.filter(item => item.categoryId === category.id).length;
    
    return `
      <div class="category-card" id="cat-card-${category.id}">
        <div class="category-card-header">
          <div class="category-emoji">${category.icon || '📦'}</div>
          <div class="category-controls">
            <button class="btn-icon" title="Edit Category" onclick="openEditCategoryModal('${category.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-delete" title="Delete Category" onclick="deleteCategory('${category.id}', '${category.name}')">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
        <h4>${escapeHTML(category.name)}</h4>
        <p>${escapeHTML(category.description || 'No description provided.')}</p>
        <div class="category-stats">
          <span>Items Registered</span>
          <span class="category-item-count">${itemCount}</span>
        </div>
      </div>
    `;
  }).join('');
}

function updateCategoriesSelectOptions() {
  const itemCategorySelect = document.getElementById('item-category');
  const filterCategorySelect = document.getElementById('filter-category');

  if (!itemCategorySelect || !filterCategorySelect) return;

  // Options for Add/Edit Item modal
  let itemOptionsHTML = '<option value="" disabled selected>Select Category</option>';
  // Options for filter row
  let filterOptionsHTML = '<option value="">All Categories</option>';

  categoriesList.forEach(category => {
    itemOptionsHTML += `<option value="${category.id}">${category.icon || '📦'} ${escapeHTML(category.name)}</option>`;
    filterOptionsHTML += `<option value="${category.id}">${category.icon || '📦'} ${escapeHTML(category.name)}</option>`;
  });

  itemCategorySelect.innerHTML = itemOptionsHTML;
  filterCategorySelect.innerHTML = filterOptionsHTML;
}

function selectPickerEmoji(emoji) {
  document.getElementById('category-icon').value = emoji;
  document.getElementById('selected-emoji-val').textContent = emoji;
  
  // Highlight the selected item in the picker
  const pickerItems = document.querySelectorAll('.emoji-picker-item');
  pickerItems.forEach(item => {
    if (item.textContent === emoji) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function openAddCategoryModal() {
  document.getElementById('category-id').value = '';
  document.getElementById('category-form').reset();
  
  // Reset emoji selection to box
  selectPickerEmoji('📦');
  
  document.getElementById('category-modal-title').textContent = 'Create Category';
  openModal('category-modal');
}

function openEditCategoryModal(id) {
  const category = categoriesList.find(c => c.id === id);
  if (!category) return;

  document.getElementById('category-id').value = category.id;
  document.getElementById('category-name').value = category.name;
  document.getElementById('category-desc').value = category.description || '';
  
  // Set selected emoji
  selectPickerEmoji(category.icon || '📦');
  
  document.getElementById('category-modal-title').textContent = 'Edit Category';
  openModal('category-modal');
}

// Category Form Submission (Save/Update)
document.getElementById('category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const id = document.getElementById('category-id').value;
  const name = document.getElementById('category-name').value.trim();
  const icon = document.getElementById('category-icon').value.trim();
  const description = document.getElementById('category-desc').value.trim();

  const categoryData = {
    name,
    icon,
    description,
    userId: currentUser.uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (id) {
      // Edit
      await db.collection('categories').doc(id).update(categoryData);
      showToast('success', 'Category updated successfully!');
    } else {
      // Create
      categoryData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('categories').add(categoryData);
      showToast('success', 'Category created successfully!');
    }
    closeModal('category-modal');
  } catch (error) {
    console.error("Error saving category:", error);
    showToast('error', 'Error saving category. Try again.');
  }
});

// Seed Default Categories
async function seedDefaultCategories() {
  if (!currentUser) return;

  const defaultCategories = [
    { name: "Gadget Lama", icon: "📟", description: "Vintage gadgets, retro mobile phones, pagers, and classic handhelds." },
    { name: "Keyboard", icon: "⌨️", description: "Mechanical keyboards, custom keycap sets, and build accessories." },
    { name: "Mini PC", icon: "🔌", description: "Compact desktop rigs, Intel NUCs, and Raspberry Pi setups." },
    { name: "PC", icon: "💻", description: "Primary gaming setups, personal rigs, monitors, and specs." },
    { name: "Mainan", icon: "🧸", description: "General toy collections, board games, Lego builds, and ornaments." },
    { name: "Figure", icon: "🤖", description: "Action figures, anime scale models, and Gundam kits." },
    { name: "Buku", icon: "📚", description: "Physical reading books, novels, mangas, and reference collections." },
    { name: "Ebook", icon: "📖", description: "Digital library: PDF guides, documentation, and references." },
    { name: "E-reader", icon: "📱", description: "Electronic reading hardware like Kindle, Kobo, or e-paper pads." },
    { name: "SSD", icon: "💾", description: "Solid state drives, high-speed NVMe modules, and backup drives." },
    { name: "Flashdisk", icon: "🔌", description: "USB flash drives, memory cards, and card-reader attachments." },
    { name: "DVD", icon: "💿", description: "Vintage CDs, music DVD folders, and gaming installation disks." },
    { name: "Simcard", icon: "📶", description: "Active or vintage telecom SIMs, carrier setups, and eSIM details." }
  ];

  const result = await Swal.fire({
    title: 'Seed Default Categories?',
    text: "This will add 13 typical Mancave categories (Gadget Lama, Keyboard, PC, Figure, SSD, etc.) to your catalog.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#00f2fe',
    cancelButtonColor: 'rgba(255,255,255,0.08)',
    background: '#0b1320',
    color: '#f1f5f9',
    confirmButtonText: 'Yes, seed them!'
  });

  if (result.isConfirmed) {
    Swal.fire({
      title: 'Seeding Categories...',
      html: 'Populating Firestore document collections...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      background: '#0b1320',
      color: '#f1f5f9'
    });

    try {
      const batch = db.batch();
      defaultCategories.forEach(cat => {
        const docRef = db.collection('categories').doc();
        batch.set(docRef, {
          ...cat,
          userId: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      Swal.close();
      showToast('success', '13 default categories successfully added!');
    } catch (error) {
      console.error("Error seeding categories:", error);
      Swal.close();
      showToast('error', 'Could not complete category seeding.');
    }
  }
}

// Delete Category
async function deleteCategory(id, name) {
  // Check if items are using this category
  const connectedItems = itemsList.filter(item => item.categoryId === id);
  let warningText = "You won't be able to revert this!";
  
  if (connectedItems.length > 0) {
    warningText = `Warning: There are ${connectedItems.length} items in this category. Deleting it will also delete those items!`;
  }

  const result = await Swal.fire({
    title: `Delete "${name}"?`,
    text: warningText,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: 'rgba(255,255,255,0.08)',
    background: '#0b1320',
    color: '#f1f5f9',
    confirmButtonText: 'Yes, delete it!'
  });

  if (result.isConfirmed) {
    try {
      // Batch deletion to include dependent items
      const batch = db.batch();
      
      // Delete Category document
      batch.delete(db.collection('categories').doc(id));
      
      // Delete all items under this category
      connectedItems.forEach(item => {
        batch.delete(db.collection('items').doc(item.id));
      });

      await batch.commit();
      showToast('success', 'Category and its collections deleted.');
    } catch (error) {
      console.error("Error deleting category & items:", error);
      showToast('error', 'Could not complete deletion.');
    }
  }
}

// 8. ITEM CRUD ACTIONS
function updateItemsUI() {
  filterItems(); // Will render items with current search/filter filters
}

function filterItems() {
  const container = document.getElementById('items-list');
  if (!container) return;

  const searchQuery = document.getElementById('search-box').value.toLowerCase().trim();
  const categoryFilter = document.getElementById('filter-category').value;
  const statusFilter = document.getElementById('filter-status').value;
  const sortBy = document.getElementById('sort-by').value;

  let filtered = [...itemsList];

  // 1. Search filter (name, brand, or notes)
  if (searchQuery) {
    filtered = filtered.filter(item => 
      (item.name && item.name.toLowerCase().includes(searchQuery)) ||
      (item.brand && item.brand.toLowerCase().includes(searchQuery)) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery))
    );
  }

  // 2. Category filter
  if (categoryFilter) {
    filtered = filtered.filter(item => item.categoryId === categoryFilter);
  }

  // 3. Status filter
  if (statusFilter) {
    filtered = filtered.filter(item => item.status === statusFilter);
  }

  // 4. Sorting
  const [field, direction] = sortBy.split('-');
  filtered.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    // Handle missing/null values for sorting
    if (field === 'price') {
      valA = valA || 0;
      valB = valB || 0;
    } else if (field === 'rating') {
      valA = valA || 0;
      valB = valB || 0;
    } else if (field === 'createdAt') {
      valA = valA ? valA.seconds || new Date(valA).getTime() : 0;
      valB = valB ? valB.seconds || new Date(valB).getTime() : 0;
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Render Grid
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-box-open"></i>
        <p>No matching collections found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const category = categoriesList.find(c => c.id === item.categoryId);
    const categoryName = category ? category.name : 'Uncategorized';
    const categoryIcon = category ? category.icon : '📦';
    
    const formattedPrice = formatCurrency(item.price);
    const ratingStars = renderStarsHTML(item.rating);
    const defaultImage = getFallbackImage(categoryName);
    const finalImage = item.imageUrl || defaultImage;

    return `
      <div class="item-card" onclick="viewItemDetail('${item.id}')">
        <div class="item-card-image">
          <img src="${finalImage}" alt="${escapeHTML(item.name)}" onerror="this.src='${defaultImage}'">
          <span class="status-badge status-${item.status.toLowerCase().replace(/ /g, '-')} item-badge-status">
            ${item.status}
          </span>
          <span class="item-badge-category">
            ${categoryIcon} ${escapeHTML(categoryName)}
          </span>
        </div>
        
        <div class="item-card-details">
          <div class="item-brand-label">${escapeHTML(item.brand || 'No Brand')}</div>
          <h4>${escapeHTML(item.name)}</h4>
          <div class="item-card-rating">
            ${ratingStars}
          </div>
          
          <div class="item-card-footer">
            <span class="item-price-display">${formattedPrice}</span>
            <div class="item-card-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" title="Edit" onclick="openEditItemModal('${item.id}')">
                <i class="fa-solid fa-pencil"></i>
              </button>
              <button class="btn-icon btn-delete" title="Delete" onclick="deleteItem('${item.id}', '${item.name}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddItemModal() {
  if (categoriesList.length === 0) {
    Swal.fire({
      icon: 'info',
      title: 'Create Category First',
      text: 'You need to create at least one category before registering collection items!',
      background: '#0b1320',
      color: '#f1f5f9',
      confirmButtonColor: '#00f2fe'
    });
    return;
  }
  
  document.getElementById('item-id').value = '';
  document.getElementById('item-form').reset();
  
  // Clear stars
  const checkedStar = document.querySelector('input[name="item-rating"]:checked');
  if (checkedStar) checkedStar.checked = false;

  document.getElementById('item-modal-title').textContent = 'Add Collection Item';
  openModal('item-modal');
}

function openEditItemModal(id) {
  const item = itemsList.find(i => i.id === id);
  if (!item) return;

  document.getElementById('item-id').value = item.id;
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-brand').value = item.brand || '';
  document.getElementById('item-category').value = item.categoryId;
  document.getElementById('item-status').value = item.status;
  document.getElementById('item-price').value = item.price || '';
  document.getElementById('item-purchase-date').value = item.purchaseDate || '';
  document.getElementById('item-image-url').value = item.imageUrl || '';
  document.getElementById('item-notes').value = item.notes || '';

  // Select rating radio
  if (item.rating) {
    const starRadio = document.getElementById(`star-${item.rating}`);
    if (starRadio) starRadio.checked = true;
  } else {
    const checkedStar = document.querySelector('input[name="item-rating"]:checked');
    if (checkedStar) checkedStar.checked = false;
  }

  document.getElementById('item-modal-title').textContent = 'Edit Collection Item';
  openModal('item-modal');
}

// Auto Preset Image Trigger
function generatePlaceholderImage() {
  const categorySelect = document.getElementById('item-category');
  const imageUrlInput = document.getElementById('item-image-url');

  if (!categorySelect.value) {
    showToast('error', 'Please select a Category first to generate placeholder.');
    return;
  }

  const selectedCategoryText = categorySelect.options[categorySelect.selectedIndex].text;
  imageUrlInput.value = getFallbackImage(selectedCategoryText);
  showToast('success', 'Preset placeholder image applied!');
}

// Item Form Submission (Save/Update)
document.getElementById('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const id = document.getElementById('item-id').value;
  const name = document.getElementById('item-name').value.trim();
  const brand = document.getElementById('item-brand').value.trim();
  const categoryId = document.getElementById('item-category').value;
  const status = document.getElementById('item-status').value;
  const price = parseFloat(document.getElementById('item-price').value) || 0;
  const purchaseDate = document.getElementById('item-purchase-date').value;
  const imageUrl = document.getElementById('item-image-url').value.trim();
  const notes = document.getElementById('item-notes').value.trim();

  // Get selected rating
  const ratingChecked = document.querySelector('input[name="item-rating"]:checked');
  const rating = ratingChecked ? parseInt(ratingChecked.value) : 0;

  const itemData = {
    name,
    brand,
    categoryId,
    status,
    price,
    purchaseDate,
    rating,
    imageUrl,
    notes,
    userId: currentUser.uid,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if (id) {
      await db.collection('items').doc(id).update(itemData);
      showToast('success', 'Item updated successfully!');
    } else {
      itemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('items').add(itemData);
      showToast('success', 'Item added to collection!');
    }
    closeModal('item-modal');
  } catch (error) {
    console.error("Error saving item:", error);
    showToast('error', 'Error saving item. Try again.');
  }
});

// Delete Item
async function deleteItem(id, name) {
  const result = await Swal.fire({
    title: `Delete "${name}"?`,
    text: "This collection item will be removed permanently.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: 'rgba(255,255,255,0.08)',
    background: '#0b1320',
    color: '#f1f5f9',
    confirmButtonText: 'Yes, delete item'
  });

  if (result.isConfirmed) {
    try {
      await db.collection('items').doc(id).delete();
      showToast('success', 'Item removed from collections.');
    } catch (error) {
      console.error("Error deleting item:", error);
      showToast('error', 'Failed to delete item.');
    }
  }
}

// View Item Details Modal
function viewItemDetail(id) {
  const item = itemsList.find(i => i.id === id);
  if (!item) return;

  const category = categoriesList.find(c => c.id === item.categoryId);
  const categoryName = category ? category.name : 'Uncategorized';
  const categoryIcon = category ? category.icon : '📦';
  
  const defaultImage = getFallbackImage(categoryName);
  const finalImage = item.imageUrl || defaultImage;
  const ratingStars = renderStarsHTML(item.rating);

  const detailBody = document.getElementById('detail-modal-body');
  detailBody.innerHTML = `
    <div class="detail-view-container">
      <div class="detail-image">
        <img src="${finalImage}" alt="${escapeHTML(item.name)}" onerror="this.src='${defaultImage}'">
      </div>
      
      <div class="detail-meta-header">
        <div class="detail-title-block">
          <span class="item-brand-label">${escapeHTML(item.brand || 'No Brand')}</span>
          <h2>${escapeHTML(item.name)}</h2>
          <div class="item-card-rating" style="margin-top: 8px; font-size: 1rem;">
            ${ratingStars}
          </div>
        </div>
        <span class="status-badge status-${item.status.toLowerCase().replace(/ /g, '-')}">
          ${item.status}
        </span>
      </div>

      <div class="detail-stats-grid">
        <div class="detail-stat-box">
          <span class="label">Category</span>
          <span class="val">${categoryIcon} ${escapeHTML(categoryName)}</span>
        </div>
        <div class="detail-stat-box">
          <span class="label">Purchase Value</span>
          <span class="val" style="color: var(--primary); font-weight: 700;">${formatCurrency(item.price)}</span>
        </div>
        <div class="detail-stat-box">
          <span class="label">Acquired Date</span>
          <span class="val">${item.purchaseDate ? formatDate(item.purchaseDate) : '-'}</span>
        </div>
      </div>

      ${item.notes ? `
        <div class="detail-notes-box">
          <h4>Notes & Specifications</h4>
          <p>${escapeHTML(item.notes)}</p>
        </div>
      ` : ''}

      <div class="detail-modal-actions">
        <button class="btn btn-secondary btn-sm" onclick="closeModal('detail-modal'); openEditItemModal('${item.id}')">
          <i class="fa-solid fa-pencil"></i> Edit Item
        </button>
        <button class="btn btn-link btn-sm" style="color: #ef4444;" onclick="closeModal('detail-modal'); deleteItem('${item.id}', '${item.name}')">
          <i class="fa-solid fa-trash-can"></i> Delete
        </button>
      </div>
    </div>
  `;

  openModal('detail-modal');
}

// 9. DASHBOARD METRICS AND VISUALIZATION
function updateDashboardStats() {
  const totalCategories = categoriesList.length;
  const totalItems = itemsList.length;
  
  // Calculate valuation (only include items that aren't wishlist, or include everything? Typically count displays/use)
  const totalValuation = itemsList
    .filter(item => item.status !== 'Wishlist')
    .reduce((sum, item) => sum + (item.price || 0), 0);
    
  const wishlistCount = itemsList.filter(item => item.status === 'Wishlist').length;

  document.getElementById('stat-total-categories').textContent = totalCategories;
  document.getElementById('stat-total-items').textContent = totalItems;
  document.getElementById('stat-total-value').textContent = formatCurrency(totalValuation);
  document.getElementById('stat-wishlist-count').textContent = wishlistCount;
}

function updateRecentItemsTable() {
  const tbody = document.getElementById('recent-items-tbody');
  if (!tbody) return;

  if (itemsList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">No items in database. Add some!</td>
      </tr>
    `;
    return;
  }

  // Sort items by createdAt desc
  const sorted = [...itemsList].sort((a, b) => {
    const timeA = a.createdAt ? a.createdAt.seconds || new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? b.createdAt.seconds || new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  }).slice(0, 5); // Take top 5

  tbody.innerHTML = sorted.map(item => {
    const category = categoriesList.find(c => c.id === item.categoryId);
    const categoryName = category ? category.name : 'Uncategorized';
    const categoryIcon = category ? category.icon : '📦';
    
    return `
      <tr style="cursor: pointer;" onclick="viewItemDetail('${item.id}')">
        <td style="font-weight: 600;">
          <div style="display:flex; align-items:center; gap:8px;">
            <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; color:var(--primary);"></i>
            <span>${escapeHTML(item.name)}</span>
          </div>
        </td>
        <td>${categoryIcon} ${escapeHTML(categoryName)}</td>
        <td>
          <span class="status-badge status-${item.status.toLowerCase().replace(/ /g, '-')}">
            ${item.status}
          </span>
        </td>
        <td style="font-weight: 700; color: var(--primary);">${formatCurrency(item.price)}</td>
      </tr>
    `;
  }).join('');
}

function updateDashboardChart() {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  // Aggregate items count per category
  const categoryCounts = {};
  categoriesList.forEach(c => {
    categoryCounts[c.name] = 0;
  });

  itemsList.forEach(item => {
    const category = categoriesList.find(c => c.id === item.categoryId);
    if (category) {
      categoryCounts[category.name] = (categoryCounts[category.name] || 0) + 1;
    }
  });

  const labels = Object.keys(categoryCounts);
  const data = Object.values(categoryCounts);

  // If no categories or no items, display default empty state
  if (labels.length === 0 || itemsList.length === 0) {
    if (categoryChartInstance) {
      categoryChartInstance.destroy();
      categoryChartInstance = null;
    }
    return;
  }

  // Pre-defined color palette
  const backgroundColors = [
    '#00f2fe', // Primary cyan
    '#a855f7', // Secondary purple
    '#10b981', // green
    '#f59e0b', // orange
    '#3b82f6', // blue
    '#ec4899', // pink
    '#14b8a6', // teal
    '#e2e8f0', // slate light
    '#f43f5e', // rose
    '#84cc16'  // lime
  ];

  if (categoryChartInstance) {
    categoryChartInstance.data.labels = labels;
    categoryChartInstance.data.datasets[0].data = data;
    categoryChartInstance.data.datasets[0].backgroundColor = backgroundColors.slice(0, labels.length);
    categoryChartInstance.update();
  } else {
    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderWidth: 1,
          borderColor: '#0b1320'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#f1f5f9',
              font: {
                family: 'Outfit',
                size: 11
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: '#0b1320',
            titleColor: '#00f2fe',
            bodyColor: '#f1f5f9',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1
          }
        },
        cutout: '70%'
      }
    });
  }
}

// 10. MODAL DISPLAY TOGGLES
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close modal when clicking outside the modal-card
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// 11. GENERAL UTILITY HELPERS
function showToast(icon, message) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    icon: icon,
    title: message,
    background: '#0b1320',
    color: '#f1f5f9',
    customClass: {
      popup: 'swal-neon-toast'
    }
  });
}

function showLoadingBtn(formId, isLoading) {
  const btn = document.querySelector(`#${formId} button[type="submit"]`);
  if (!btn) return;

  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

function formatCurrency(amount) {
  const val = parseFloat(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function renderStarsHTML(rating) {
  const count = parseInt(rating) || 0;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= count) {
      html += '<i class="fa-solid fa-star"></i>';
    } else {
      html += '<i class="fa-regular fa-star" style="color:var(--text-muted);"></i>';
    }
  }
  return html;
}

function escapeHTML(str) {
  if (!str) return '';
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

function translateFirebaseError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email address is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account matches this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email address is already registered.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled in your Firebase Console.';
    case 'auth/weak-password':
      return 'The password is too weak. Must be at least 6 characters.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// Unsplash Preset Placeholders based on keywords in category names
function getFallbackImage(categoryName) {
  const cat = (categoryName || '').toLowerCase();
  
  if (cat.includes('figure') || cat.includes('toy') || cat.includes('mainan') || cat.includes('gundam') || cat.includes('hotwheel')) {
    return 'https://images.unsplash.com/photo-1608889175123-8ec330b86f84?w=600&auto=format&fit=crop&q=80'; // Action figure/toy
  }
  if (cat.includes('game') || cat.includes('gaming') || cat.includes('console') || cat.includes('ps5') || cat.includes('xbox') || cat.includes('switch')) {
    return 'https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?w=600&auto=format&fit=crop&q=80'; // Gaming console
  }
  if (cat.includes('pc') || cat.includes('computer') || cat.includes('komputer') || cat.includes('setup') || cat.includes('hardware')) {
    return 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format&fit=crop&q=80'; // PC Setup
  }
  if (cat.includes('gadget') || cat.includes('hp') || cat.includes('phone') || cat.includes('watch') || cat.includes('audio') || cat.includes('headphone')) {
    return 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80'; // Smartwatch / Gadget
  }
  if (cat.includes('book') || cat.includes('komik') || cat.includes('manga') || cat.includes('novel')) {
    return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80'; // Bookshelf
  }
  if (cat.includes('diecast') || cat.includes('mobil') || cat.includes('lego') || cat.includes('car')) {
    return 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&auto=format&fit=crop&q=80'; // LEGO model car
  }
  
  // Default general neon showcase image
  return 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80';
}
