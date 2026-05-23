# Theatre Management System - Frontend UI Technical Documentation

## Overview
This document provides a comprehensive technical specification for improving the frontend UI of the Theatre Management System, including all buttons, sections, and their corresponding API integrations.

## System Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Authentication**: JWT Bearer Token
- **Base URL**: `http://localhost:8000`

---

## 1. Admin Dashboard (`/home`)

### Main Sections
#### 1.1 Header Section
- **Title**: "Admin Dashboard"
- **Subtitle**: "Manage canteen operations"
- **Buttons**:
  - **Canteen Operations** (onClick: `navigate('/canteen-ops')`)
  - **Logout** (onClick: `localStorage.removeItem('token'); navigate('/login')`)

#### 1.2 Canteen Management Cards
- **Card 1**: Prathap Deluxe (onClick: `navigate('/canteen-ops')`)
- **Card 2**: Prathap Non-Delux (onClick: `navigate('/canteen-ops')`)
- **Card 3**: Mini Prathap (onClick: `navigate('/canteen-ops')`)

#### 1.3 Business Analytics Cards
- **Sales Card** (onClick: `navigate('/sales')`)
  - API: `GET /api/sales/daily-sales?canteen_id={id}&sale_date={today}`
- **Stock Card** (onClick: `navigate('/stock')`)
  - API: `GET /api/stock?canteen_id={id}`
- **Daily Business Card** (onClick: `navigate('/daily-business')`)
- **Analytics Card** (onClick: `navigate('/analytics')`)
  - API: `GET /api/analytics?canteen_id={id}&days={range}`

#### 1.4 Online Orders Section
- **Refresh Button** (onClick: `fetchOrders()`)
  - API: `GET /canteen-ops/orders`
- **Order Actions**:
  - **Checkout** (onClick: `handleAdminCheckout(order)`)
    - API: `POST /canteen-ops/orders/{order_id}/checkout`
  - **Cancel** (onClick: `handleAdminCancel(order_id)`)
    - API: `POST /canteen-ops/orders/{order_id}/cancel`
  - **Manage** (onClick: `navigate(\`/canteen-ops?order=${order_id}\`)`)

---

## 2. Sales Management (`/sales`)

### Main Sections
#### 2.1 Header Section
- **Title**: "Sales Management"
- **Subtitle**: "Track sales performance and manage transactions"
- **Canteen Selector**: Dropdown to select canteen
- **Back to Admin Button** (onClick: `navigate('/home')`)

#### 2.2 Statistics Cards
- **Today's Revenue Card**
  - API: `GET /api/sales/daily-sales?canteen_id={id}&sale_date={today}`
- **Items Sold Card**
  - API: Same as above
- **Total Orders Card**
  - API: Same as above

#### 2.3 Tab Navigation
- **Add Sales Tab** (onClick: `setActiveTab('add-sales')`)
- **Daily Report Tab** (onClick: `setActiveTab('daily-report')`)

#### 2.4 Add Sales Section
- **SalesForm Component**:
  - **Show Type Selector**: Morning, Matinee, First Show, Second Show, Special Show
  - **Item Selector**: Populated from stock API
  - **Quantity Input**: Number input
  - **Add Sale Button** (onClick: `handleSubmit(saleData)`)
    - API: `POST /api/sales`

#### 2.5 Daily Report Section
- **DailySalesTable Component**
  - API: `GET /api/sales/daily-sales?canteen_id={id}&sale_date={today}`

---

## 3. Stock Management (`/stock`)

### Main Sections
#### 3.1 Header Section
- **Title**: "Stock Management"
- **Subtitle**: "Manage inventory and stock levels"
- **Canteen Selector**: Dropdown to select canteen
- **Back to Admin Button** (onClick: `navigate('/home')`)
- **Logout Button** (onClick: `localStorage.removeItem('token'); navigate('/login')`)

#### 3.2 Stock Actions
- **Add New Item Button** (onClick: `setShowAddForm(!showAddForm)`)

