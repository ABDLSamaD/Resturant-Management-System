# Restaurant Management System

A professional, full-stack restaurant administration and Point of Sale (POS) suite designed for single restaurant owners. The system provides tools to manage menu listings, track expenditures, handle employee payroll, and compile daily operational reports.

---

## 🚀 Core Features

### 📋 Menu & Product Catalog
- **Active Menu Listings**: Organize dishes by custom categories (e.g., Starters, Main Course, Desserts, Beverages).
- **Search & Filters**: Instantly find dishes by name or description, and filter by active/inactive menu listings.
- **AI Dish Graphic Generator**: Integrate with Gemini to render high-contrast culinary designs and dish preview imagery.

### 💼 Staff & Payroll Management
- **Role Registration**: Set up structural restaurant roles (e.g., Master Chef, Line Cook, Server, Cashier).
- **Employee Profiles**: Onboard and manage staff records, active statuses, and phone numbers.
- **Wages & Salary Contracts**: Support for both Monthly Contracts and Daily Wage rates.
- **Payroll execution**: Calculate monthly pay processing with auto-deduction of dynamic salary advances, disburse advances, and record base salary increments with a full wage revision history.

### 📊 Direct Expenditures & Cash Flow
- **Ledger Invoices**: Track all direct raw material purchases, grocery bills, and utility contracts.
- **Receipt OCR Decrypter**: Upload receipts and bills for instant scanning and data extraction.
- **Cumulative Totals**: Review breakdown stats and percentage distribution of expenses dynamically per category.

### ⚙️ General Configuration & Prints
- **Visual Setup**: Configure your restaurant's name, logo initials, contact lines, address, and personalized receipt footers.
- **Daily Performance Exports**: Export structured PDF reports for any selected date in one click.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend Server**: Node.js, Express, TypeScript (transpiling through `esbuild` for optimal performance)
- **Database/Storage**: Durable key-value ledger store
- **AI Integrations**: Gemini API (Image synthesis & Document OCR decryption)

---

## ⚙️ Setup & Operational Manual

### 1. Prerequisites
Ensure you have the following installed on your developer machine:
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Environment Configurations
Create a `.env` file at the root of the project with your API keys (refer to `.env.example`):
```env
# Server secret keys (Never commit actual keys to version control!)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Running the Development Server
Install dependencies and run the server in development mode:
```bash
# Install packages
npm install

# Boot development server
npm run dev
```
The dev server will spin up on **port 3000**. Open your browser and navigate to `http://localhost:3000`.

### 4. Compiling the Production Build
To package and bundle the application for production deployment:
```bash
# Run build command
npm run build
```
This compiles the static React files to the `dist/` directory and bundles the server-side TypeScript files cleanly.

---

## 📸 Usage & Workflows

1. **Dashboard Menu Selection**: Navigate through different sections using the primary administrative interface.
2. **Assigning Payroll**: Go to the **Salaries & Payroll Center** to pay your staff at the end of their cycles. Net payable wages are calculated dynamically taking active advances into account.
3. **Receipt Processing**: Scan raw paper receipts by uploading them directly into the expenditure space to speed up logging flows.