#### 3.3 Add Item Form
- **Item Name Input**: Text input
- **Price Input**: Number input (decimal)
- **Quantity Input**: Number input
- **Add Item Button** (onClick: `handleAddItem(e)`)
  - API: `POST /api/stock`

#### 3.4 Stock Table
- **StockTable Component**:
  - **Edit Button**: Inline editing for price and quantity
    - API: `PUT /api/stock/{item_id}`
  - **Delete Button**: Remove stock item
    - API: `DELETE /api/stock/{item_id}`

#### 3.5 Stock Summary Cards
- **Total Items Card**: Shows total number of items
- **In Stock Card**: Shows items with quantity > 0
- **Out of Stock Card**: Shows items with quantity = 0

---

## 4. Analytics Dashboard (`/analytics`)

### Main Sections
#### 4.1 Header Section
- **Title**: "Analytics Dashboard"
- **Canteen Selector**: Dropdown to select canteen
- **Time Range Selector**: 7 days, 30 days, 90 days

#### 4.2 Tab Navigation
- **Overview Tab** (onClick: `setActiveTab('overview')`)
- **Sales Trends Tab** (onClick: `setActiveTab('sales-trends')`)
- **Item Performance Tab** (onClick: `setActiveTab('item-performance')`)
- **Customer Insights Tab** (onClick: `setActiveTab('customer-insights')`)

#### 4.3 Analytics Sections
- **Revenue Chart**: Line chart showing revenue over time
- **Sales Volume Chart**: Bar chart showing items sold
- **Top Items**: List of best-selling items
- **Peak Hours**: Heat map of busy periods

---

## 5. Canteen Operations (`/canteen-ops`)

### Main Sections
#### 5.1 Header Section
- **Title**: "Canteen Operations"
- **Canteen Selector**: Tabs for different canteens
- **Real-time Updates**: Auto-refresh every 30 seconds

#### 5.2 Tab Navigation
- **Dashboard Tab** (onClick: `setSelectedTab('dashboard')`)
- **Orders Tab** (onClick: `setSelectedTab('orders')`)
- **Stock Tab** (onClick: `setSelectedTab('stock')`)

#### 5.3 Dashboard Section
- **Today's Stats**: Revenue, Orders, Items sold
- **Recent Orders**: List of latest orders
- **Quick Actions**: Common operations

#### 5.4 Orders Section
- **Order List**: All orders with status
- **Order Actions**:
  - **Accept Order** (onClick: `updateOrderStatus(orderId, 'confirmed')`)
    - API: `PUT /canteen-ops/orders/{order_id}/status`
  - **Start Preparation** (onClick: `updateOrderStatus(orderId, 'preparing')`)
    - API: Same as above
  - **Mark Ready** (onClick: `updateOrderStatus(orderId, 'ready')`)
    - API: Same as above
  - **Complete Order** (onClick: `updateOrderStatus(orderId, 'completed')`)
    - API: Same as above

---

## 6. Role-Based Access Control

### 6.1 User Roles & Permissions

#### 6.1.1 Customer Role
**Allowed Routes:**
- `/users` - User dashboard and menu browsing
- `/users/orders` - View own orders and order history

**Restricted Access:**
- All admin routes (`/home`, `/sales`, `/stock`, `/analytics`, `/canteen-ops`)
- Navigation to admin sections redirects to `/users`
- Admin buttons and menus are hidden

#### 6.1.2 Admin Role
**Allowed Routes:**
- `/home` - Main admin dashboard
- `/sales` - Sales management and reporting
- `/stock` - Inventory and stock management
- `/analytics` - Business analytics and insights
- `/canteen-ops` - Real-time canteen operations
- `/users` - Can access user management (if needed)
- `/users/orders` - Can view all user orders (for support)

**Full Access:**
- All sections of the application
- Administrative functions and controls
- Cross-canteen data access
- System configuration options

### 6.2 Access Control Implementation

#### 6.2.1 Route Guards
```javascript
// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = getUserFromToken();
  
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'customer' ? '/users' : '/home'} />;
  }
  
  return children;
};
```

#### 6.2.2 Navigation Components
```javascript
// Customer Navigation (Limited)
const CustomerNav = () => (
  <nav>
    <Link to="/users">Menu</Link>
    <Link to="/users/orders">My Orders</Link>
    <LogoutButton />
  </nav>
);

// Admin Navigation (Full Access)
const AdminNav = () => (
  <nav>
    <Link to="/home">Dashboard</Link>
    <Link to="/sales">Sales</Link>
    <Link to="/stock">Stock</Link>
    <Link to="/analytics">Analytics</Link>
    <Link to="/canteen-ops">Operations</Link>
    <LogoutButton />
  </nav>
);
```

#### 6.2.3 API Access Control
```javascript
// Customer API Access - Limited to own data
const customerAPI = {
  getMenu: (canteenId) => GET(`/user/menu?canteen_id=${canteenId}`),
  getOwnOrders: () => GET(`/user/orders`),
  createOrder: (orderData) => POST(`/user/orders`),
  updateProfile: (profileData) => PUT(`/user/profile`)
};

// Admin API Access - Full system access
const adminAPI = {
  getAllOrders: () => GET(`/canteen-ops/orders`),
  getSalesData: (params) => GET(`/api/sales`, params),
  getStockData: (params) => GET(`/api/stock`, params),
  getAnalytics: (params) => GET(`/api/analytics`, params),
  manageUsers: () => GET(`/api/users`),
  updateOrderStatus: (orderId, status) => PUT(`/canteen-ops/orders/${orderId}/status`)
};
```

### 6.3 UI Adaptation Based on Role

#### 6.3.1 Dashboard Differences
**Customer Dashboard (`/users`):**
- Personal order history
- Available menu items
- Profile management
- Order tracking

**Admin Dashboard (`/home`):**
- System-wide statistics
- All canteen operations
- Business analytics
- Order management across all users

#### 6.3.2 Order Management Differences
**Customer View (`/users/orders`):**
- Only own orders visible
- Limited order actions (view, cancel if pending)
- Basic order information

**Admin View (`/canteen-ops`):**
- All orders from all users
- Full order management (accept, prepare, complete)
- Detailed order analytics
- Bulk operations

---

## 7. User-Facing Pages

### 6.1 User Login (`/user-login`)
- **Username Input**: Text input
- **Password Input**: Password input
- **Login Button** (onClick: `handleLogin()`)
  - API: `POST /user/token`

### 6.2 User Menu (`/user-menu`)
- **Canteen Selector**: Choose canteen
- **Menu Items**: Display available items
  - API: `GET /user/menu?canteen_id={id}`
- **Add to Cart Button** (onClick: `addToCart(item)`)
- **View Cart Button** (onClick: `navigate('/user-orders')`)

### 6.3 User Orders (`/user-orders`)
- **Order History**: List of user's orders
  - API: `GET /user/orders`
- **Order Details**: View individual order details
- **Place Order Button** (onClick: `createOrder(orderData)`)
  - API: `POST /user/orders`

---

## 7. Common UI Components

### 7.1 Navigation Bar
- **Logo**: Theatre Management System
- **Navigation Links**: Home, Sales, Stock, Analytics, Operations
- **User Menu**: Profile, Logout

### 7.2 Status Indicators
- **Success**: Green color with checkmark icon
- **Warning**: Yellow color with exclamation icon
- **Error**: Red color with X icon
- **Info**: Blue color with info icon

### 7.3 Loading States
- **Spinner**: Rotating circle animation
- **Skeleton**: Gray placeholder boxes
- **Progress Bar**: Horizontal progress indicator

---

## 8. API Integration Patterns

### 8.1 Authentication
All API calls require:
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
}
```

### 8.2 Error Handling
- **Network Errors**: Show "Network error" message
- **401 Unauthorized**: Redirect to login
- **404 Not Found**: Show "Not found" message
- **500 Server Error**: Show "Server error" message

### 8.3 Success Handling
- **Show Success Message**: Green notification
- **Refresh Data**: Update relevant components
- **Clear Forms**: Reset input fields

---

## 9. Responsive Design Requirements

### 9.1 Mobile (320px - 768px)
- **Single Column Layout**: Stack all sections vertically
- **Hamburger Menu**: Collapsible navigation
- **Touch-Friendly Buttons**: Minimum 44px touch target
- **Swipe Gestures**: For carousel and table navigation

### 9.2 Tablet (768px - 1024px)
- **Two Column Layout**: Side-by-side sections
- **Tab Navigation**: Horizontal tab bars
- **Card Grid**: 2x2 grid for statistics cards
- **Optimized Tables**: Horizontal scrolling for wide tables

### 9.3 Desktop (1024px+)
- **Multi Column Layout**: Full width utilization
- **Hover States**: Interactive elements
- **Keyboard Navigation**: Tab and arrow key support
- **Large Tables**: Full data display without scrolling

---

## 10. Accessibility Requirements

### 10.1 Keyboard Navigation
- **Tab Order**: Logical navigation sequence
- **Focus Indicators**: Visible focus states
- **Shortcuts**: Common action shortcuts
- **Skip Links**: Jump to main content

### 10.2 Screen Reader Support
- **ARIA Labels**: Descriptive labels for elements
- **Semantic HTML**: Proper heading hierarchy
- **Alt Text**: Descriptive image alternatives
- **Live Regions**: Dynamic content announcements

### 10.3 Visual Accessibility
- **High Contrast**: Minimum 4.5:1 ratio
- **Text Size**: Scalable up to 200%
- **Color Independence**: Not color-reliant
- **Motion Control**: Respect prefers-reduced-motion

---

## 11. Performance Optimization

### 11.1 Code Splitting
- **Route-based**: Lazy load page components
- **Component-based**: Split large components
- **Vendor Separation**: Separate third-party libraries

### 11.2 Caching Strategy
- **API Caching**: Cache GET requests
- **Static Assets**: Cache images and styles
- **Service Worker**: Offline functionality

### 11.3 Bundle Optimization
- **Tree Shaking**: Remove unused code
- **Minification**: Compress JavaScript and CSS
- **Image Optimization**: WebP format, lazy loading

---

## 12. Security Considerations

### 12.1 Input Validation
- **Client-side Validation**: Form validation
- **Server-side Validation**: API validation
- **XSS Prevention**: Sanitize user input
- **CSRF Protection**: Token-based protection

### 12.2 Data Protection
- **Sensitive Data**: No sensitive data in localStorage
- **HTTPS Required**: Secure communication
- **Token Expiry**: Automatic token refresh
- **Session Management**: Proper logout handling

---

## 13. Testing Requirements

### 13.1 Unit Testing
- **Component Testing**: Individual component tests
- **Function Testing**: Pure function tests
- **Hook Testing**: Custom hook tests
- **Utility Testing**: Helper function tests

### 13.2 Integration Testing
- **API Integration**: Mock API responses
- **User Flow**: End-to-end user journeys
- **Form Submission**: Complete form workflows
- **Navigation**: Route navigation tests

### 13.3 Visual Testing
- **Screenshot Testing**: Visual regression tests
- **Responsive Testing**: Multiple viewport tests
- **Cross-browser**: Browser compatibility tests
- **Accessibility**: Accessibility compliance tests

---

## 14. Deployment Requirements

### 14.1 Build Process
- **Production Build**: Optimized bundle
- **Environment Variables**: Configuration management
- **Asset Optimization**: Image and font optimization
- **Bundle Analysis**: Bundle size monitoring

### 14.2 Hosting Configuration
- **Static Hosting**: Serve static files
- **CDN Integration**: Global content delivery
- **SSL Certificate**: HTTPS enforcement
- **Domain Configuration**: Custom domain setup

---

This documentation provides a complete technical specification for implementing a modern, responsive, and user-friendly frontend for the Theatre Management System. All buttons, sections, and their corresponding API integrations are clearly defined for development reference.
